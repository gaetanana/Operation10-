import { Controller, Get, Post, Patch, Delete, Param, Body, Query, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SportService } from './sport.service';
import { referenceProgram } from './sport.reference';
import { CreateTemplateDto, UpdateTemplateDto, CreateSessionDto, UpdateSessionDto, ExerciseDto, UpdateExerciseDto, ImportProgramDto, UpdatePersonalProgramDto } from './sport.dto';

@ApiTags('Sport')
@Controller('sport')
export class SportController {
  constructor(private readonly service: SportService) {}

  @Get('reference-program')
  getReferenceProgram() { return referenceProgram; }

  @Get('program')
  getPersonalProgram() { return this.service.getPersonalProgram(); }

  @Post('program/:key/prepare')
  preparePersonalWorkout(@Param('key', ParseIntPipe) key: number) {
    return this.service.preparePersonalWorkout(key);
  }

  @Patch('program/:key')
  updatePersonalWorkout(@Param('key', ParseIntPipe) key: number, @Body() body: UpdatePersonalProgramDto) {
    return this.service.preparePersonalWorkout(key, body);
  }

  // ─── Contrat hebdo ──────────────────────────────────────────────────────────
  @Get('templates')
  @ApiOperation({ summary: 'Programme type (contrat hebdo)' })
  findTemplates() { return this.service.findAllTemplates(); }

  @Post('templates')
  createTemplate(@Body() body: CreateTemplateDto) { return this.service.createTemplate(body); }

  @Post('templates/import')
  importProgram(@Body() body: ImportProgramDto) { return this.service.importProgram(body); }

  @Patch('templates/:id')
  updateTemplate(@Param('id') id: string, @Body() body: UpdateTemplateDto) {
    return this.service.updateTemplate(id, body);
  }

  @Delete('templates/:id')
  removeTemplate(@Param('id') id: string) { return this.service.removeTemplate(id); }

  // ─── Séances réalisées ──────────────────────────────────────────────────────
  @Get('sessions')
  @ApiOperation({ summary: 'Liste des séances réalisées (filtre from/to)' })
  findSessions(@Query('from') from?: string, @Query('to') to?: string) {
    return this.service.findAllSessions(from, to);
  }

  @Get('sessions/:id')
  findSession(@Param('id') id: string) { return this.service.findSessionById(id); }

  @Post('sessions')
  createSession(@Body() body: CreateSessionDto) { return this.service.createSession(body); }

  @Patch('sessions/:id')
  updateSession(@Param('id') id: string, @Body() body: UpdateSessionDto) {
    return this.service.updateSession(id, body);
  }

  @Delete('sessions/:id')
  removeSession(@Param('id') id: string) { return this.service.removeSession(id); }

  // ─── Exercices de template ───────────────────────────────────────────────────
  @Post('templates/:id/exercises')
  addTemplateExercise(@Param('id') id: string, @Body() body: ExerciseDto) {
    return this.service.addTemplateExercise(id, body);
  }

  @Patch('templates/:id/exercises/:exId')
  updateTemplateExercise(@Param('id') id: string, @Param('exId') exId: string, @Body() body: ExerciseDto) {
    return this.service.updateTemplateExercise(id, exId, body);
  }

  @Delete('templates/:id/exercises/:exId')
  removeTemplateExercise(@Param('id') id: string, @Param('exId') exId: string) {
    return this.service.removeTemplateExercise(id, exId);
  }

  // ─── Exercices ──────────────────────────────────────────────────────────────
  @Post('sessions/:id/exercises')
  @ApiOperation({ summary: 'Ajoute un exercice à une séance' })
  addExercise(@Param('id') id: string, @Body() body: ExerciseDto) {
    return this.service.addExercise(id, body);
  }

  @Patch('exercises/:exerciseId')
  updateExercise(@Param('exerciseId') exerciseId: string, @Body() body: UpdateExerciseDto) {
    return this.service.updateExercise(exerciseId, body);
  }

  @Delete('exercises/:exerciseId')
  removeExercise(@Param('exerciseId') exerciseId: string) {
    return this.service.removeExercise(exerciseId);
  }

  // ─── Stats ──────────────────────────────────────────────────────────────────
  @Get('stats')
  @ApiOperation({ summary: 'Stats globales sport' })
  getStats() { return this.service.getStats(); }

  @Get('strength-progress')
  @ApiOperation({ summary: 'Progression des charges par exercice (≥2 points de données)' })
  getStrengthProgress(@Query('exercise') exercise?: string) {
    return this.service.getStrengthProgress(exercise);
  }
}
