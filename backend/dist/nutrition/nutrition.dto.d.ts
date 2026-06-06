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
