import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { NutritionService } from './nutrition.service';
import { CreateMealDto, UpdateMealDto, AnalyzeImageDto, CreateFavoriteDto, DuplicateDayDto } from './nutrition.dto';

@ApiTags('Nutrition')
@Controller('nutrition')
export class NutritionController {
  constructor(private readonly service: NutritionService) {}

  @Get('meals')
  @ApiOperation({ summary: 'Repas du jour (param: date YYYY-MM-DD)' })
  findByDate(@Query('date') date: string) {
    return this.service.findByDate(date);
  }

  @Get('totals')
  @ApiOperation({ summary: 'Macros totaux d\'une journée' })
  getDailyTotals(@Query('date') date: string) {
    return this.service.getDailyTotals(date);
  }

  @Get('search')
  @ApiOperation({ summary: 'Recherche aliment via Open Food Facts' })
  searchFood(@Query('q') q: string) {
    return this.service.searchFood(q);
  }

  @Post('meals')
  create(@Body() body: CreateMealDto) { return this.service.create(body); }

  @Patch('meals/:id')
  update(@Param('id') id: string, @Body() body: UpdateMealDto) { return this.service.update(id, body); }

  @Delete('meals/:id')
  remove(@Param('id') id: string) { return this.service.remove(id); }

  @Post('analyze-image')
  @ApiOperation({ summary: 'Analyse une photo de repas ou d\'emballage via Claude Vision' })
  analyzeImage(@Body() body: AnalyzeImageDto) {
    return this.service.analyzeImage(body.base64, body.mediaType || 'image/jpeg');
  }

  // ─── Ajout rapide : favoris, duplication, récents ──────────────────────────────
  @Get('favorites')
  @ApiOperation({ summary: 'Liste des repas favoris / combos' })
  findFavorites() { return this.service.findFavorites(); }

  @Post('favorites')
  createFavorite(@Body() body: CreateFavoriteDto) { return this.service.createFavorite(body as any); }

  @Delete('favorites/:id')
  removeFavorite(@Param('id') id: string) { return this.service.removeFavorite(id); }

  @Post('favorites/:id/apply')
  @ApiOperation({ summary: 'Applique un favori à une date (param: date)' })
  applyFavorite(@Param('id') id: string, @Query('date') date: string) {
    return this.service.applyFavorite(id, date);
  }

  @Post('duplicate')
  @ApiOperation({ summary: 'Duplique les repas d\'un jour vers un autre' })
  duplicateDay(@Body() body: DuplicateDayDto) {
    return this.service.duplicateDay(body.from, body.to);
  }

  @Get('recent')
  @ApiOperation({ summary: 'Aliments récents distincts (réutilisation rapide)' })
  getRecent() { return this.service.getRecent(); }
}
