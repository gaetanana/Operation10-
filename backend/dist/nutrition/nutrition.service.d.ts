import { Repository } from 'typeorm';
import { Meal, MealFavorite } from './nutrition.entity';
export declare class NutritionService {
    private repo;
    private favRepo;
    constructor(repo: Repository<Meal>, favRepo: Repository<MealFavorite>);
    findFavorites(): Promise<MealFavorite[]>;
    createFavorite(data: Partial<MealFavorite>): Promise<MealFavorite>;
    removeFavorite(id: string): Promise<void>;
    applyFavorite(id: string, date: string): Promise<Meal[]>;
    duplicateDay(from: string, to: string): Promise<Meal[]>;
    getRecent(limit?: number): Promise<{
        name: string;
        calories: number;
        proteins: number;
        carbs: number;
        fats: number;
    }[]>;
    findByDate(date: string): Promise<Meal[]>;
    create(data: Partial<Meal>): Promise<Meal>;
    update(id: string, data: Partial<Meal>): Promise<Meal>;
    remove(id: string): Promise<void>;
    getDailyTotals(date: string): Promise<{
        calories: number;
        proteins: number;
        carbs: number;
        fats: number;
    }>;
    searchFood(query: string): Promise<{
        name: string;
        calories: number;
        proteins: number;
        carbs: number;
        fats: number;
    }[]>;
    analyzeImage(base64Image: string, mediaType: string): Promise<any>;
}
