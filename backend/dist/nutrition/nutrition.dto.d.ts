import { MealType } from './nutrition.entity';
export declare class CreateMealDto {
    name: string;
    date: string;
    calories?: number;
    proteins?: number;
    carbs?: number;
    fats?: number;
    mealType?: MealType;
    imageUrl?: string;
    items?: {
        name: string;
        quantity: string;
        calories: number;
        proteins: number;
        carbs: number;
        fats: number;
    }[];
}
export declare class UpdateMealDto {
    name?: string;
    calories?: number;
    proteins?: number;
    carbs?: number;
    fats?: number;
    mealType?: MealType;
}
export declare class AnalyzeImageDto {
    base64: string;
    mediaType?: string;
}
export declare class FavoriteEntryDto {
    name: string;
    mealType?: MealType;
    calories?: number;
    proteins?: number;
    carbs?: number;
    fats?: number;
}
export declare class CreateFavoriteDto {
    name: string;
    entries: FavoriteEntryDto[];
}
export declare class DuplicateDayDto {
    from: string;
    to: string;
}
