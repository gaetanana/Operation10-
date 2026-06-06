import { TodoService } from './todo.service';
import { CreateTodoDto, UpdateTodoDto } from './todo.dto';
export declare class TodoController {
    private readonly service;
    constructor(service: TodoService);
    findAll(date?: string): Promise<import("./todo.entity").Todo[]>;
    findOne(id: string): Promise<import("./todo.entity").Todo>;
    create(body: CreateTodoDto): Promise<import("./todo.entity").Todo>;
    update(id: string, body: UpdateTodoDto): Promise<import("./todo.entity").Todo>;
    toggle(id: string): Promise<import("./todo.entity").Todo>;
    remove(id: string): Promise<void>;
}
