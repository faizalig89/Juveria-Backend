import {
  IsString,
  Matches,
} from 'class-validator';

export class ConfirmMfaEnrollmentDto {
  @IsString()
  @Matches(/^\d{6}$/, {
    message: 'code must be a 6-digit authenticator code',
  })
  code!: string;
}
