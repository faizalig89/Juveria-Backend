import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service.js';

type AuthenticatedRequest = Request & {
  user?: {
    tenantId?: string;
  };
};

@Injectable()
export class ErpEnabledGuard
implements CanActivate {
  constructor(
    private readonly prisma:
      PrismaService,
  ) {}

  async canActivate(
    context: ExecutionContext,
  ) {
    const request =
      context.switchToHttp()
        .getRequest<AuthenticatedRequest>();

    const tenantId =
      request.user?.tenantId;

    if (!tenantId) {
      throw new ForbiddenException(
        'Authenticated tenant information is required',
      );
    }

    const tenant =
      await this.prisma.tenant.findUnique({
        where: {
          id: tenantId,
        },
        select: {
          erpEnabled: true,
          accessStatus: true,
          trialExpiresAt: true,
        },
      });

    if (!tenant?.erpEnabled) {
      throw new ForbiddenException(
        'ERP integrations are not enabled for this workspace',
      );
    }

    const trialExpired =
      tenant.accessStatus ===
        'TRIAL_ACTIVE' &&
      tenant.trialExpiresAt !== null &&
      tenant.trialExpiresAt.getTime() <=
        Date.now();

    if (
      trialExpired ||
      tenant.accessStatus ===
        'TRIAL_EXPIRED' ||
      tenant.accessStatus ===
        'SUSPENDED'
    ) {
      throw new ForbiddenException(
        'ERP integrations are unavailable for this workspace access state',
      );
    }

    return true;
  }
}
