import { RevisionService } from './revision.service';
import { CreateSubjectDto, UpdateSubjectDto, CreateSheetDto, UpdateSheetDto, CreateFlashcardDto, UpdateFlashcardDto, ReviewDto, CheckAnswerDto, GenerateCardsDto, GenerateDto } from './revision.dto';
export declare class RevisionController {
    private readonly service;
    constructor(service: RevisionService);
    findSubjects(): Promise<import("./revision.entity").Subject[]>;
    createSubject(body: CreateSubjectDto): Promise<import("./revision.entity").Subject>;
    updateSubject(id: string, body: UpdateSubjectDto): Promise<import("./revision.entity").Subject>;
    removeSubject(id: string): Promise<void>;
    regenerateSubjectCards(id: string, body: GenerateCardsDto): Promise<import("./revision.entity").Flashcard[]>;
    findSheets(subjectId?: string): Promise<import("./revision.entity").Sheet[]>;
    findSheet(id: string): Promise<import("./revision.entity").Sheet>;
    createSheet(body: CreateSheetDto): Promise<import("./revision.entity").Sheet>;
    generateCardsForSheet(id: string, body: GenerateCardsDto): Promise<import("./revision.entity").Flashcard[]>;
    updateSheet(id: string, body: UpdateSheetDto): Promise<import("./revision.entity").Sheet>;
    removeSheet(id: string): Promise<void>;
    findCards(subjectId?: string): Promise<import("./revision.entity").Flashcard[]>;
    findDueCards(subjectId?: string): Promise<import("./revision.entity").Flashcard[]>;
    createCard(body: CreateFlashcardDto): Promise<import("./revision.entity").Flashcard>;
    updateCard(id: string, body: UpdateFlashcardDto): Promise<import("./revision.entity").Flashcard>;
    review(id: string, body: ReviewDto): Promise<import("./revision.entity").Flashcard>;
    check(id: string, body: CheckAnswerDto): Promise<{
        verdict: "ok" | "mid" | "no";
        note: string;
    }>;
    removeCard(id: string): Promise<void>;
    generate(body: GenerateDto): Promise<{
        subject: import("./revision.entity").Subject;
        sheet: import("./revision.entity").Sheet;
        flashcards: import("./revision.entity").Flashcard[];
    }>;
}
