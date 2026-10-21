import { IsArray, IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';
import { PageQuery } from '../../common/pagination';

const CATEGORIES = ['vehicle_problem', 'accident', 'theft', 'app_problem', 'parking', 'other'] as const;
const INCIDENT_STATUSES = ['open', 'in_progress', 'resolved', 'closed'] as const;
const DISPUTE_STATUSES = ['open', 'under_review', 'accepted', 'rejected'] as const;
const CLAIM_TYPES = ['accident', 'theft', 'damage', 'personal_injury'] as const;
const CLAIM_STATUSES = ['submitted', 'under_review', 'approved', 'rejected', 'paid'] as const;

export class ListIncidentsQuery extends PageQuery {
  @IsOptional() @IsIn(INCIDENT_STATUSES) status?: (typeof INCIDENT_STATUSES)[number];
  @IsOptional() @IsUUID() customerId?: string;
  @IsOptional() @IsUUID() vehicleId?: string;
}

export class IncidentCreateDto {
  @IsIn(CATEGORIES) category: (typeof CATEGORIES)[number];
  @IsString() @MinLength(3) @MaxLength(2000) description: string;
  @IsOptional() @IsUUID() rentalId?: string;
  @IsOptional() @IsUUID() vehicleId?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) photoObjectKeys?: string[];
  @IsOptional() @IsNumber() @Min(-90) @Max(90) lat?: number;
  @IsOptional() @IsNumber() @Min(-180) @Max(180) lng?: number;
}

export class IncidentUpdateDto {
  @IsIn(INCIDENT_STATUSES) status: (typeof INCIDENT_STATUSES)[number];
  @IsOptional() @IsString() @MaxLength(2000) resolutionNote?: string;
}

export class ListDisputesQuery extends PageQuery {
  @IsOptional() @IsIn(DISPUTE_STATUSES) status?: (typeof DISPUTE_STATUSES)[number];
  @IsOptional() @IsUUID() customerId?: string;
}

export class DisputeCreateDto {
  @IsUUID() rentalId: string;
  @IsOptional() @IsUUID() paymentId?: string;
  @IsString() @MinLength(3) @MaxLength(200) reason: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
}

export class DisputeResolveDto {
  @IsIn(['accepted', 'rejected']) decision: 'accepted' | 'rejected';
  @IsString() @MinLength(3) @MaxLength(2000) resolution: string;
  @IsOptional() @IsInt() @Min(1) refundAmountCents?: number;
}

export class ListClaimsQuery extends PageQuery {
  @IsOptional() @IsIn(CLAIM_STATUSES) status?: (typeof CLAIM_STATUSES)[number];
  @IsOptional() @IsUUID() customerId?: string;
}

export class ClaimCreateDto {
  @IsUUID() rentalId: string;
  @IsOptional() @IsUUID() incidentId?: string;
  @IsIn(CLAIM_TYPES) type: (typeof CLAIM_TYPES)[number];
  @IsString() @MinLength(10) @MaxLength(4000) description: string;
  @IsDateString() occurredAt: string;
  @IsOptional() @IsNumber() @Min(-90) @Max(90) lat?: number;
  @IsOptional() @IsNumber() @Min(-180) @Max(180) lng?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) photoObjectKeys?: string[];
}

export class ClaimUpdateDto {
  @IsIn(CLAIM_STATUSES) status: (typeof CLAIM_STATUSES)[number];
  @IsOptional() @IsString() @MaxLength(2000) statusNote?: string;
}

export class ListConversationsQuery extends PageQuery {
  @IsOptional() @IsIn(['open', 'closed']) status?: 'open' | 'closed';
  @IsOptional() @IsUUID() customerId?: string;
}

export class ConversationCreateDto {
  @IsString() @MinLength(3) @MaxLength(120) subject: string;
  @IsString() @MinLength(1) @MaxLength(4000) message: string;
  @IsOptional() @IsUUID() rentalId?: string;
}

export class ConversationUpdateDto {
  @IsIn(['open', 'closed']) status: 'open' | 'closed';
}

export class ListMessagesQuery extends PageQuery {
  @IsOptional() @IsDateString() after?: string;
}

export class MessageCreateDto {
  @IsString() @MinLength(1) @MaxLength(4000) body: string;
  @IsOptional() @IsArray() @IsString({ each: true }) attachmentObjectKeys?: string[];
}
