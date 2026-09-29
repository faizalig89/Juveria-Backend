import {
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class GoogleCredentialDto {
  @IsString()
  @MinLength(100)
  @MaxLength(12000)
  credential!: string;
}
