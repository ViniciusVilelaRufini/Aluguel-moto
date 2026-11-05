import { Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export type TrackerConsoleRisk = 'read' | 'change' | 'connection';

/** `SendTrackerConsoleRequest`. A política do texto (regex, risco, recusados) fica em `console-policy.ts`. */
export class SendTrackerConsoleDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  text: string;

  @IsOptional()
  @IsBoolean()
  confirm?: boolean;
}

/** `GET /vehicles/{id}/tracker-console`. */
export class ListTrackerConsoleQuery {
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
