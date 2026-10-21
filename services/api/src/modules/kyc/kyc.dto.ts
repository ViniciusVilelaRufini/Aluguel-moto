import { IsBoolean, IsDateString, IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { UPLOAD_CONTENT_TYPES, type UploadContentType } from '../rentals/rentals.dto';

export class KycUploadRequestDto {
  @IsIn(['rg', 'cnh', 'rne'])
  documentType: 'rg' | 'cnh' | 'rne';

  @IsIn(UPLOAD_CONTENT_TYPES)
  contentType: UploadContentType;

  @IsOptional()
  @IsBoolean()
  withBack?: boolean;
}

export class KycSubmitDto {
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  fullName: string;

  @Matches(/^\d{11}$/)
  cpf: string;

  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  birthDate: string;

  @IsIn(['rg', 'cnh', 'rne'])
  documentType: 'rg' | 'cnh' | 'rne';

  @IsString()
  @MinLength(1)
  documentFrontObjectKey: string;

  @IsOptional()
  @IsString()
  documentBackObjectKey?: string;

  @IsString()
  @MinLength(1)
  selfieObjectKey: string;

  @IsOptional()
  @IsString()
  livenessSessionId?: string;
}

export class KycReviewDto {
  @IsIn(['approved', 'rejected'])
  decision: 'approved' | 'rejected';

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason: string;
}
