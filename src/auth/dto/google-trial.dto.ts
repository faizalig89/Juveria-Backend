import {
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  GoogleCredentialDto,
} from './google-credential.dto.js';

export class GoogleTrialDto
extends GoogleCredentialDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  @Matches(/\S/, {
    message:
      'companyName must not be blank',
  })
  companyName!: string;
}
