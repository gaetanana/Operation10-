export declare class CreateSubjectDto {
    name: string;
    icon?: string;
    color?: string;
}
export declare class UpdateSubjectDto {
    name?: string;
    icon?: string;
    color?: string;
}
export declare class CreateSheetDto {
    subjectId: string;
    title: string;
    content?: string;
}
export declare class UpdateSheetDto {
    title?: string;
    content?: string;
}
export declare class CreateFlashcardDto {
    subjectId: string;
    sheetId?: string;
    question: string;
    answer: string;
}
export declare class UpdateFlashcardDto {
    question?: string;
    answer?: string;
}
export declare class ReviewDto {
    grade: number;
}
export declare class CheckAnswerDto {
    userAnswer: string;
}
export declare class GenerateCardsDto {
    cardCount?: number;
}
export declare class GenerateDto {
    subjectId?: string;
    subjectName?: string;
    topic: string;
    sourceText?: string;
    cardCount?: number;
}
