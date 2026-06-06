import { NutritionService } from './nutrition.service';
import { CreateMealDto, UpdateMealDto, AnalyzeImageDto } from './nutrition.dto';
export declare class NutritionController {
    private readonly service;
    constructor(service: NutritionService);
    findByDate(date: string): Promise<import("./nutrition.entity").Meal[]>;
    getDailyTotals(date: string): Promise<{
        calories: number;
        proteins: number;
        carbs: number;
        fats: number;
    }>;
    searchFood(q: string): Promise<{
        name: string;
        calories: number;
        proteins: number;
        carbs: number;
        fats: number;
    }[]>;
    create(body: CreateMealDto): Promise<import("./nutrition.entity").Meal>;
    update(id: string, body: UpdateMealDto): Promise<import("./nutrition.entity").Meal>;
    remove(id: string): Promise<void>;
    analyzeImage(body: AnalyzeImageDto): Promise<any>;
}
