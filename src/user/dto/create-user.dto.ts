import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(12)
  password!: string;

  @IsString()
  @IsIn([
    'CLIENT_ADMIN',
    'CLIENT_USER',
  ])
  role!:
    | 'CLIENT_ADMIN'
    | 'CLIENT_USER';
}
