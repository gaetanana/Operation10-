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
var SeedService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeedService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const todo_entity_1 = require("./todo/todo.entity");
const sport_entity_1 = require("./sport/sport.entity");
let SeedService = SeedService_1 = class SeedService {
    constructor(todoRepo, templateRepo) {
        this.todoRepo = todoRepo;
        this.templateRepo = templateRepo;
        this.logger = new common_1.Logger(SeedService_1.name);
    }
    async onApplicationBootstrap() {
        await this.seedTodos();
        await this.seedTemplates();
        await this.migrateTemplates();
        await this.recreateRecurringTodos();
    }
    async seedTodos() {
        const count = await this.todoRepo.count();
        if (count > 0)
            return;
        const today = new Date().toISOString().split('T')[0];
        const dailyTasks = [
            'EMOM 10 min — pompes 15 reps / min',
            'Séance sport du matin',
            'Logger mes repas',
            'Révisions cours du soir',
            '8h de sommeil',
        ];
        const stageTasks = [
            'Préparer présentation projet',
            'Finir module React avancé',
            'Lire doc NestJS Guards',
        ];
        for (const title of dailyTasks) {
            await this.todoRepo.save(this.todoRepo.create({
                title,
                category: todo_entity_1.TodoCategory.DAILY,
                isRecurring: true,
                dueDate: today,
            }));
        }
        for (const title of stageTasks) {
            await this.todoRepo.save(this.todoRepo.create({
                title,
                category: todo_entity_1.TodoCategory.STAGE,
                isRecurring: false,
                dueDate: today,
            }));
        }
        this.logger.log('✅ Todos initiaux créés');
    }
    async seedTemplates() {
        const count = await this.templateRepo.count();
        if (count > 0) {
            const first = await this.templateRepo.findOne({ where: {} });
            if (first && first.type === 'push') {
                await this.templateRepo.clear();
                this.logger.log('🔄 Anciens templates supprimés, re-seed...');
            }
            else {
                return;
            }
        }
        const templates = [
            {
                name: 'Pecs / Triceps',
                type: sport_entity_1.SessionType.PECS_TRICEPS,
                dayOfWeek: 0,
                durationMinutes: 75,
                description: 'Développé couché, dips, écarté, pushdown…',
            },
            {
                name: 'Dos / Biceps',
                type: sport_entity_1.SessionType.DOS_BICEPS,
                dayOfWeek: 1,
                durationMinutes: 75,
                description: 'Tractions, tirage barre, curl, rowing…',
            },
            {
                name: 'Épaules',
                type: sport_entity_1.SessionType.EPAULES,
                dayOfWeek: 3,
                durationMinutes: 60,
                description: 'Développé militaire, élévations latérales, oiseau…',
            },
            {
                name: 'Jambes',
                type: sport_entity_1.SessionType.JAMBES,
                dayOfWeek: 2,
                durationMinutes: 75,
                description: 'Squat, leg press, fentes, ischio, mollets…',
            },
            {
                name: 'Bras / Abdos',
                type: sport_entity_1.SessionType.BRAS_ABDOS,
                dayOfWeek: 5,
                durationMinutes: 60,
                description: 'Curl barre, marteau, triceps corde, gainage, crunchs…',
            },
            {
                name: 'Cardio — Course',
                type: sport_entity_1.SessionType.CARDIO,
                dayOfWeek: 6,
                durationMinutes: 40,
                description: '30–45 min zone 2, ou fractionné 20 min',
            },
            {
                name: 'EMOM pompes',
                type: sport_entity_1.SessionType.EMOM,
                dayOfWeek: -1,
                durationMinutes: 10,
                description: '15 reps / min pendant 10 min — quotidien',
            },
        ];
        for (const t of templates) {
            await this.templateRepo.save(this.templateRepo.create(t));
        }
        this.logger.log('✅ Templates sport (split 5 jours) créés');
    }
    async recreateRecurringTodos() {
        const today = new Date().toISOString().split('T')[0];
        const recurring = await this.todoRepo.find({ where: { isRecurring: true } });
        if (recurring.length === 0)
            return;
        const todayTodos = await this.todoRepo
            .createQueryBuilder('todo')
            .where('todo.isRecurring = true')
            .andWhere('todo.dueDate = :today', { today })
            .getMany();
        const existingTitles = new Set(todayTodos.map(t => t.title));
        const seenTitles = new Set();
        for (const todo of recurring) {
            if (todo.dueDate === today)
                continue;
            if (seenTitles.has(todo.title))
                continue;
            if (existingTitles.has(todo.title))
                continue;
            seenTitles.add(todo.title);
            await this.todoRepo.save(this.todoRepo.create({
                title: todo.title,
                category: todo.category,
                isRecurring: true,
                completed: false,
                dueDate: today,
            }));
        }
        if (seenTitles.size > 0) {
            this.logger.log(`✅ ${seenTitles.size} tâche(s) récurrente(s) recréée(s) pour ${today}`);
        }
    }
    async migrateTemplates() {
        const jambes = await this.templateRepo.findOne({ where: { type: sport_entity_1.SessionType.JAMBES } });
        if (jambes && jambes.dayOfWeek === 4) {
            await this.templateRepo.save({ ...jambes, dayOfWeek: 2 });
            this.logger.log('🔄 Jambes déplacé au mercredi');
        }
    }
};
exports.SeedService = SeedService;
exports.SeedService = SeedService = SeedService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(todo_entity_1.Todo)),
    __param(1, (0, typeorm_1.InjectRepository)(sport_entity_1.SessionTemplate)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], SeedService);
//# sourceMappingURL=seed.service.js.map