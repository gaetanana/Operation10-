import { Repository } from 'typeorm';
import { Session, SessionTemplate, Exercise } from './sport.entity';
export declare class SportService {
    private sessionRepo;
    private templateRepo;
    private exerciseRepo;
    constructor(sessionRepo: Repository<Session>, templateRepo: Repository<SessionTemplate>, exerciseRepo: Repository<Exercise>);
    findAllTemplates(): Promise<SessionTemplate[]>;
    createTemplate(data: Partial<SessionTemplate>): Promise<SessionTemplate>;
    updateTemplate(id: string, data: Partial<SessionTemplate>): Promise<SessionTemplate>;
    removeTemplate(id: string): Promise<void>;
    findAllSessions(from?: string, to?: string): Promise<Session[]>;
    findSessionById(id: string): Promise<Session>;
    createSession(data: Partial<Session>): Promise<Session>;
    updateSession(id: string, data: Partial<Session>): Promise<Session>;
    removeSession(id: string): Promise<void>;
    addExercise(sessionId: string, data: Partial<Exercise>): Promise<Exercise>;
    addTemplateExercise(templateId: string, data: any): Promise<SessionTemplate>;
    updateTemplateExercise(templateId: string, exId: string, data: any): Promise<SessionTemplate>;
    removeTemplateExercise(templateId: string, exId: string): Promise<SessionTemplate>;
    updateExercise(exerciseId: string, data: Partial<Exercise>): Promise<Exercise>;
    removeExercise(exerciseId: string): Promise<void>;
    getStrengthProgress(exerciseName?: string): Promise<{
        name: string;
        data: {
            date: string;
            weight: number;
        }[];
    }[]>;
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
}
