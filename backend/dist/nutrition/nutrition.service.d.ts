import { Repository } from 'typeorm';
import { Meal } from './nutrition.entity';
export declare class NutritionService {
    private repo;
    constructor(repo: Repository<Meal>);
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
