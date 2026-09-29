import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import type {
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { ListAuditEventsQueryDto } from './dto/list-audit-events-query.dto.js';

type TimelineItem = {
  id: string;
  tenantId: string;
  source:
    | 'AUDIT_EVENT'
    | 'INVOICE_AUDIT'
    | 'ASP_SUBMISSION'
    | 'ASP_ATTEMPT';
  category: string;
  action: string;
  actorUserId: string | null;
  actorEmail: string | null;
  actorRole: string | null;
  entityType: string;
  entityId: string | null;
  entityLabel: string | null;
  outcome: string;
  fromStatus: string | null;
  toStatus: string | null;
  before: unknown;
  after: unknown;
  metadata: unknown;
  createdAt: Date;
};

@Injectable()
export class AuditService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async listTenantTimeline(
    tenantId: string,
    query: ListAuditEventsQueryDto,
  ) {
    if (!tenantId) {
      throw new BadRequestException(
        'Authenticated tenant information is required',
      );
    }

    const page =
      query.page ?? 1;

    const limit =
      query.limit ?? 50;

    const start =
      (page - 1) * limit;

    /*
     * For a globally sorted page, fetching the newest
     * start + limit + 1 records from every source is enough:
     * an event older than that within one source cannot enter
     * the requested global page.
     */
    const fetchCount =
      start + limit + 1;

    const from =
      query.from
        ? new Date(query.from)
        : undefined;

    const to =
      query.to
        ? new Date(query.to)
        : undefined;

    if (
      from &&
      to &&
      from.getTime() >
        to.getTime()
    ) {
      throw new BadRequestException(
        '"from" must not be later than "to"',
      );
    }

    const createdAt:
      | {
          gte?: Date;
          lte?: Date;
        }
      | undefined =
      from || to
        ? {
            ...(from
              ? {
                  gte: from,
                }
              : {}),
            ...(to
              ? {
                  lte: to,
                }
              : {}),
          }
        : undefined;

    const genericWhere:
      Prisma.AuditEventWhereInput =
      {
        tenantId,
        ...(query.category
          ? {
              category:
                query.category,
            }
          : {}),
        ...(query.action
          ? {
              action:
                query.action,
            }
          : {}),
        ...(query.entityType
          ? {
              entityType:
                query.entityType,
            }
          : {}),
        ...(createdAt
          ? {
              createdAt,
            }
          : {}),
      };

    const includeInvoice =
      (
        !query.category ||
        query.category ===
          'INVOICE'
      ) &&
      (
        !query.entityType ||
        query.entityType ===
          'INVOICE'
      );

    const includeAsp =
      (
        !query.category ||
        query.category ===
          'ASP'
      ) &&
      (
        !query.entityType ||
        query.entityType ===
          'ASP_SUBMISSION'
      );

    const includeAspSubmission =
      includeAsp &&
      (
        !query.action ||
        query.action ===
          'ASP_SUBMISSION_CREATED'
      );

    const includeAspAttempt =
      includeAsp &&
      (
        !query.action ||
        query.action ===
          'ASP_SUBMISSION_ATTEMPT'
      );

    const invoiceWhere:
      Prisma.InvoiceAuditEventWhereInput =
      {
        tenantId,
        ...(query.action
          ? {
              action:
                query.action,
            }
          : {}),
        ...(createdAt
          ? {
              createdAt,
            }
          : {}),
      };

    const aspSubmissionWhere:
      Prisma.AspSubmissionWhereInput =
      {
        tenantId,
        ...(createdAt
          ? {
              createdAt,
            }
          : {}),
      };

    const attemptStartedAt =
      createdAt;

    const aspAttemptWhere:
      Prisma.AspSubmissionAttemptWhereInput =
      {
        submission: {
          tenantId,
        },
        ...(attemptStartedAt
          ? {
              startedAt:
                attemptStartedAt,
            }
          : {}),
      };

    const [
      genericEvents,
      invoiceEvents,
      aspSubmissions,
      aspAttempts,
    ] =
      await Promise.all([
        this.prisma.auditEvent.findMany({
          where:
            genericWhere,
          orderBy: [
            {
              createdAt:
                'desc',
            },
            {
              id:
                'desc',
            },
          ],
          take:
            fetchCount,
        }),

        includeInvoice
          ? this.prisma.invoiceAuditEvent.findMany({
              where:
                invoiceWhere,
              orderBy: [
                {
                  createdAt:
                    'desc',
                },
                {
                  id:
                    'desc',
                },
              ],
              take:
                fetchCount,
              select: {
                id: true,
                tenantId: true,
                invoiceId: true,
                userId: true,
                action: true,
                fromStatus: true,
                toStatus: true,
                details: true,
                createdAt: true,
                invoice: {
                  select: {
                    invoiceNumber:
                      true,
                  },
                },
              },
            })
          : Promise.resolve([]),

        includeAspSubmission
          ? this.prisma.aspSubmission.findMany({
              where:
                aspSubmissionWhere,
              orderBy: [
                {
                  createdAt:
                    'desc',
                },
                {
                  id:
                    'desc',
                },
              ],
              take:
                fetchCount,
              select: {
                id: true,
                tenantId: true,
                invoiceId: true,
                provider: true,
                documentNumber:
                  true,
                status: true,
                providerReference:
                  true,
                attemptCount: true,
                createdAt: true,
              },
            })
          : Promise.resolve([]),

        includeAspAttempt
          ? this.prisma.aspSubmissionAttempt.findMany({
              where:
                aspAttemptWhere,
              orderBy: [
                {
                  startedAt:
                    'desc',
                },
                {
                  id:
                    'desc',
                },
              ],
              take:
                fetchCount,
              select: {
                id: true,
                attemptNumber:
                  true,
                status: true,
                providerReference:
                  true,
                message: true,
                errorCode: true,
                errorMessage: true,
                startedAt: true,
                completedAt: true,
                submission: {
                  select: {
                    id: true,
                    tenantId: true,
                    invoiceId:
                      true,
                    provider: true,
                    documentNumber:
                      true,
                  },
                },
              },
            })
          : Promise.resolve([]),
      ]);

    const actorIds =
      [
        ...new Set(
          invoiceEvents
            .map(
              (event) =>
                event.userId,
            )
            .filter(
              (
                userId,
              ): userId is string =>
                Boolean(userId),
            ),
        ),
      ];

    const actorUsers =
      actorIds.length > 0
        ? await this.prisma.user.findMany({
            where: {
              tenantId,
              id: {
                in:
                  actorIds,
              },
            },
            select: {
              id: true,
              email: true,
              role: true,
            },
          })
        : [];

    const actorMap =
      new Map(
        actorUsers.map(
          (user) => [
            user.id,
            user,
          ],
        ),
      );

    const items:
      TimelineItem[] =
      [
        ...genericEvents.map(
          (event) => ({
            id:
              event.id,
            tenantId:
              event.tenantId,
            source:
              'AUDIT_EVENT' as const,
            category:
              event.category,
            action:
              event.action,
            actorUserId:
              event.actorUserId,
            actorEmail:
              event.actorEmail,
            actorRole:
              event.actorRole,
            entityType:
              event.entityType,
            entityId:
              event.entityId,
            entityLabel:
              event.entityLabel,
            outcome:
              event.outcome,
            fromStatus:
              null,
            toStatus:
              null,
            before:
              event.before,
            after:
              event.after,
            metadata:
              event.metadata,
            createdAt:
              event.createdAt,
          }),
        ),

        ...invoiceEvents.map(
          (event) => {
            const actor =
              event.userId
                ? actorMap.get(
                    event.userId,
                  )
                : undefined;

            return {
              id:
                event.id,
              tenantId:
                event.tenantId,
              source:
                'INVOICE_AUDIT' as const,
              category:
                'INVOICE',
              action:
                event.action,
              actorUserId:
                event.userId,
              actorEmail:
                actor?.email ??
                null,
              actorRole:
                actor?.role ??
                null,
              entityType:
                'INVOICE',
              entityId:
                event.invoiceId,
              entityLabel:
                event.invoice
                  .invoiceNumber,
              outcome:
                'SUCCESS',
              fromStatus:
                event.fromStatus,
              toStatus:
                event.toStatus,
              before:
                null,
              after:
                null,
              metadata:
                event.details,
              createdAt:
                event.createdAt,
            };
          },
        ),

        ...aspSubmissions.map(
          (submission) => ({
            id:
              submission.id,
            tenantId:
              submission.tenantId,
            source:
              'ASP_SUBMISSION' as const,
            category:
              'ASP',
            action:
              'ASP_SUBMISSION_CREATED',
            actorUserId:
              null,
            actorEmail:
              null,
            actorRole:
              null,
            entityType:
              'ASP_SUBMISSION',
            entityId:
              submission.id,
            entityLabel:
              submission.documentNumber,
            outcome:
              submission.status ===
                'REJECTED' ||
              submission.status ===
                'ERROR'
                ? 'FAILURE'
                : submission.status ===
                    'ACCEPTED'
                  ? 'SUCCESS'
                  : 'PENDING',
            fromStatus:
              null,
            toStatus:
              submission.status,
            before:
              null,
            after:
              null,
            metadata: {
              invoiceId:
                submission.invoiceId,
              provider:
                submission.provider,
              providerReference:
                submission.providerReference,
              attemptCount:
                submission.attemptCount,
            },
            createdAt:
              submission.createdAt,
          }),
        ),

        ...aspAttempts.map(
          (attempt) => ({
            id:
              attempt.id,
            tenantId:
              attempt.submission
                .tenantId,
            source:
              'ASP_ATTEMPT' as const,
            category:
              'ASP',
            action:
              'ASP_SUBMISSION_ATTEMPT',
            actorUserId:
              null,
            actorEmail:
              null,
            actorRole:
              null,
            entityType:
              'ASP_SUBMISSION',
            entityId:
              attempt.submission
                .id,
            entityLabel:
              attempt.submission
                .documentNumber,
            outcome:
              attempt.status ===
                'REJECTED' ||
              attempt.status ===
                'ERROR' ||
              attempt.status ===
                'UNKNOWN'
                ? 'FAILURE'
                : attempt.status ===
                    'ACCEPTED'
                  ? 'SUCCESS'
                  : 'PENDING',
            fromStatus:
              null,
            toStatus:
              attempt.status,
            before:
              null,
            after:
              null,
            metadata: {
              invoiceId:
                attempt.submission
                  .invoiceId,
              provider:
                attempt.submission
                  .provider,
              attemptNumber:
                attempt.attemptNumber,
              providerReference:
                attempt.providerReference,
              message:
                attempt.message,
              errorCode:
                attempt.errorCode,
              errorMessage:
                attempt.errorMessage,
              completedAt:
                attempt.completedAt,
            },
            createdAt:
              attempt.startedAt,
          }),
        ),
      ];

    items.sort(
      (left, right) => {
        const timeDifference =
          right.createdAt.getTime() -
          left.createdAt.getTime();

        if (
          timeDifference !== 0
        ) {
          return timeDifference;
        }

        return right.id.localeCompare(
          left.id,
        );
      },
    );

    const requestedEnd =
      start + limit;

    return {
      page,
      limit,
      hasMore:
        items.length >
        requestedEnd,
      items:
        items.slice(
          start,
          requestedEnd,
        ),
    };
  }
}
