import {
  Controller,
  Get,
  Query,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { AuditService } from './audit.service.js';
import { ListAuditEventsQueryDto } from './dto/list-audit-events-query.dto.js';

interface AuthenticatedRequest
  extends Request {
  user: {
    userId: string;
    tenantId: string;
    email: string;
    role: string;
    authVersion?: number;
  };
}

@Controller('audit')
@UseGuards(
  JwtAuthGuard,
  RolesGuard,
)
@Roles('CLIENT_ADMIN')
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class AuditController {
  constructor(
    private readonly auditService:
      AuditService,
  ) {}

  @Get()
  async list(
    @Req()
    req: AuthenticatedRequest,
    @Query()
    query:
      ListAuditEventsQueryDto,
  ) {
    return this.auditService
      .listTenantTimeline(
        req.user.tenantId,
        query,
      );
  }
}
