import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Meal, MealFavorite, NutritionSettings, NutritionRoutineDay } from './nutrition.entity';
import { NutritionService } from './nutrition.service';
import { NutritionController } from './nutrition.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Meal, MealFavorite, NutritionSettings, NutritionRoutineDay])],
  providers: [NutritionService],
  controllers: [NutritionController],
})
export class NutritionModule {}
