import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Meal, MealFavorite } from './nutrition.entity';
import { NutritionService } from './nutrition.service';
import { NutritionController } from './nutrition.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Meal, MealFavorite])],
  providers: [NutritionService],
  controllers: [NutritionController],
})
export class NutritionModule {}
