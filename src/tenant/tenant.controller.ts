import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,

  Param,
  Patch,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { CreateTenantDto } from './dto/create-tenant.dto.js';
import { OnboardTenantDto } from './dto/onboard-tenant.dto.js';
import { UpdateTenantCapabilitiesDto } from './dto/update-tenant-capabilities.dto.js';
import { TenantService } from './tenant.service.js';

@Controller('tenant')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('PLATFORM_ADMIN')
@UsePipes(new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
}))
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Get()
  async findAll() {
    return this.tenantService.findAll();
  }

  @Post('onboard')
  async onboard(@Body() body: OnboardTenantDto) {
    return this.tenantService.onboard(body);
  }

  @Post()
  async create(@Body() body: CreateTenantDto) {
    return this.tenantService.create(body.name, body.slug);
  }
  @Patch(':id/capabilities')
  async updateCapabilities(
    @Req() req: any,
    @Param('id') id: string,
    @Body()
    body: UpdateTenantCapabilitiesDto,
  ) {
    return this.tenantService
      .updateCapabilities(
        {
          userId:
            req.user.userId,
          email:
            req.user.email,
          role:
            req.user.role,
        },
        id,
        body,
      );
  }

}
