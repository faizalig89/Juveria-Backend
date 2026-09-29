import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { CreateTenantDto } from './create-tenant.dto.js';

export class OnboardTenantDto extends CreateTenantDto {
  @IsEmail()
  @MaxLength(254)
  adminEmail!: string;

  @IsString()
  @MaxLength(120)
  @Matches(/\S/, {
    message: 'adminFirstName must not be blank',
  })
  adminFirstName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  adminLastName?: string;

  @IsString()
  @MinLength(12)
  @MaxLength(72)
  @Matches(/\S/, {
    message: 'adminPassword must not contain only whitespace',
  })
  adminPassword!: string;
}
