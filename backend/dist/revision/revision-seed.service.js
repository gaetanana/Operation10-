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
var RevisionSeedService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RevisionSeedService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const revision_entity_1 = require("./revision.entity");
const revision_seed_1 = require("./revision.seed");
const DEFS = [
    {
        name: 'Linux',
        icon: 'ti-terminal-2',
        color: '#a0ff40',
        trainerKey: null,
        sheetTitle: 'Linux en ligne de commande',
        sheetContent: revision_seed_1.LINUX_SHEET,
        cards: revision_seed_1.LINUX_CARDS,
    },
    {
        name: 'Réseau',
        icon: 'ti-network',
        color: '#40c0ff',
        trainerKey: 'reseau',
        sheetTitle: 'Réseaux — l\'essentiel',
        sheetContent: revision_seed_1.RESEAU_SHEET,
        cards: revision_seed_1.RESEAU_CARDS,
    },
];
let RevisionSeedService = RevisionSeedService_1 = class RevisionSeedService {
    constructor(subjectRepo, sheetRepo, cardRepo) {
        this.subjectRepo = subjectRepo;
        this.sheetRepo = sheetRepo;
        this.cardRepo = cardRepo;
        this.logger = new common_1.Logger(RevisionSeedService_1.name);
    }
    async onApplicationBootstrap() {
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        for (const def of DEFS) {
            await this.ensureSubject(def, todayStr);
        }
    }
    async ensureSubject(def, todayStr) {
        let subject = await this.subjectRepo.findOne({ where: { name: def.name } });
        if (!subject) {
            subject = await this.subjectRepo.save(this.subjectRepo.create({
                name: def.name,
                icon: def.icon,
                color: def.color,
                trainerKey: def.trainerKey,
            }));
            this.logger.log(`✅ Matière « ${def.name} » créée`);
        }
        else if (subject.trainerKey !== def.trainerKey || subject.icon !== def.icon) {
            subject.trainerKey = def.trainerKey;
            subject.icon = subject.icon || def.icon;
            await this.subjectRepo.save(subject);
        }
        let sheet = await this.sheetRepo.findOne({
            where: { subjectId: subject.id, title: def.sheetTitle },
        });
        if (!sheet) {
            sheet = await this.sheetRepo.save(this.sheetRepo.create({ subjectId: subject.id, title: def.sheetTitle, content: def.sheetContent }));
        }
        else if (sheet.content !== def.sheetContent) {
            sheet.content = def.sheetContent;
            await this.sheetRepo.save(sheet);
            this.logger.log(`🔄 Fiche « ${def.sheetTitle} » mise à jour`);
        }
        const cardCount = await this.cardRepo.count({ where: { subjectId: subject.id } });
        if (cardCount === 0 && def.cards.length) {
            const cards = def.cards.map((c) => this.cardRepo.create({
                subjectId: subject.id,
                sheetId: sheet.id,
                question: c.question,
                answer: c.answer,
                dueDate: todayStr,
            }));
            await this.cardRepo.save(cards);
        }
    }
};
exports.RevisionSeedService = RevisionSeedService;
exports.RevisionSeedService = RevisionSeedService = RevisionSeedService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(revision_entity_1.Subject)),
    __param(1, (0, typeorm_1.InjectRepository)(revision_entity_1.Sheet)),
    __param(2, (0, typeorm_1.InjectRepository)(revision_entity_1.Flashcard)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], RevisionSeedService);
//# sourceMappingURL=revision-seed.service.js.map