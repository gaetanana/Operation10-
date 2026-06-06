export declare enum TodoCategory {
    DAILY = "daily",
    STAGE = "stage"
}
export declare class Todo {
    id: string;
    title: string;
    completed: boolean;
    category: TodoCategory;
    isRecurring: boolean;
    createdAt: Date;
    dueDate: string;
}
