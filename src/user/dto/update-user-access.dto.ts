import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateUserAccessDto {
  @IsOptional()
  @IsString()
  @IsIn([
    'CLIENT_ADMIN',
    'CLIENT_USER',
  ])
  role?:
    | 'CLIENT_ADMIN'
    | 'CLIENT_USER';

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
