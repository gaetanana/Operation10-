import { SessionType } from './sport.entity';
export declare class CreateTemplateDto {
    name: string;
    type: SessionType;
    dayOfWeek: number;
    durationMinutes?: number;
    description?: string;
}
export declare class UpdateTemplateDto {
    name?: string;
    type?: SessionType;
    dayOfWeek?: number;
    durationMinutes?: number;
    description?: string;
}
export declare class ExerciseDto {
    name: string;
    sets?: number;
    reps?: number;
    weight?: number;
    restSeconds?: number;
    durationSeconds?: number;
    distanceKm?: number;
    avgSpeedKmh?: number;
    notes?: string;
}
export declare class UpdateExerciseDto extends ExerciseDto {
}
export declare class CreateSessionDto {
    templateId?: string;
    name: string;
    type: SessionType;
    date: string;
    durationMinutes?: number;
    notes?: string;
}
export declare class UpdateSessionDto {
    name?: string;
    type?: SessionType;
    date?: string;
    durationMinutes?: number;
    notes?: string;
}
