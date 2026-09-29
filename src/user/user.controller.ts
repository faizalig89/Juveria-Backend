import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserAccessDto } from './dto/update-user-access.dto.js';
import { UserService } from './user.service.js';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    tenantId: string;
    email: string;
    role: string;
    authVersion?: number;
  };
}

@Controller('user')
export class UserController {
  constructor(
    private readonly userService: UserService,
  ) {}

  /*
   * Safe identity/context endpoint for every authenticated user.
   * It never returns another tenant member.
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(
    @Req() req: AuthenticatedRequest,
  ) {
    return this.userService.findWorkspaceIdentity(
      req.user.userId,
      req.user.tenantId,
    );
  }

  /*
   * Preserve the existing workspace tenant-resolution contract:
   *
   * CLIENT_ADMIN -> tenant user directory.
   * CLIENT_USER  -> only their own safe identity/context.
   *
   * Ordinary users therefore get tenantId for workspace loading
   * without receiving the tenant's complete user directory.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    'CLIENT_ADMIN',
    'CLIENT_USER',
  )
  @Get('tenant')
  async findAllByTenant(
    @Req() req: AuthenticatedRequest,
  ) {
    if (
      req.user.role ===
      'CLIENT_USER'
    ) {
      return this.userService.findWorkspaceIdentity(
        req.user.userId,
        req.user.tenantId,
      );
    }

    return this.userService.findAllByTenant(
      req.user.tenantId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CLIENT_ADMIN')
  @Post()
  async create(
    @Req() req: AuthenticatedRequest,
    @Body() body: CreateUserDto,
  ) {
    return this.userService.create(
      {
        userId:
          req.user.userId,
        email:
          req.user.email,
        role:
          req.user.role,
      },
      req.user.tenantId,
      body.email,
      body.firstName,
      body.lastName,
      body.password,
      body.role,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CLIENT_ADMIN')
  @Patch(':id/access')
  async updateAccess(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: UpdateUserAccessDto,
  ) {
    return this.userService.updateAccess(
      {
        userId:
          req.user.userId,
        email:
          req.user.email,
        role:
          req.user.role,
      },
      req.user.tenantId,
      id,
      body,
    );
  }

  /*
   * Enterprise-safe DELETE semantics:
   * preserve the identity/audit record and revoke access.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CLIENT_ADMIN')
  @Delete(':id')
  async deactivate(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.userService.deactivate(
      {
        userId:
          req.user.userId,
        email:
          req.user.email,
        role:
          req.user.role,
      },
      req.user.tenantId,
      id,
    );
  }
}
