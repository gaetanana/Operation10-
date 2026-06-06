import { IsString, IsNumber, IsOptional, IsEnum, IsDateString, IsArray, ValidateNested, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { SessionType } from './sport.entity';

// ─── Template ────────────────────────────────────────────────────────────────

export class CreateTemplateDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsEnum(SessionType)
  type: SessionType;

  @IsNumber()
  dayOfWeek: number; // -1 = quotidien, 0-6 = lun-dim

  @IsOptional()
  @IsNumber()
  @Min(1)
  durationMinutes?: number;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateTemplateDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsEnum(SessionType)
  type?: SessionType;

  @IsOptional()
  @IsNumber()
  dayOfWeek?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  durationMinutes?: number;

  @IsOptional()
  @IsString()
  description?: string;
}

// ─── Exercise (template JSONB ou séance réelle) ───────────────────────────────

export class ExerciseDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  sets?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  reps?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  weight?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  restSeconds?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  durationSeconds?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  distanceKm?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  avgSpeedKmh?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateExerciseDto extends ExerciseDto {}

// ─── Session ──────────────────────────────────────────────────────────────────

export class CreateSessionDto {
  @IsOptional()
  @IsString()
  templateId?: string;

  @IsString()
  @MinLength(1)
  name: string;

  @IsEnum(SessionType)
  type: SessionType;

  @IsDateString()
  date: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  durationMinutes?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateSessionDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsEnum(SessionType)
  type?: SessionType;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  durationMinutes?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
