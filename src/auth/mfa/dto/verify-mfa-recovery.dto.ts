import {
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class VerifyMfaRecoveryDto {
  @IsString()
  @MinLength(32)
  challengeToken!: string;

  @IsString()
  @Matches(
    /^[A-F0-9]{5}(?:-[A-F0-9]{5}){3}$/i,
    {
      message: 'recoveryCode format is invalid',
    },
  )
  recoveryCode!: string;
}
