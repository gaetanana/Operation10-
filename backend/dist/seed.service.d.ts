import { OnApplicationBootstrap } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Todo } from './todo/todo.entity';
import { SessionTemplate } from './sport/sport.entity';
export declare class SeedService implements OnApplicationBootstrap {
    private todoRepo;
    private templateRepo;
    private readonly logger;
    constructor(todoRepo: Repository<Todo>, templateRepo: Repository<SessionTemplate>);
    onApplicationBootstrap(): Promise<void>;
    private seedTodos;
    private seedTemplates;
    private recreateRecurringTodos;
    private migrateTemplates;
}
