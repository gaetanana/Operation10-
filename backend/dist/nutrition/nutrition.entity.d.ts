export declare enum MealType {
    BREAKFAST = "breakfast",
    LUNCH = "lunch",
    DINNER = "dinner",
    SNACK = "snack"
}
export declare class Meal {
    id: string;
    name: string;
    date: string;
    calories: number;
    proteins: number;
    carbs: number;
    fats: number;
    mealType: MealType;
    imageUrl: string;
    items: {
        name: string;
        quantity: string;
        calories: number;
        proteins: number;
        carbs: number;
        fats: number;
    }[];
    createdAt: Date;
}
export declare class MealFavorite {
    id: string;
    name: string;
    entries: {
        name: string;
        mealType: MealType;
        calories: number;
        proteins: number;
        carbs: number;
        fats: number;
    }[];
    createdAt: Date;
}
