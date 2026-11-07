import { IsString, IsNumber, IsOptional, IsEnum, IsDateString, IsArray, ValidateNested, Min, Max, MinLength, IsInt, IsUUID, ArrayMaxSize, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { SessionType } from './sport.entity';

// ─── Template ────────────────────────────────────────────────────────────────

export class CreateTemplateDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsEnum(SessionType)
  type: SessionType;

  @IsOptional()
  @IsNumber()
  dayOfWeek?: number; // déprécié

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(14)
  weeklyTarget?: number; // séances/semaine visées

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
  @Max(14)
  weeklyTarget?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  durationMinutes?: number;

  @IsOptional()
  @IsString()
  description?: string;
}

// ─── Exercise (template JSONB ou séance réelle) ───────────────────────────────

export class PerformedSetDto {
  @IsInt()
  @Min(1)
  @Max(1000)
  reps: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  weight?: number;
}

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

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => PerformedSetDto)
  performedSets?: PerformedSetDto[];

  @IsOptional()
  @IsUUID()
  templateExerciseId?: string;
}

export class UpdateExerciseDto extends ExerciseDto {}

export class ImportTemplateDto extends CreateTemplateDto {
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => ExerciseDto)
  exercises: ExerciseDto[];
}

export class ImportProgramDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(14)
  @ValidateNested({ each: true })
  @Type(() => ImportTemplateDto)
  templates: ImportTemplateDto[];
}

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

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => ExerciseDto)
  exercises?: ExerciseDto[];
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
