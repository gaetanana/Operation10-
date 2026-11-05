import {
  IsString,
  IsOptional,
  IsUUID,
  IsInt,
  Min,
  Max,
  MinLength,
} from 'class-validator';

// ─── Subject ──────────────────────────────────────────────────────────────────
export class CreateSubjectDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsString()
  color?: string;
}

export class UpdateSubjectDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsString()
  color?: string;
}

// ─── Sheet ────────────────────────────────────────────────────────────────────
export class CreateSheetDto {
  @IsUUID()
  subjectId: string;

  @IsString()
  @MinLength(1)
  title: string;

  @IsOptional()
  @IsString()
  content?: string;
}

export class UpdateSheetDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;
}

// ─── Flashcard ────────────────────────────────────────────────────────────────
export class CreateFlashcardDto {
  @IsUUID()
  subjectId: string;

  @IsOptional()
  @IsUUID()
  sheetId?: string;

  @IsString()
  @MinLength(1)
  question: string;

  @IsString()
  @MinLength(1)
  answer: string;
}

export class UpdateFlashcardDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  question?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  answer?: string;
}

// Note d'évaluation lors d'une révision (mapping SM-2) :
// 0 = Again (oublié), 3 = Hard, 4 = Good, 5 = Easy
export class ReviewDto {
  @IsInt()
  @Min(0)
  @Max(5)
  grade: number;
}

// Validation d'une réponse libre par Claude
export class CheckAnswerDto {
  @IsString()
  @MinLength(1)
  userAnswer: string;
}

// Génération / régénération de flashcards (depuis une fiche ou une matière)
export class GenerateCardsDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  cardCount?: number;
}

// ─── Génération IA ──────────────────────────────────────────────────────────────
export class GenerateDto {
  // Soit une matière existante…
  @IsOptional()
  @IsUUID()
  subjectId?: string;

  // …soit le nom d'une nouvelle matière à créer
  @IsOptional()
  @IsString()
  subjectName?: string;

  // Le sujet précis de la fiche (ex. « find et les redirections »)
  @IsString()
  @MinLength(1)
  topic: string;

  // Texte de cours brut à synthétiser (optionnel)
  @IsOptional()
  @IsString()
  sourceText?: string;

  // Nombre de flashcards souhaitées (défaut 10)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  cardCount?: number;
}
