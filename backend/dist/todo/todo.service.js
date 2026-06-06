"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TodoService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const todo_entity_1 = require("./todo.entity");
let TodoService = class TodoService {
    constructor(repo) {
        this.repo = repo;
    }
    findAll(date) {
        const query = this.repo.createQueryBuilder('todo');
        if (date)
            query.where('todo.dueDate = :date', { date });
        return query.orderBy('todo.createdAt', 'ASC').getMany();
    }
    findOne(id) {
        return this.repo.findOneBy({ id });
    }
    create(data) {
        const todo = this.repo.create(data);
        return this.repo.save(todo);
    }
    async update(id, data) {
        const todo = await this.findOne(id);
        if (!todo)
            throw new common_1.NotFoundException(`Todo ${id} introuvable`);
        Object.assign(todo, data);
        return this.repo.save(todo);
    }
    async remove(id) {
        const todo = await this.findOne(id);
        if (!todo)
            throw new common_1.NotFoundException(`Todo ${id} introuvable`);
        await this.repo.remove(todo);
    }
    async toggleComplete(id) {
        const todo = await this.findOne(id);
        if (!todo)
            throw new common_1.NotFoundException(`Todo ${id} introuvable`);
        todo.completed = !todo.completed;
        return this.repo.save(todo);
    }
};
exports.TodoService = TodoService;
exports.TodoService = TodoService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(todo_entity_1.Todo)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], TodoService);
//# sourceMappingURL=todo.service.js.map