import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsUUID, Matches } from 'class-validator';
import { TRACKER_MODELS, type TrackerModelValue } from './trackers.mapper';

const toBool = ({ value }: { value: unknown }) => (value === undefined ? undefined : value === true || value === 'true');

/** `GET /trackers`. */
export class ListTrackersQuery {
  @IsOptional()
  @Matches(/^[0-9]{1,15}$/)
  q?: string;

  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  installed?: boolean;

  @IsOptional()
  @IsUUID()
  vehicleId?: string;
}

/** `CreateTrackerRequest`. */
export class CreateTrackerDto {
  @Matches(/^[0-9]{15}$/)
  imei: string;

  @IsIn(TRACKER_MODELS)
  model: TrackerModelValue;

  @IsOptional()
  @IsUUID()
  simCardId?: string;
}

/** `InstallTrackerRequest`. */
export class InstallTrackerDto {
  @IsUUID()
  trackerId: string;
}
