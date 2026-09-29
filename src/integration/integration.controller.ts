import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type {
  Request,
} from 'express';
import {
  JwtAuthGuard,
} from '../auth/jwt-auth.guard.js';
import {
  Roles,
} from '../auth/roles.decorator.js';
import {
  RolesGuard,
} from '../auth/roles.guard.js';
import {
  IntegrationService,
} from './integration.service.js';
import { ErpEnabledGuard } from './erp-enabled.guard.js';
import {
  CreateIntegrationConnectionDto,
  SyncIntegrationInvoicesDto,
  SyncSubmissionStatusesDto,
  UpdateIntegrationConnectionDto,
} from './integration.dto.js';

interface AuthenticatedRequest
extends Request {
  user: {
    userId: string;
    tenantId: string;
    email: string;
    role: string;
  };
}

@UseGuards(
  JwtAuthGuard,
  RolesGuard,
  ErpEnabledGuard,
)
@Roles('CLIENT_ADMIN')
@Controller('integrations')
export class IntegrationController {
  constructor(
    private readonly service:
      IntegrationService,
  ) {}

  @Get('providers')
  providers() {
    return this.service
      .providers();
  }

  @Get('connections')
  list(
    @Req()
    req:
      AuthenticatedRequest,
  ) {
    return this.service
      .list(
        req.user.tenantId,
      );
  }

  @Post('connections')
  create(
    @Req()
    req:
      AuthenticatedRequest,
    @Body()
    body:
      CreateIntegrationConnectionDto,
  ) {
    return this.service
      .create(
        this.actor(req),
        req.user.tenantId,
        body,
      );
  }

  @Patch('connections/:id')
  update(
    @Req()
    req:
      AuthenticatedRequest,
    @Param('id')
    id: string,
    @Body()
    body:
      UpdateIntegrationConnectionDto,
  ) {
    return this.service
      .update(
        this.actor(req),
        req.user.tenantId,
        id,
        body,
      );
  }

  @Delete('connections/:id')
  deactivate(
    @Req()
    req:
      AuthenticatedRequest,
    @Param('id')
    id: string,
  ) {
    return this.service
      .deactivate(
        this.actor(req),
        req.user.tenantId,
        id,
      );
  }

  @Post('connections/:id/test')
  test(
    @Req()
    req:
      AuthenticatedRequest,
    @Param('id')
    id: string,
  ) {
    return this.service
      .test(
        this.actor(req),
        req.user.tenantId,
        id,
      );
  }

  @Post(
    'connections/:id/sync/invoices',
  )
  syncInvoices(
    @Req()
    req:
      AuthenticatedRequest,
    @Param('id')
    id: string,
    @Body()
    body:
      SyncIntegrationInvoicesDto,
  ) {
    return this.service
      .syncInvoices(
        this.actor(req),
        req.user.tenantId,
        id,
        body,
      );
  }

  @Post(
    'connections/:id/sync/submission-statuses',
  )
  syncSubmissionStatuses(
    @Req()
    req:
      AuthenticatedRequest,
    @Param('id')
    id: string,
    @Body()
    body:
      SyncSubmissionStatusesDto,
  ) {
    return this.service
      .syncSubmissionStatuses(
        this.actor(req),
        req.user.tenantId,
        id,
        body,
      );
  }

  @Get('sync-runs')
  syncRuns(
    @Req()
    req:
      AuthenticatedRequest,
    @Query('connectionId')
    connectionId?: string,
  ) {
    return this.service
      .syncRuns(
        req.user.tenantId,
        connectionId,
      );
  }

  private actor(
    req:
      AuthenticatedRequest,
  ) {
    return {
      userId:
        req.user.userId,
      email:
        req.user.email,
      role:
        req.user.role,
    };
  }
}
