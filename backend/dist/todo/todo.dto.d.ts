import { TodoCategory } from './todo.entity';
export declare class CreateTodoDto {
    title: string;
    category?: TodoCategory;
    isRecurring?: boolean;
    dueDate?: string;
}
export declare class UpdateTodoDto {
    title?: string;
    completed?: boolean;
    category?: TodoCategory;
    isRecurring?: boolean;
    dueDate?: string;
}
