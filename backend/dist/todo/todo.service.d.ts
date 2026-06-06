import { Repository } from 'typeorm';
import { Todo } from './todo.entity';
export declare class TodoService {
    private repo;
    constructor(repo: Repository<Todo>);
    findAll(date?: string): Promise<Todo[]>;
    findOne(id: string): Promise<Todo | null>;
    create(data: Partial<Todo>): Promise<Todo>;
    update(id: string, data: Partial<Todo>): Promise<Todo>;
    remove(id: string): Promise<void>;
    toggleComplete(id: string): Promise<Todo>;
}
