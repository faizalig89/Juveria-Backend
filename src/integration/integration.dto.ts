import {
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  Transform,
} from 'class-transformer';
import {
  INTEGRATION_AUTH_TYPES,
  INTEGRATION_PROVIDERS,
} from './integration.types.js';
import type {
  IntegrationAuthType,
  IntegrationProvider,
} from './integration.types.js';

export class CreateIntegrationConnectionDto {
  @IsIn(INTEGRATION_PROVIDERS)
  provider!: IntegrationProvider;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsUrl({
    require_protocol: true,
    protocols: ['https'],
  })
  @MaxLength(500)
  baseUrl!: string;

  @IsIn(INTEGRATION_AUTH_TYPES)
  authType!: IntegrationAuthType;

  @IsObject()
  config!: Record<string, unknown>;

  @IsObject()
  credentials!: Record<string, unknown>;
}

export class UpdateIntegrationConnectionDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsUrl({
    require_protocol: true,
    protocols: ['https'],
  })
  @MaxLength(500)
  baseUrl?: string;

  @IsOptional()
  @IsIn(INTEGRATION_AUTH_TYPES)
  authType?: IntegrationAuthType;

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  credentials?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class SyncIntegrationInvoicesDto {
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined ||
    value === null ||
    value === ''
      ? undefined
      : Number(value),
  )
  @IsInt()
  @Min(1)
  @Max(25)
  limit?: number;
}

export class SyncSubmissionStatusesDto {
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined ||
    value === null ||
    value === ''
      ? undefined
      : Number(value),
  )
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
