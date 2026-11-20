import { IsString, IsNumber, IsOptional, IsEnum, IsDateString, IsArray, ValidateNested, Min, MinLength, IsIn, IsPositive, ArrayMinSize, ArrayMaxSize, IsBoolean, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
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

  @IsOptional() @IsNumber() @IsPositive() quantityGrams?: number | null;
  @IsOptional() @IsIn(['manual', 'search', 'photo']) source?: string | null;
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

  @IsOptional() @IsNumber() @IsPositive() quantityGrams?: number | null;
  @IsOptional() @IsIn(['manual', 'search', 'photo']) source?: string | null;
}

export class CreateMealsDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(30)
  @ValidateNested({ each: true }) @Type(() => CreateMealDto)
  meals: CreateMealDto[];
}

export class AnalyzeImageDto {
  @IsString()
  base64: string;

  @IsOptional()
  @IsString()
  mediaType?: string;

  @IsOptional() @IsString() @MaxLength(1000)
  note?: string;
}

export class ShakerPortionDto {
  @IsString() @MinLength(1) @MaxLength(100) name: string;
  @IsNumber() @IsPositive() quantityGrams: number;
  @IsNumber() @Min(0) proteins: number;
  @IsOptional() @IsNumber() @Min(0) calories?: number | null;
  @IsOptional() @IsNumber() @Min(0) carbs?: number | null;
  @IsOptional() @IsNumber() @Min(0) fats?: number | null;
}

export class ConfirmShakerDto {
  @IsDateString() date: string;
  @IsBoolean() taken: boolean;
}

export class CreatineEntryDto {
  @IsDateString() date: string;
  @IsNumber() @Min(0) grams: number;
}

// ─── Favoris / combos ───────────────────────────────────────────────────────────
export class FavoriteEntryDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsEnum(MealType)
  mealType?: MealType;

  @IsOptional() @IsNumber() @Min(0) calories?: number;
  @IsOptional() @IsNumber() @Min(0) proteins?: number;
  @IsOptional() @IsNumber() @Min(0) carbs?: number;
  @IsOptional() @IsNumber() @Min(0) fats?: number;
  @IsOptional() @IsNumber() @IsPositive() quantityGrams?: number | null;
  @IsOptional() @IsIn(['manual', 'search', 'photo']) source?: string | null;
  @IsOptional() @IsArray() items?: CreateMealDto['items'];
}

export class CreateFavoriteDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FavoriteEntryDto)
  entries: FavoriteEntryDto[];
}

export class RenameFavoriteDto {
  @IsString() @MinLength(1) name: string;
}

export class DuplicateDayDto {
  @IsDateString()
  from: string;

  @IsDateString()
  to: string;
}

export class NutritionGoalsDto {
  @IsOptional() @IsNumber() @Min(0) caloriesGoal?: number | null;
  @IsOptional() @IsNumber() @Min(0) proteinsGoal?: number | null;
}
