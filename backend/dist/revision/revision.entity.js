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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Flashcard = exports.Sheet = exports.Subject = void 0;
const typeorm_1 = require("typeorm");
let Subject = class Subject {
};
exports.Subject = Subject;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Subject.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Subject.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'ti-book' }),
    __metadata("design:type", String)
], Subject.prototype, "icon", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: '#a0ff40' }),
    __metadata("design:type", String)
], Subject.prototype, "color", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", String)
], Subject.prototype, "trainerKey", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Subject.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Sheet, (s) => s.subject),
    __metadata("design:type", Array)
], Subject.prototype, "sheets", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Flashcard, (f) => f.subject),
    __metadata("design:type", Array)
], Subject.prototype, "flashcards", void 0);
exports.Subject = Subject = __decorate([
    (0, typeorm_1.Entity)('subjects')
], Subject);
let Sheet = class Sheet {
};
exports.Sheet = Sheet;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Sheet.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Sheet.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', default: '' }),
    __metadata("design:type", String)
], Sheet.prototype, "content", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Subject, (s) => s.sheets, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'subjectId' }),
    __metadata("design:type", Subject)
], Sheet.prototype, "subject", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Sheet.prototype, "subjectId", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Sheet.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Sheet.prototype, "updatedAt", void 0);
exports.Sheet = Sheet = __decorate([
    (0, typeorm_1.Entity)('sheets')
], Sheet);
let Flashcard = class Flashcard {
};
exports.Flashcard = Flashcard;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Flashcard.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], Flashcard.prototype, "question", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], Flashcard.prototype, "answer", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Subject, (s) => s.flashcards, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'subjectId' }),
    __metadata("design:type", Subject)
], Flashcard.prototype, "subject", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Flashcard.prototype, "subjectId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Sheet, { nullable: true, onDelete: 'SET NULL' }),
    (0, typeorm_1.JoinColumn)({ name: 'sheetId' }),
    __metadata("design:type", Sheet)
], Flashcard.prototype, "sheet", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], Flashcard.prototype, "sheetId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], Flashcard.prototype, "repetitions", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', default: 2.5 }),
    __metadata("design:type", Number)
], Flashcard.prototype, "easeFactor", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], Flashcard.prototype, "intervalDays", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date' }),
    __metadata("design:type", String)
], Flashcard.prototype, "dueDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], Flashcard.prototype, "lastReviewedAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Flashcard.prototype, "createdAt", void 0);
exports.Flashcard = Flashcard = __decorate([
    (0, typeorm_1.Entity)('flashcards')
], Flashcard);
//# sourceMappingURL=revision.entity.js.map