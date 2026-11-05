export declare enum SessionType {
    PECS_TRICEPS = "pecs_triceps",
    DOS_BICEPS = "dos_biceps",
    EPAULES = "epaules",
    JAMBES = "jambes",
    BRAS_ABDOS = "bras_abdos",
    CARDIO = "cardio",
    EMOM = "emom",
    CIRCUIT = "circuit",
    OTHER = "other"
}
export declare class SessionTemplate {
    id: string;
    name: string;
    type: SessionType;
    dayOfWeek: number;
    weeklyTarget: number;
    durationMinutes: number;
    description: string;
    templateExercises: {
        id: string;
        name: string;
        sets?: number;
        reps?: number;
        weight?: number;
        restSeconds?: number;
        distanceKm?: number;
        avgSpeedKmh?: number;
        notes?: string;
    }[];
}
export declare class Session {
    id: string;
    templateId: string;
    name: string;
    type: SessionType;
    date: string;
    durationMinutes: number;
    notes: string;
    exercises: Exercise[];
    createdAt: Date;
}
export declare class Exercise {
    id: string;
    sessionId: string;
    session: Session;
    name: string;
    sets: number;
    reps: number;
    weight: number;
    durationSeconds: number;
    restSeconds: number;
    distanceKm: number;
    avgSpeedKmh: number;
    notes: string;
    order: number;
    createdAt: Date;
}
