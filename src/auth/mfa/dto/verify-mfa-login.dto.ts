import {
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class VerifyMfaLoginDto {
  @IsString()
  @MinLength(32)
  challengeToken!: string;

  @IsString()
  @Matches(/^\d{6}$/, {
    message: 'code must be a 6-digit authenticator code',
  })
  code!: string;
}
