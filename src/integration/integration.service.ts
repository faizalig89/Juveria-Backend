import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  createHash,
} from 'node:crypto';
import type {
  Prisma,
} from '@prisma/client';
import {
  PrismaService,
} from '../prisma/prisma.service.js';
import {
  JsonInvoiceMapperService,
} from '../invoice-ingestion/json-invoice-mapper.service.js';
import type {
  IngestedInvoice,
} from '../invoice-ingestion/invoice-ingestion.types.js';
import {
  IntegrationCryptoService,
} from './integration.crypto.service.js';
import {
  IntegrationProviderService,
} from './integration.provider.service.js';
import {
  IntegrationCompliancePipelineService,
} from './integration.compliance-pipeline.service.js';
import type {
  ConnectionContext,
  ExternalInvoiceRecord,
  IntegrationAuthType,
  IntegrationObject,
  IntegrationProvider,
  SubmissionStatusWriteback,
  SubmissionWritebackStatus,
} from './integration.types.js';
import type {
  CreateIntegrationConnectionDto,
  SyncIntegrationInvoicesDto,
  SyncSubmissionStatusesDto,
  UpdateIntegrationConnectionDto,
} from './integration.dto.js';

type Actor = {
  userId: string;
  email: string;
  role: string;
};

type ImportRecordResult =
  | {
      status: 'IMPORTED';
      invoiceId: string;
      invoiceNumber: string;
    }
  | {
      status: 'SKIPPED';
    };

const WRITEBACK_STATUSES =
  new Set<string>([
    'ACCEPTED',
    'REJECTED',
    'PENDING',
    'ERROR',
    'UNKNOWN',
  ]);

@Injectable()
export class IntegrationService {
  private readonly canonicalMapper =
    new JsonInvoiceMapperService();

  constructor(
    private readonly prisma:
      PrismaService,
    private readonly crypto:
      IntegrationCryptoService,
    private readonly provider:
      IntegrationProviderService,
    private readonly compliancePipeline:
      IntegrationCompliancePipelineService,
  ) {}

  providers() {
    return this.provider
      .providers();
  }

  async list(
    tenantId: string,
  ) {
    const rows =
      await this.prisma
        .integrationConnection
        .findMany({
          where: {
            tenantId,
          },
          orderBy: {
            createdAt:
              'desc',
          },
        });

    return rows.map(
      row =>
        this.safe(row),
    );
  }

  async create(
    actor: Actor,
    tenantId: string,
    dto:
      CreateIntegrationConnectionDto,
  ) {
    const baseUrl =
      this.normalizeBaseUrl(
        dto.baseUrl,
      );

    const encrypted =
      this.crypto.encrypt(
        dto.credentials,
      );

    try {
      const created =
        await this.prisma
          .$transaction(
            async tx => {
              const connection =
                await tx
                  .integrationConnection
                  .create({
                    data: {
                      tenantId,
                      provider:
                        dto.provider,
                      name:
                        dto.name.trim(),
                      baseUrl,
                      authType:
                        dto.authType,
                      config:
                        dto.config as
                          Prisma.InputJsonValue,
                      credentialsEncrypted:
                        encrypted,
                      createdById:
                        actor.userId,
                    },
                  });

              await tx.auditEvent
                .create({
                  data: {
                    tenantId,
                    actorUserId:
                      actor.userId,
                    actorEmail:
                      actor.email,
                    actorRole:
                      actor.role,
                    category:
                      'INTEGRATION',
                    action:
                      'INTEGRATION_CONNECTION_CREATED',
                    entityType:
                      'INTEGRATION_CONNECTION',
                    entityId:
                      connection.id,
                    entityLabel:
                      connection.name,
                    outcome:
                      'SUCCESS',
                    after: {
                      provider:
                        connection.provider,
                      baseUrl:
                        connection.baseUrl,
                      authType:
                        connection.authType,
                      isActive:
                        connection.isActive,
                    },
                  },
                });

              return connection;
            },
          );

      return this.safe(
        created,
      );
    } catch (cause: unknown) {
      if (
        this.isP2002(
          cause,
        )
      ) {
        throw new ConflictException(
          'A connection with this provider and name already exists',
        );
      }

      throw cause;
    }
  }

  async update(
    actor: Actor,
    tenantId: string,
    id: string,
    dto:
      UpdateIntegrationConnectionDto,
  ) {
    const existing =
      await this.requireConnection(
        tenantId,
        id,
      );

    const updated =
      await this.prisma
        .$transaction(
          async tx => {
            const row =
              await tx
                .integrationConnection
                .update({
                  where: {
                    id:
                      existing.id,
                  },
                  data: {
                    ...(dto.name !==
                    undefined
                      ? {
                          name:
                            dto.name.trim(),
                        }
                      : {}),
                    ...(dto.baseUrl !==
                    undefined
                      ? {
                          baseUrl:
                            this.normalizeBaseUrl(
                              dto.baseUrl,
                            ),
                        }
                      : {}),
                    ...(dto.authType !==
                    undefined
                      ? {
                          authType:
                            dto.authType,
                        }
                      : {}),
                    ...(dto.config !==
                    undefined
                      ? {
                          config:
                            dto.config as
                              Prisma.InputJsonValue,
                        }
                      : {}),
                    ...(dto.credentials !==
                    undefined
                      ? {
                          credentialsEncrypted:
                            this.crypto.encrypt(
                              dto.credentials,
                            ),
                        }
                      : {}),
                    ...(dto.isActive !==
                    undefined
                      ? {
                          isActive:
                            dto.isActive,
                        }
                      : {}),
                  },
                });

            await tx.auditEvent
              .create({
                data: {
                  tenantId,
                  actorUserId:
                    actor.userId,
                  actorEmail:
                    actor.email,
                  actorRole:
                    actor.role,
                  category:
                    'INTEGRATION',
                  action:
                    'INTEGRATION_CONNECTION_UPDATED',
                  entityType:
                    'INTEGRATION_CONNECTION',
                  entityId:
                    row.id,
                  entityLabel:
                    row.name,
                  outcome:
                    'SUCCESS',
                  before: {
                    name:
                      existing.name,
                    baseUrl:
                      existing.baseUrl,
                    authType:
                      existing.authType,
                    isActive:
                      existing.isActive,
                  },
                  after: {
                    name:
                      row.name,
                    baseUrl:
                      row.baseUrl,
                    authType:
                      row.authType,
                    isActive:
                      row.isActive,
                  },
                  metadata: {
                    credentialsRotated:
                      dto.credentials !==
                      undefined,
                  },
                },
              });

            return row;
          },
        );

    return this.safe(
      updated,
    );
  }

  async deactivate(
    actor: Actor,
    tenantId: string,
    id: string,
  ) {
    return this.update(
      actor,
      tenantId,
      id,
      {
        isActive:
          false,
      },
    );
  }

  async test(
    actor: Actor,
    tenantId: string,
    id: string,
  ) {
    const connection =
      await this.requireConnection(
        tenantId,
        id,
      );

    if (
      !connection.isActive
    ) {
      throw new ConflictException(
        'Integration connection is disabled',
      );
    }

    const context =
      this.context(
        connection,
      );

    try {
      const result =
        await this.provider
          .test(
            context,
          );

      await this.prisma
        .$transaction(
          async tx => {
            await tx
              .integrationConnection
              .update({
                where: {
                  id:
                    connection.id,
                },
                data: {
                  lastTestedAt:
                    new Date(),
                  lastTestSucceeded:
                    true,
                  lastError:
                    null,
                },
              });

            await tx.auditEvent
              .create({
                data: {
                  tenantId,
                  actorUserId:
                    actor.userId,
                  actorEmail:
                    actor.email,
                  actorRole:
                    actor.role,
                  category:
                    'INTEGRATION',
                  action:
                    'INTEGRATION_CONNECTION_TESTED',
                  entityType:
                    'INTEGRATION_CONNECTION',
                  entityId:
                    connection.id,
                  entityLabel:
                    connection.name,
                  outcome:
                    'SUCCESS',
                  metadata: {
                    provider:
                      connection.provider,
                  },
                },
              });
          },
        );

      return {
        connectionId:
          connection.id,
        ...result,
      };
    } catch (cause: unknown) {
      const message =
        this.safeError(
          cause,
        );

      await this.prisma
        .$transaction(
          async tx => {
            await tx
              .integrationConnection
              .update({
                where: {
                  id:
                    connection.id,
                },
                data: {
                  lastTestedAt:
                    new Date(),
                  lastTestSucceeded:
                    false,
                  lastError:
                    message,
                },
              });

            await tx.auditEvent
              .create({
                data: {
                  tenantId,
                  actorUserId:
                    actor.userId,
                  actorEmail:
                    actor.email,
                  actorRole:
                    actor.role,
                  category:
                    'INTEGRATION',
                  action:
                    'INTEGRATION_CONNECTION_TESTED',
                  entityType:
                    'INTEGRATION_CONNECTION',
                  entityId:
                    connection.id,
                  entityLabel:
                    connection.name,
                  outcome:
                    'FAILED',
                  metadata: {
                    provider:
                      connection.provider,
                    error:
                      message,
                  },
                },
              });
          },
        );

      throw new BadRequestException(
        `Integration connection test failed: ${message}`,
      );
    }
  }

  async syncInvoices(
    actor: Actor,
    tenantId: string,
    id: string,
    dto:
      SyncIntegrationInvoicesDto,
  ) {
    const connection =
      await this.requireConnection(
        tenantId,
        id,
      );

    if (
      !connection.isActive
    ) {
      throw new ConflictException(
        'Integration connection is disabled',
      );
    }

    const run =
      await this.prisma
        .integrationSyncRun
        .create({
          data: {
            tenantId,
            connectionId:
              connection.id,
            direction:
              'PULL',
            operation:
              'INVOICE_IMPORT',
            status:
              'RUNNING',
            requestedById:
              actor.userId,
          },
        });

    let importedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    let readyCount = 0;
    let notReadyCount = 0;
    let autoSubmittedCount = 0;
    let complianceProcessingFailedCount = 0;

    try {
      const records =
        await this.provider
          .pullInvoices(
            this.context(
              connection,
            ),
            dto.limit ?? 10,
          );

      for (
        const record
        of records
      ) {
        try {
          const result =
            await this.importRecord(
              actor,
              tenantId,
              connection.id,
              connection.provider,
              record,
            );

          if (
            result.status ===
            'IMPORTED'
          ) {
            importedCount += 1;

            try {
              const processing =
                await this.processImportedInvoice(
                  actor,
                  tenantId,
                  connection,
                  result.invoiceId,
                  result.invoiceNumber,
                );

              if (
                processing.readinessStatus ===
                'READY'
              ) {
                readyCount += 1;
              } else {
                notReadyCount += 1;
              }

              if (
                processing.aspSubmitted
              ) {
                autoSubmittedCount += 1;
              }
            } catch (
              cause: unknown
            ) {
              failedCount += 1;
              complianceProcessingFailedCount += 1;

              await this.prisma
                .auditEvent
                .create({
                  data: {
                    tenantId,
                    actorUserId:
                      actor.userId,
                    actorEmail:
                      actor.email,
                    actorRole:
                      actor.role,
                    category:
                      'INTEGRATION',
                    action:
                      'ERP_COMPLIANCE_PIPELINE_FAILED',
                    entityType:
                      'INVOICE',
                    entityId:
                      result.invoiceId,
                    entityLabel:
                      result.invoiceNumber,
                    outcome:
                      'FAILED',
                    metadata: {
                      provider:
                        connection.provider,
                      connectionId:
                        connection.id,
                      error:
                        this.safeError(
                          cause,
                        ),
                    },
                  },
                });
            }
          } else {
            skippedCount += 1;
          }
        } catch (cause: unknown) {
          failedCount += 1;

          await this.prisma
            .auditEvent
            .create({
              data: {
                tenantId,
                actorUserId:
                  actor.userId,
                actorEmail:
                  actor.email,
                actorRole:
                  actor.role,
                category:
                  'INTEGRATION',
                action:
                  'ERP_INVOICE_IMPORT_FAILED',
                entityType:
                  'EXTERNAL_INVOICE',
                entityId:
                  record.externalId,
                entityLabel:
                  record.externalInvoiceNumber,
                outcome:
                  'FAILED',
                metadata: {
                  provider:
                    connection.provider,
                  connectionId:
                    connection.id,
                  error:
                    this.safeError(
                      cause,
                    ),
                },
              },
            });
        }
      }

      const finalStatus =
        failedCount > 0
          ? 'PARTIAL'
          : 'SUCCEEDED';

      const completed =
        await this.prisma
          .$transaction(
            async tx => {
              const syncRun =
                await tx
                  .integrationSyncRun
                  .update({
                    where: {
                      id:
                        run.id,
                    },
                    data: {
                      status:
                        finalStatus,
                      completedAt:
                        new Date(),
                      importedCount,
                      skippedCount,
                      failedCount,
                      metadata: {
                        provider:
                          connection.provider,
                        receivedCount:
                          records.length,
                        readyCount,
                        notReadyCount,
                        autoSubmittedCount,
                        complianceProcessingFailedCount,
                      },
                    },
                  });

              await tx.auditEvent
                .create({
                  data: {
                    tenantId,
                    actorUserId:
                      actor.userId,
                    actorEmail:
                      actor.email,
                    actorRole:
                      actor.role,
                    category:
                      'INTEGRATION',
                    action:
                      'ERP_INVOICE_SYNC_COMPLETED',
                    entityType:
                      'INTEGRATION_SYNC_RUN',
                    entityId:
                      syncRun.id,
                    entityLabel:
                      connection.name,
                    outcome:
                      finalStatus ===
                      'SUCCEEDED'
                        ? 'SUCCESS'
                        : 'PARTIAL',
                    metadata: {
                      provider:
                        connection.provider,
                      importedCount,
                      skippedCount,
                      failedCount,
                      readyCount,
                      notReadyCount,
                      autoSubmittedCount,
                      complianceProcessingFailedCount,
                    },
                  },
                });

              return syncRun;
            },
          );

      return {
        ...completed,
        receivedCount:
          records.length,
        readyCount,
        notReadyCount,
        autoSubmittedCount,
        complianceProcessingFailedCount,
      };
    } catch (cause: unknown) {
      const message =
        this.safeError(
          cause,
        );

      await this.prisma
        .$transaction(
          async tx => {
            await tx
              .integrationSyncRun
              .update({
                where: {
                  id:
                    run.id,
                },
                data: {
                  status:
                    'FAILED',
                  completedAt:
                    new Date(),
                  importedCount,
                  skippedCount,
                  failedCount,
                  errorMessage:
                    message,
                  metadata: {
                    provider:
                      connection.provider,
                    readyCount,
                    notReadyCount,
                    autoSubmittedCount,
                    complianceProcessingFailedCount,
                  },
                },
              });

            await tx.auditEvent
              .create({
                data: {
                  tenantId,
                  actorUserId:
                    actor.userId,
                  actorEmail:
                    actor.email,
                  actorRole:
                    actor.role,
                  category:
                    'INTEGRATION',
                  action:
                    'ERP_INVOICE_SYNC_FAILED',
                  entityType:
                    'INTEGRATION_SYNC_RUN',
                  entityId:
                    run.id,
                  entityLabel:
                    connection.name,
                  outcome:
                    'FAILED',
                  metadata: {
                    provider:
                      connection.provider,
                    error:
                      message,
                  },
                },
              });
          },
        );

      throw new BadRequestException(
        `ERP invoice sync failed: ${message}`,
      );
    }
  }

  async syncSubmissionStatuses(
    actor: Actor,
    tenantId: string,
    id: string,
    dto:
      SyncSubmissionStatusesDto,
  ) {
    const connection =
      await this.requireConnection(
        tenantId,
        id,
      );

    if (
      !connection.isActive
    ) {
      throw new ConflictException(
        'Integration connection is disabled',
      );
    }

    const context =
      this.context(
        connection,
      );

    this.provider
      .validateStatusWriteback(
        context,
      );

    const run =
      await this.prisma
        .integrationSyncRun
        .create({
          data: {
            tenantId,
            connectionId:
              connection.id,
            direction:
              'PUSH',
            operation:
              'SUBMISSION_STATUS_WRITEBACK',
            status:
              'RUNNING',
            requestedById:
              actor.userId,
          },
        });

    let pushedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    let blockedUnknownCount = 0;

    try {
      const links =
        await this.prisma
          .externalInvoiceLink
          .findMany({
            where: {
              tenantId,
              connectionId:
                connection.id,
            },
            orderBy: {
              updatedAt:
                'desc',
            },
            take:
              dto.limit ?? 25,
          });

      for (
        const link
        of links
      ) {
        const submission =
          await this.prisma
            .aspSubmission
            .findFirst({
              where: {
                tenantId,
                invoiceId:
                  link.invoiceId,
              },
              orderBy: [
                {
                  updatedAt:
                    'desc',
                },
                {
                  createdAt:
                    'desc',
                },
              ],
            });

        if (
          !submission ||
          !WRITEBACK_STATUSES
            .has(
              submission.status,
            )
        ) {
          skippedCount += 1;
          continue;
        }

        const status =
          submission.status as
            SubmissionWritebackStatus;

        const writebackKey =
          this.writebackKey(
            tenantId,
            connection.id,
            link.externalInvoiceId,
            submission.id,
            status,
            submission.providerReference,
          );

        if (
          link.writebackKey ===
            writebackKey
        ) {
          if (
            link.writebackState ===
              'UNKNOWN'
          ) {
            blockedUnknownCount += 1;
          } else {
            skippedCount += 1;
          }

          continue;
        }

        const claimedAt =
          new Date();

        const claim =
          await this.prisma
            .externalInvoiceLink
            .updateMany({
              where: {
                id:
                  link.id,
                tenantId,
                connectionId:
                  connection.id,
                writebackKey:
                  link.writebackKey,
                writebackState:
                  link.writebackState,
              },
              data: {
                writebackKey,
                writebackState:
                  'SUBMITTING',
                writebackClaimedAt:
                  claimedAt,
                writebackLastError:
                  null,
              },
            });

        if (
          claim.count !==
          1
        ) {
          skippedCount += 1;
          continue;
        }

        const writeback:
          SubmissionStatusWriteback = {
            submissionId:
              submission.id,
            status,
            providerReference:
              submission.providerReference ??
              undefined,
            documentNumber:
              submission.documentNumber,
            externalInvoiceId:
              link.externalInvoiceId,
            externalInvoiceNumber:
              link.externalInvoiceNumber ??
              undefined,
            updatedAt:
              submission.updatedAt
                .toISOString(),
          };

        try {
          const providerResult =
            await this.provider
              .pushSubmissionStatus(
                context,
                writeback,
              );

          const pushedAt =
            new Date();

          await this.prisma
            .$transaction(
              async tx => {
                const applied =
                  await tx
                    .externalInvoiceLink
                    .updateMany({
                      where: {
                        id:
                          link.id,
                        tenantId,
                        connectionId:
                          connection.id,
                        writebackKey,
                        writebackState:
                          'SUBMITTING',
                      },
                      data: {
                        writebackState:
                          'SUCCEEDED',
                        writebackClaimedAt:
                          null,
                        writebackLastError:
                          null,
                        lastPushedAt:
                          pushedAt,
                        lastPushedStatus:
                          status,
                        lastPushedSubmissionId:
                          submission.id,
                        lastPushedProviderReference:
                          submission.providerReference,
                      },
                    });

                if (
                  applied.count !==
                  1
                ) {
                  throw new Error(
                    'ERP_STATUS_WRITEBACK_STATE_CHANGED',
                  );
                }

                await tx
                  .auditEvent
                  .create({
                    data: {
                      tenantId,
                      actorUserId:
                        actor.userId,
                      actorEmail:
                        actor.email,
                      actorRole:
                        actor.role,
                      category:
                        'INTEGRATION',
                      action:
                        'ERP_SUBMISSION_STATUS_PUSHED',
                      entityType:
                        'INVOICE',
                      entityId:
                        link.invoiceId,
                      entityLabel:
                        link.externalInvoiceNumber ??
                        submission.documentNumber,
                      outcome:
                        'SUCCESS',
                      metadata: {
                        provider:
                          connection.provider,
                        connectionId:
                          connection.id,
                        externalInvoiceId:
                          link.externalInvoiceId,
                        submissionId:
                          submission.id,
                        submissionStatus:
                          status,
                        providerReference:
                          submission.providerReference,
                        providerResult,
                      },
                    },
                  });
              },
            );

          pushedCount += 1;
        } catch (
          cause: unknown
        ) {
          const error =
            this.safeError(
              cause,
            );

          await this.prisma
            .$transaction(
              async tx => {
                await tx
                  .externalInvoiceLink
                  .updateMany({
                    where: {
                      id:
                        link.id,
                      tenantId,
                      connectionId:
                        connection.id,
                      writebackKey,
                      writebackState:
                        'SUBMITTING',
                    },
                    data: {
                      writebackState:
                        'UNKNOWN',
                      writebackClaimedAt:
                        null,
                      writebackLastError:
                        error,
                    },
                  });

                await tx
                  .auditEvent
                  .create({
                    data: {
                      tenantId,
                      actorUserId:
                        actor.userId,
                      actorEmail:
                        actor.email,
                      actorRole:
                        actor.role,
                      category:
                        'INTEGRATION',
                      action:
                        'ERP_SUBMISSION_STATUS_PUSH_UNKNOWN',
                      entityType:
                        'INVOICE',
                      entityId:
                        link.invoiceId,
                      entityLabel:
                        link.externalInvoiceNumber ??
                        submission.documentNumber,
                      outcome:
                        'UNKNOWN',
                      metadata: {
                        provider:
                          connection.provider,
                        connectionId:
                          connection.id,
                        externalInvoiceId:
                          link.externalInvoiceId,
                        submissionId:
                          submission.id,
                        submissionStatus:
                          status,
                        error,
                      },
                    },
                  });
              },
            );

          failedCount += 1;
        }
      }

      const completedAt =
        new Date();

      const status =
        failedCount > 0
          ? 'PARTIAL'
          : 'SUCCEEDED';

      const completed =
        await this.prisma
          .$transaction(
            async tx => {
              const updated =
                await tx
                  .integrationSyncRun
                  .update({
                    where: {
                      id:
                        run.id,
                    },
                    data: {
                      status,
                      completedAt,
                      pushedCount,
                      skippedCount,
                      failedCount,
                      metadata: {
                        provider:
                          connection.provider,
                        blockedUnknownCount,
                      },
                    },
                  });

              await tx
                .auditEvent
                .create({
                  data: {
                    tenantId,
                    actorUserId:
                      actor.userId,
                    actorEmail:
                      actor.email,
                    actorRole:
                      actor.role,
                    category:
                      'INTEGRATION',
                    action:
                      'ERP_SUBMISSION_STATUS_SYNC_COMPLETED',
                    entityType:
                      'INTEGRATION_SYNC_RUN',
                    entityId:
                      run.id,
                    entityLabel:
                      connection.name,
                    outcome:
                      status,
                    metadata: {
                      provider:
                        connection.provider,
                      pushedCount,
                      skippedCount,
                      failedCount,
                      blockedUnknownCount,
                    },
                  },
                });

              return updated;
            },
          );

      return {
        ...completed,
        pushedCount,
        skippedCount,
        failedCount,
        blockedUnknownCount,
      };
    } catch (
      cause: unknown
    ) {
      const message =
        this.safeError(
          cause,
        );

      await this.prisma
        .$transaction(
          async tx => {
            await tx
              .integrationSyncRun
              .update({
                where: {
                  id:
                    run.id,
                },
                data: {
                  status:
                    'FAILED',
                  completedAt:
                    new Date(),
                  pushedCount,
                  skippedCount,
                  failedCount,
                  errorMessage:
                    message,
                  metadata: {
                    provider:
                      connection.provider,
                    blockedUnknownCount,
                  },
                },
              });

            await tx
              .auditEvent
              .create({
                data: {
                  tenantId,
                  actorUserId:
                    actor.userId,
                  actorEmail:
                    actor.email,
                  actorRole:
                    actor.role,
                  category:
                    'INTEGRATION',
                  action:
                    'ERP_SUBMISSION_STATUS_SYNC_FAILED',
                  entityType:
                    'INTEGRATION_SYNC_RUN',
                  entityId:
                    run.id,
                  entityLabel:
                    connection.name,
                  outcome:
                    'FAILED',
                  metadata: {
                    provider:
                      connection.provider,
                    error:
                      message,
                  },
                },
              });
          },
        );

      throw new BadRequestException(
        `ERP submission status sync failed: ${message}`,
      );
    }
  }

  async syncRuns(
    tenantId: string,
    connectionId?: string,
  ) {
    return this.prisma
      .integrationSyncRun
      .findMany({
        where: {
          tenantId,
          ...(connectionId
            ? {
                connectionId,
              }
            : {}),
        },
        orderBy: {
          startedAt:
            'desc',
        },
        take:
          100,
      });
  }

  private async importRecord(
    actor: Actor,
    tenantId: string,
    connectionId: string,
    provider: string,
    record:
      ExternalInvoiceRecord,
  ): Promise<
    ImportRecordResult
  > {
    const existing =
      await this.prisma
        .externalInvoiceLink
        .findUnique({
          where: {
            connectionId_externalInvoiceId: {
              connectionId,
              externalInvoiceId:
                record.externalId,
            },
          },
          select: {
            id:
              true,
          },
        });

    if (existing) {
      return {
        status:
          'SKIPPED',
      };
    }

    const canonical =
      this.canonicalMapper
        .map(
          record.invoice,
        )
        .invoice;

    try {
      const importedInvoice =
        await this.prisma
          .$transaction(
            async tx => {
            const invoice =
              await this.createInvoice(
                tx,
                canonical,
                tenantId,
                actor.userId,
              );

            await tx
              .externalInvoiceLink
              .create({
                data: {
                  tenantId,
                  connectionId,
                  invoiceId:
                    invoice.id,
                  externalInvoiceId:
                    record.externalId,
                  externalInvoiceNumber:
                    record.externalInvoiceNumber,
                  externalStatus:
                    record.externalStatus,
                  externalVersion:
                    record.externalVersion,
                  lastPulledAt:
                    new Date(),
                },
              });

            await tx
              .invoiceAuditEvent
              .create({
                data: {
                  invoiceId:
                    invoice.id,
                  tenantId,
                  userId:
                    actor.userId,
                  action:
                    'ERP_IMPORTED',
                  fromStatus:
                    null,
                  toStatus:
                    'RECEIVED',
                  details: {
                    provider,
                    connectionId,
                    externalInvoiceId:
                      record.externalId,
                    externalInvoiceNumber:
                      record.externalInvoiceNumber,
                  },
                },
              });

            await tx.auditEvent
              .create({
                data: {
                  tenantId,
                  actorUserId:
                    actor.userId,
                  actorEmail:
                    actor.email,
                  actorRole:
                    actor.role,
                  category:
                    'INTEGRATION',
                  action:
                    'ERP_INVOICE_IMPORTED',
                  entityType:
                    'INVOICE',
                  entityId:
                    invoice.id,
                  entityLabel:
                    invoice.invoiceNumber,
                  outcome:
                    'SUCCESS',
                  metadata: {
                    provider,
                    connectionId,
                    externalInvoiceId:
                      record.externalId,
                    externalInvoiceNumber:
                      record.externalInvoiceNumber,
                    complianceStatus:
                      'PENDING',
                  },
                },
              });

            return invoice;
          },
        );

      return {
        status:
          'IMPORTED',
        invoiceId:
          importedInvoice.id,
        invoiceNumber:
          importedInvoice.invoiceNumber,
      };
    } catch (cause: unknown) {
      if (
        this.isP2002(
          cause,
        )
      ) {
        return {
          status:
            'SKIPPED',
        };
      }

      throw cause;
    }
  }

  private async processImportedInvoice(
    actor: Actor,
    tenantId: string,
    connection: {
      id: string;
      provider: string;
      config:
        Prisma.JsonValue |
        null;
    },
    invoiceId: string,
    invoiceNumber: string,
  ) {
    const config =
      this.jsonObject(
        connection.config,
      );

    const autoSubmitReadyInvoices =
      config.autoSubmitReadyInvoices ===
      true;

    const result =
      await this.compliancePipeline
        .process(
          invoiceId,
          tenantId,
          actor.userId,
          autoSubmitReadyInvoices,
        );

    await this.prisma
      .auditEvent
      .create({
        data: {
          tenantId,
          actorUserId:
            actor.userId,
          actorEmail:
            actor.email,
          actorRole:
            actor.role,
          category:
            'INTEGRATION',
          action:
            'ERP_COMPLIANCE_PIPELINE_COMPLETED',
          entityType:
            'INVOICE',
          entityId:
            invoiceId,
          entityLabel:
            invoiceNumber,
          outcome:
            result.readinessStatus ===
            'READY'
              ? 'SUCCESS'
              : 'NOT_READY',
          metadata: {
            provider:
              connection.provider,
            connectionId:
              connection.id,
            readinessStatus:
              result.readinessStatus,
            internalPassed:
              result.internalPassed,
            officialPassed:
              result.officialPassed,
            officialFailures:
              result.officialFailures,
            autoSubmitReadyInvoices,
            aspSubmissionAttempted:
              result.aspSubmissionAttempted,
            aspSubmitted:
              result.aspSubmitted,
          },
        },
      });

    return result;
  }

  private async createInvoice(
    tx:
      Prisma.TransactionClient,
    invoice:
      IngestedInvoice,
    tenantId: string,
    uploadedById: string,
  ) {
    return tx.invoice
      .create({
        data: {
          tenantId,
          uploadedById,
          invoiceNumber:
            invoice.invoiceNumber,
          invoiceDate:
            new Date(
              invoice.invoiceDate,
            ),
          currency:
            invoice.currency,
          totalAmount:
            invoice.totalAmount,
          status:
            'RECEIVED',
          complianceStatus:
            'PENDING',
          jurisdiction:
            invoice.jurisdiction,
          invoiceTypeCode:
            invoice.invoiceTypeCode,
          transactionTypeCode:
            invoice.transactionTypeCode,
          paymentDueDate:
            invoice.paymentDueDate
              ? new Date(
                  invoice.paymentDueDate,
                )
              : undefined,
          businessProcessType:
            invoice.businessProcessType,
          specificationIdentifier:
            invoice.specificationIdentifier,
          paymentMeansTypeCode:
            invoice.paymentMeansTypeCode,
          paymentAccountIdentifier:
            invoice.paymentAccountIdentifier,
          creditNoteReasonCode:
            invoice.creditNoteReasonCode,
          creditNoteReasonText:
            invoice.creditNoteReasonText,
          precedingInvoiceReference:
            invoice.precedingInvoiceReference,
          lineNetTotal:
            invoice.lineNetTotal,
          allowanceTotal:
            invoice.allowanceTotal,
          chargeTotal:
            invoice.chargeTotal,
          totalWithoutTax:
            invoice.totalWithoutTax,
          totalTaxAmount:
            invoice.totalTaxAmount,
          totalWithTax:
            invoice.totalWithTax,
          paidAmount:
            invoice.paidAmount,
          roundingAmount:
            invoice.roundingAmount,
          amountDue:
            invoice.amountDue,
          parties:
            invoice.parties?.length
              ? {
                  create:
                    invoice.parties,
                }
              : undefined,
          taxBreakdowns:
            invoice.taxBreakdowns?.length
              ? {
                  create:
                    invoice.taxBreakdowns,
                }
              : undefined,
          lines:
            invoice.lines?.length
              ? {
                  create:
                    invoice.lines,
                }
              : undefined,
          allowanceCharges:
            invoice.allowanceCharges?.length
              ? {
                  create:
                    invoice.allowanceCharges,
                }
              : undefined,
        },
        select: {
          id:
            true,
          invoiceNumber:
            true,
        },
      });
  }

  private async requireConnection(
    tenantId: string,
    id: string,
  ) {
    const row =
      await this.prisma
        .integrationConnection
        .findFirst({
          where: {
            id,
            tenantId,
          },
        });

    if (!row) {
      throw new NotFoundException(
        'Integration connection not found',
      );
    }

    return row;
  }

  private context(
    row: {
      id: string;
      tenantId: string;
      provider: string;
      baseUrl: string;
      authType: string;
      config:
        Prisma.JsonValue |
        null;
      credentialsEncrypted:
        string;
    },
  ): ConnectionContext {
    return {
      id:
        row.id,
      tenantId:
        row.tenantId,
      provider:
        row.provider as
          IntegrationProvider,
      baseUrl:
        row.baseUrl,
      authType:
        row.authType as
          IntegrationAuthType,
      config:
        this.jsonObject(
          row.config,
        ),
      credentials:
        this.crypto.decrypt(
          row
            .credentialsEncrypted,
        ),
    };
  }

  private jsonObject(
    value:
      Prisma.JsonValue |
      null,
  ): IntegrationObject {
    if (
      value === null ||
      typeof value !==
        'object' ||
      Array.isArray(value)
    ) {
      return {};
    }

    return value as
      IntegrationObject;
  }

  private safe<
    T extends {
      credentialsEncrypted:
        string;
    },
  >(
    row: T,
  ) {
    const {
      credentialsEncrypted:
        _secret,
      ...safe
    } = row;

    return {
      ...safe,
      credentialsConfigured:
        Boolean(
          _secret,
        ),
    };
  }

  private normalizeBaseUrl(
    value: string,
  ) {
    let url: URL;

    try {
      url =
        new URL(
          value.trim(),
        );
    } catch {
      throw new BadRequestException(
        'Integration base URL is invalid',
      );
    }

    if (
      url.protocol !==
      'https:'
    ) {
      throw new BadRequestException(
        'Integration base URL must use HTTPS',
      );
    }

    if (
      url.username ||
      url.password
    ) {
      throw new BadRequestException(
        'Integration base URL must not contain credentials',
      );
    }

    url.search = '';
    url.hash = '';

    return url
      .toString()
      .replace(
        /\/$/,
        '',
      );
  }

  private writebackKey(
    tenantId: string,
    connectionId: string,
    externalInvoiceId: string,
    submissionId: string,
    status:
      SubmissionWritebackStatus,
    providerReference:
      string |
      null,
  ) {
    return createHash(
      'sha256',
    )
      .update(
        [
          tenantId,
          connectionId,
          externalInvoiceId,
          submissionId,
          status,
          providerReference ??
            '',
        ].join(
          ':',
        ),
        'utf8',
      )
      .digest(
        'hex',
      );
  }

  private safeError(
    cause: unknown,
  ) {
    if (
      cause instanceof Error &&
      cause.message
    ) {
      return cause.message
        .replace(
          /Bearer\s+\S+/gi,
          'Bearer [REDACTED]',
        )
        .replace(
          /Basic\s+\S+/gi,
          'Basic [REDACTED]',
        )
        .replace(
          /client_secret=[^&\s]+/gi,
          'client_secret=[REDACTED]',
        )
        .slice(
          0,
          500,
        );
    }

    return 'Integration operation failed';
  }

  private isP2002(
    cause: unknown,
  ) {
    return (
      typeof cause ===
        'object' &&
      cause !== null &&
      'code' in cause &&
      cause.code ===
        'P2002'
    );
  }
}
