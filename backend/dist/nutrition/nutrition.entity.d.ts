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
