export declare class Subject {
    id: string;
    name: string;
    icon: string;
    color: string;
    trainerKey: string | null;
    createdAt: Date;
    sheets: Sheet[];
    flashcards: Flashcard[];
}
export declare class Sheet {
    id: string;
    title: string;
    content: string;
    subject: Subject;
    subjectId: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare class Flashcard {
    id: string;
    question: string;
    answer: string;
    subject: Subject;
    subjectId: string;
    sheet: Sheet | null;
    sheetId: string | null;
    repetitions: number;
    easeFactor: number;
    intervalDays: number;
    dueDate: string;
    lastReviewedAt: Date | null;
    createdAt: Date;
}
