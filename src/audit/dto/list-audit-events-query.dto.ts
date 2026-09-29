import {
  Transform,
} from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class ListAuditEventsQueryDto {
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
  page?: number;

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

  @IsOptional()
  @IsIn([
    'ACCESS',
    'INVOICE',
    'ASP',
    'SECURITY',
    'PLATFORM',
  ])
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  action?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  entityType?: string;

  @IsOptional()
  @IsISO8601({
    strict: true,
  })
  from?: string;

  @IsOptional()
  @IsISO8601({
    strict: true,
  })
  to?: string;
}
