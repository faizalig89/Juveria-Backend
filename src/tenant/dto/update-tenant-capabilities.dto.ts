import {
  IsBoolean,
  IsIn,
  IsOptional,
} from 'class-validator';

const TENANT_ACCESS_STATUSES = [
  'DEMO',
  'TRIAL_ACTIVE',
  'TRIAL_EXPIRED',
  'PAID_ACTIVE',
  'SUSPENDED',
] as const;

export class UpdateTenantCapabilitiesDto {
  @IsOptional()
  @IsBoolean()
  erpEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  productionEnabled?: boolean;

  @IsOptional()
  @IsIn(TENANT_ACCESS_STATUSES)
  accessStatus?:
    | 'DEMO'
    | 'TRIAL_ACTIVE'
    | 'TRIAL_EXPIRED'
    | 'PAID_ACTIVE'
    | 'SUSPENDED';
}
