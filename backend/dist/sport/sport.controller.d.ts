import { SportService } from './sport.service';
import { CreateTemplateDto, UpdateTemplateDto, CreateSessionDto, UpdateSessionDto, ExerciseDto, UpdateExerciseDto } from './sport.dto';
export declare class SportController {
    private readonly service;
    constructor(service: SportService);
    findTemplates(): Promise<import("./sport.entity").SessionTemplate[]>;
    createTemplate(body: CreateTemplateDto): Promise<import("./sport.entity").SessionTemplate>;
    updateTemplate(id: string, body: UpdateTemplateDto): Promise<import("./sport.entity").SessionTemplate>;
    removeTemplate(id: string): Promise<void>;
    findSessions(from?: string, to?: string): Promise<import("./sport.entity").Session[]>;
    findSession(id: string): Promise<import("./sport.entity").Session>;
    createSession(body: CreateSessionDto): Promise<import("./sport.entity").Session>;
    updateSession(id: string, body: UpdateSessionDto): Promise<import("./sport.entity").Session>;
    removeSession(id: string): Promise<void>;
    addTemplateExercise(id: string, body: ExerciseDto): Promise<import("./sport.entity").SessionTemplate>;
    updateTemplateExercise(id: string, exId: string, body: ExerciseDto): Promise<import("./sport.entity").SessionTemplate>;
    removeTemplateExercise(id: string, exId: string): Promise<import("./sport.entity").SessionTemplate>;
    addExercise(id: string, body: ExerciseDto): Promise<import("./sport.entity").Exercise>;
    updateExercise(exerciseId: string, body: UpdateExerciseDto): Promise<import("./sport.entity").Exercise>;
    removeExercise(exerciseId: string): Promise<void>;
    getStats(): Promise<{
        total: number;
        thisMonth: number;
        thisWeek: number;
        byType: Record<string, number>;
        totalExercises: number;
        last8Weeks: {
            week: string;
            count: number;
        }[];
    }>;
    getStrengthProgress(exercise?: string): Promise<{
        name: string;
        data: {
            date: string;
            weight: number;
        }[];
    }[]>;
}
