import { IsString, IsNumber, IsOptional, IsEnum, IsDateString, IsArray, Min, MinLength } from 'class-validator';
import { MealType } from './nutrition.entity';

export class CreateMealDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsDateString()
  date: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  calories?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  proteins?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  carbs?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  fats?: number;

  @IsOptional()
  @IsEnum(MealType)
  mealType?: MealType;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsArray()
  items?: {
    name: string;
    quantity: string;
    calories: number;
    proteins: number;
    carbs: number;
    fats: number;
  }[];
}

export class UpdateMealDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  calories?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  proteins?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  carbs?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  fats?: number;

  @IsOptional()
  @IsEnum(MealType)
  mealType?: MealType;
}

export class AnalyzeImageDto {
  @IsString()
  base64: string;

  @IsOptional()
  @IsString()
  mediaType?: string;
}
