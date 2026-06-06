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
exports.SportService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const sport_entity_1 = require("./sport.entity");
let SportService = class SportService {
    constructor(sessionRepo, templateRepo, exerciseRepo) {
        this.sessionRepo = sessionRepo;
        this.templateRepo = templateRepo;
        this.exerciseRepo = exerciseRepo;
    }
    findAllTemplates() {
        return this.templateRepo.find({ order: { dayOfWeek: 'ASC' } });
    }
    createTemplate(data) {
        return this.templateRepo.save(this.templateRepo.create(data));
    }
    async updateTemplate(id, data) {
        const t = await this.templateRepo.findOneBy({ id });
        if (!t)
            throw new common_1.NotFoundException();
        return this.templateRepo.save({ ...t, ...data });
    }
    async removeTemplate(id) {
        const t = await this.templateRepo.findOneBy({ id });
        if (!t)
            throw new common_1.NotFoundException();
        await this.templateRepo.remove(t);
    }
    findAllSessions(from, to) {
        const q = this.sessionRepo
            .createQueryBuilder('s')
            .leftJoinAndSelect('s.exercises', 'e')
            .orderBy('s.date', 'DESC')
            .addOrderBy('e.order', 'ASC');
        if (from)
            q.andWhere('s.date >= :from', { from });
        if (to)
            q.andWhere('s.date <= :to', { to });
        return q.getMany();
    }
    async findSessionById(id) {
        const s = await this.sessionRepo.findOne({
            where: { id },
            relations: ['exercises'],
        });
        if (!s)
            throw new common_1.NotFoundException();
        return s;
    }
    createSession(data) {
        return this.sessionRepo.save(this.sessionRepo.create(data));
    }
    async updateSession(id, data) {
        const s = await this.sessionRepo.findOneBy({ id });
        if (!s)
            throw new common_1.NotFoundException();
        return this.sessionRepo.save({ ...s, ...data });
    }
    async removeSession(id) {
        const s = await this.sessionRepo.findOneBy({ id });
        if (!s)
            throw new common_1.NotFoundException();
        await this.sessionRepo.remove(s);
    }
    async addExercise(sessionId, data) {
        const session = await this.sessionRepo.findOneBy({ id: sessionId });
        if (!session)
            throw new common_1.NotFoundException('Séance introuvable');
        const count = await this.exerciseRepo.countBy({ sessionId });
        return this.exerciseRepo.save(this.exerciseRepo.create({ ...data, sessionId, order: count }));
    }
    async addTemplateExercise(templateId, data) {
        const t = await this.templateRepo.findOneBy({ id: templateId });
        if (!t)
            throw new common_1.NotFoundException('Template introuvable');
        const exercises = t.templateExercises ?? [];
        exercises.push({ ...data, id: crypto.randomUUID() });
        return this.templateRepo.save({ ...t, templateExercises: exercises });
    }
    async updateTemplateExercise(templateId, exId, data) {
        const t = await this.templateRepo.findOneBy({ id: templateId });
        if (!t)
            throw new common_1.NotFoundException('Template introuvable');
        const exercises = (t.templateExercises ?? []).map((e) => e.id === exId ? { ...e, ...data } : e);
        return this.templateRepo.save({ ...t, templateExercises: exercises });
    }
    async removeTemplateExercise(templateId, exId) {
        const t = await this.templateRepo.findOneBy({ id: templateId });
        if (!t)
            throw new common_1.NotFoundException('Template introuvable');
        const exercises = (t.templateExercises ?? []).filter((e) => e.id !== exId);
        return this.templateRepo.save({ ...t, templateExercises: exercises });
    }
    async updateExercise(exerciseId, data) {
        const e = await this.exerciseRepo.findOneBy({ id: exerciseId });
        if (!e)
            throw new common_1.NotFoundException('Exercice introuvable');
        return this.exerciseRepo.save({ ...e, ...data });
    }
    async removeExercise(exerciseId) {
        const e = await this.exerciseRepo.findOneBy({ id: exerciseId });
        if (!e)
            throw new common_1.NotFoundException('Exercice introuvable');
        await this.exerciseRepo.remove(e);
    }
    async getStrengthProgress(exerciseName) {
        const qb = this.exerciseRepo
            .createQueryBuilder('e')
            .innerJoin('e.session', 's')
            .select('e.name', 'name')
            .addSelect('MAX(e.weight)', 'maxWeight')
            .addSelect('s.date', 'date')
            .where('e.weight IS NOT NULL')
            .andWhere('e.weight > 0');
        if (exerciseName) {
            qb.andWhere('LOWER(e.name) LIKE :name', { name: `%${exerciseName.toLowerCase()}%` });
        }
        const rawRows = await this.exerciseRepo
            .createQueryBuilder('e')
            .innerJoin('e.session', 's')
            .select('e.name', 'name')
            .addSelect('s.date', 'date')
            .addSelect('MAX(e.weight)', 'maxWeight')
            .where('e.weight IS NOT NULL')
            .andWhere('e.weight > 0')
            .groupBy('e.name')
            .addGroupBy('s.date')
            .orderBy('e.name', 'ASC')
            .addOrderBy('s.date', 'ASC')
            .getRawMany();
        const map = new Map();
        for (const row of rawRows) {
            if (!map.has(row.name))
                map.set(row.name, []);
            map.get(row.name).push({ date: row.date, weight: Number(row.maxWeight) });
        }
        const result = [];
        for (const [name, data] of map.entries()) {
            if (data.length >= 2) {
                result.push({ name, data });
            }
        }
        result.sort((a, b) => b.data.length - a.data.length);
        return result;
    }
    async getStats() {
        const total = await this.sessionRepo.count();
        const thisMonth = await this.sessionRepo
            .createQueryBuilder('s')
            .where("date_trunc('month', s.date::timestamp) = date_trunc('month', now())")
            .getCount();
        const thisWeek = await this.sessionRepo
            .createQueryBuilder('s')
            .where("s.date >= date_trunc('week', now())")
            .getCount();
        const byTypeRaw = await this.sessionRepo
            .createQueryBuilder('s')
            .select('s.type', 'type')
            .addSelect('COUNT(*)', 'count')
            .where("date_trunc('month', s.date::timestamp) = date_trunc('month', now())")
            .groupBy('s.type')
            .getRawMany();
        const byType = byTypeRaw.reduce((acc, row) => {
            acc[row.type] = Number(row.count);
            return acc;
        }, {});
        const totalExercises = await this.exerciseRepo.count();
        const last8Weeks = await this.sessionRepo
            .createQueryBuilder('s')
            .select("to_char(date_trunc('week', s.date::timestamp), 'YYYY-MM-DD')", 'week')
            .addSelect('COUNT(*)', 'count')
            .where("s.date >= now() - interval '8 weeks'")
            .groupBy("date_trunc('week', s.date::timestamp)")
            .orderBy("date_trunc('week', s.date::timestamp)", 'ASC')
            .getRawMany();
        return {
            total,
            thisMonth,
            thisWeek,
            byType,
            totalExercises,
            last8Weeks: last8Weeks.map(r => ({ week: r.week, count: Number(r.count) })),
        };
    }
};
exports.SportService = SportService;
exports.SportService = SportService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(sport_entity_1.Session)),
    __param(1, (0, typeorm_1.InjectRepository)(sport_entity_1.SessionTemplate)),
    __param(2, (0, typeorm_1.InjectRepository)(sport_entity_1.Exercise)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], SportService);
//# sourceMappingURL=sport.service.js.map