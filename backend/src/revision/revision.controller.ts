import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { RevisionService } from './revision.service';
import {
  CreateSubjectDto,
  UpdateSubjectDto,
  CreateSheetDto,
  UpdateSheetDto,
  CreateFlashcardDto,
  UpdateFlashcardDto,
  ReviewDto,
  CheckAnswerDto,
  GenerateCardsDto,
  GenerateDto,
} from './revision.dto';

@ApiTags('Revision')
@Controller('revision')
export class RevisionController {
  constructor(private readonly service: RevisionService) {}

  // ─── Subjects ────────────────────────────────────────────────────────────────
  @Get('subjects')
  @ApiOperation({ summary: 'Liste des matières' })
  findSubjects() {
    return this.service.findSubjects();
  }

  @Post('subjects')
  @ApiOperation({ summary: 'Crée une matière' })
  createSubject(@Body() body: CreateSubjectDto) {
    return this.service.createSubject(body);
  }

  @Patch('subjects/:id')
  updateSubject(@Param('id') id: string, @Body() body: UpdateSubjectDto) {
    return this.service.updateSubject(id, body);
  }

  @Delete('subjects/:id')
  removeSubject(@Param('id') id: string) {
    return this.service.removeSubject(id);
  }

  @Post('subjects/:id/regenerate-cards')
  @ApiOperation({ summary: 'Régénère Tout le paquet de cartes d\'une matière (remplace)' })
  regenerateSubjectCards(@Param('id') id: string, @Body() body: GenerateCardsDto) {
    return this.service.regenerateSubjectCards(id, body.cardCount);
  }

  // ─── Sheets ──────────────────────────────────────────────────────────────────
  @Get('sheets')
  @ApiOperation({ summary: 'Fiches (filtre par subjectId possible)' })
  findSheets(@Query('subjectId') subjectId?: string) {
    return this.service.findSheets(subjectId);
  }

  @Get('sheets/:id')
  findSheet(@Param('id') id: string) {
    return this.service.findSheet(id);
  }

  @Post('sheets')
  createSheet(@Body() body: CreateSheetDto) {
    return this.service.createSheet(body);
  }

  @Post('sheets/:id/generate-cards')
  @ApiOperation({ summary: 'Génère des flashcards depuis une fiche (ajoute)' })
  generateCardsForSheet(@Param('id') id: string, @Body() body: GenerateCardsDto) {
    return this.service.generateCardsForSheet(id, body.cardCount);
  }

  @Patch('sheets/:id')
  updateSheet(@Param('id') id: string, @Body() body: UpdateSheetDto) {
    return this.service.updateSheet(id, body);
  }

  @Delete('sheets/:id')
  removeSheet(@Param('id') id: string) {
    return this.service.removeSheet(id);
  }

  // ─── Flashcards ──────────────────────────────────────────────────────────────
  @Get('flashcards')
  @ApiOperation({ summary: 'Cartes (filtre par subjectId possible)' })
  findCards(@Query('subjectId') subjectId?: string) {
    return this.service.findCards(subjectId);
  }

  @Get('flashcards/due')
  @ApiOperation({ summary: 'Cartes à réviser aujourd\'hui' })
  findDueCards(@Query('subjectId') subjectId?: string) {
    return this.service.findDueCards(subjectId);
  }

  @Post('flashcards')
  createCard(@Body() body: CreateFlashcardDto) {
    return this.service.createCard(body);
  }

  @Patch('flashcards/:id')
  updateCard(@Param('id') id: string, @Body() body: UpdateFlashcardDto) {
    return this.service.updateCard(id, body);
  }

  @Patch('flashcards/:id/review')
  @ApiOperation({ summary: 'Note une carte (SM-2) et reprogramme son échéance' })
  review(@Param('id') id: string, @Body() body: ReviewDto) {
    return this.service.review(id, body.grade);
  }

  @Post('flashcards/:id/check')
  @ApiOperation({ summary: 'Valide une réponse libre via Claude' })
  check(@Param('id') id: string, @Body() body: CheckAnswerDto) {
    return this.service.checkAnswer(id, body.userAnswer);
  }

  @Delete('flashcards/:id')
  removeCard(@Param('id') id: string) {
    return this.service.removeCard(id);
  }

  // ─── Génération IA ──────────────────────────────────────────────────────────────
  @Post('generate')
  @ApiOperation({ summary: 'Génère une fiche + flashcards via Claude' })
  generate(@Body() body: GenerateDto) {
    return this.service.generate(body);
  }
}
