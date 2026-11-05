import { Repository } from 'typeorm';
import { Subject, Sheet, Flashcard } from './revision.entity';
import { CreateSubjectDto, UpdateSubjectDto, CreateSheetDto, UpdateSheetDto, CreateFlashcardDto, UpdateFlashcardDto, GenerateDto } from './revision.dto';
export declare class RevisionService {
    private subjectRepo;
    private sheetRepo;
    private cardRepo;
    constructor(subjectRepo: Repository<Subject>, sheetRepo: Repository<Sheet>, cardRepo: Repository<Flashcard>);
    findSubjects(): Promise<Subject[]>;
    createSubject(dto: CreateSubjectDto): Promise<Subject>;
    updateSubject(id: string, dto: UpdateSubjectDto): Promise<Subject>;
    removeSubject(id: string): Promise<void>;
    findSheets(subjectId?: string): Promise<Sheet[]>;
    findSheet(id: string): Promise<Sheet>;
    createSheet(dto: CreateSheetDto): Promise<Sheet>;
    updateSheet(id: string, dto: UpdateSheetDto): Promise<Sheet>;
    removeSheet(id: string): Promise<void>;
    findCards(subjectId?: string): Promise<Flashcard[]>;
    findDueCards(subjectId?: string): Promise<Flashcard[]>;
    createCard(dto: CreateFlashcardDto): Promise<Flashcard>;
    updateCard(id: string, dto: UpdateFlashcardDto): Promise<Flashcard>;
    removeCard(id: string): Promise<void>;
    review(id: string, grade: number): Promise<Flashcard>;
    private requireApiKey;
    private callCards;
    generateCardsForSheet(sheetId: string, cardCount?: number): Promise<Flashcard[]>;
    regenerateSubjectCards(subjectId: string, cardCount?: number): Promise<Flashcard[]>;
    checkAnswer(id: string, userAnswer: string): Promise<{
        verdict: 'ok' | 'mid' | 'no';
        note: string;
    }>;
    generate(dto: GenerateDto): Promise<{
        subject: Subject;
        sheet: Sheet;
        flashcards: Flashcard[];
    }>;
}
