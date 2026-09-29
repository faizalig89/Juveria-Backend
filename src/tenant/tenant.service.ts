import {
  BadRequestException,
  ConflictException,
  Injectable,

  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import { OnboardTenantDto } from './dto/onboard-tenant.dto.js';
import type { UpdateTenantCapabilitiesDto } from './dto/update-tenant-capabilities.dto.js';

type PlatformActor = {
  userId: string;
  email: string;
  role: string;
};

@Injectable()
export class TenantService {
  constructor(private readonly prisma: PrismaService) {}

  async create(name: string, slug: string) {
    const normalizedName = name.trim();

    if (normalizedName.length < 2) {
      throw new BadRequestException(
        'Company name must contain at least two characters',
      );
    }

    try {
      return await this.prisma.tenant.create({
        data: {
          name: normalizedName,
          slug: slug.trim().toLowerCase(),
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Company already exists');
      }
      throw error;
    }
  }

  async onboard(input: OnboardTenantDto) {
    const name = input.name.trim();
    const firstName = input.adminFirstName.trim();

    if (name.length < 2 || !firstName) {
      throw new BadRequestException(
        'A valid company name and administrator first name are required',
      );
    }

    if (Buffer.byteLength(input.adminPassword, 'utf8') > 72) {
      throw new BadRequestException(
        'Administrator password must not exceed 72 UTF-8 bytes',
      );
    }

    const passwordHash = await bcrypt.hash(input.adminPassword, 12);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const tenant = await tx.tenant.create({
          data: {
            name,
            slug: input.slug.trim().toLowerCase(),
          },
          select: {
            id: true,
            name: true,
            slug: true,
          },
        });

        const admin = await tx.user.create({
          data: {
            tenantId: tenant.id,
            email: input.adminEmail.trim().toLowerCase(),
            firstName,
            lastName: input.adminLastName?.trim() || null,
            passwordHash,
            role: 'CLIENT_ADMIN',
            isActive: true,
          },
          select: {
            id: true,
            tenantId: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            isActive: true,
          },
        });

        return { tenant, admin };
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Company or administrator email already exists',
        );
      }
      throw error;
    }
  }


  async updateCapabilities(
    actor: PlatformActor,
    tenantId: string,
    changes:
      UpdateTenantCapabilitiesDto,
  ) {
    if (
      changes.erpEnabled ===
        undefined &&
      changes.productionEnabled ===
        undefined &&
      changes.accessStatus ===
        undefined
    ) {
      throw new BadRequestException(
        'Provide at least one tenant capability change',
      );
    }

    return this.prisma.$transaction(
      async tx => {
        const before =
          await tx.tenant.findUnique({
            where: {
              id: tenantId,
            },
            select: {
              id: true,
              name: true,
              accessStatus: true,
              erpEnabled: true,
              productionEnabled:
                true,
              trialStartedAt: true,
              trialExpiresAt: true,
            },
          });

        if (!before) {
          throw new NotFoundException(
            'Company not found',
          );
        }

        const data: {
          accessStatus?: string;
          erpEnabled?: boolean;
          productionEnabled?:
            boolean;
        } = {};

        if (
          changes.accessStatus !==
          undefined
        ) {
          data.accessStatus =
            changes.accessStatus;
        }

        if (
          changes.erpEnabled !==
          undefined
        ) {
          data.erpEnabled =
            changes.erpEnabled;
        }

        if (
          changes.productionEnabled !==
          undefined
        ) {
          data.productionEnabled =
            changes.productionEnabled;
        }

        const after =
          await tx.tenant.update({
            where: {
              id: tenantId,
            },
            data,
            select: {
              id: true,
              name: true,
              slug: true,
              accessStatus: true,
              trialStartedAt: true,
              trialExpiresAt: true,
              erpEnabled: true,
              productionEnabled:
                true,
              createdAt: true,
              updatedAt: true,
            },
          });

        await tx.auditEvent.create({
          data: {
            tenantId,
            actorUserId:
              actor.userId,
            actorEmail:
              actor.email,
            actorRole:
              actor.role,
            category:
              'PLATFORM',
            action:
              'TENANT_CAPABILITIES_UPDATED',
            entityType:
              'TENANT',
            entityId:
              tenantId,
            entityLabel:
              before.name,
            outcome:
              'SUCCESS',
            before: {
              accessStatus:
                before.accessStatus,
              erpEnabled:
                before.erpEnabled,
              productionEnabled:
                before.productionEnabled,
            },
            after: {
              accessStatus:
                after.accessStatus,
              erpEnabled:
                after.erpEnabled,
              productionEnabled:
                after.productionEnabled,
            },
          },
        });

        return after;
      },
    );
  }

  async findAll() {
    return this.prisma.tenant.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
