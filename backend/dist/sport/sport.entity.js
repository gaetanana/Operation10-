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
exports.Exercise = exports.Session = exports.SessionTemplate = exports.SessionType = void 0;
const typeorm_1 = require("typeorm");
var SessionType;
(function (SessionType) {
    SessionType["PECS_TRICEPS"] = "pecs_triceps";
    SessionType["DOS_BICEPS"] = "dos_biceps";
    SessionType["EPAULES"] = "epaules";
    SessionType["JAMBES"] = "jambes";
    SessionType["BRAS_ABDOS"] = "bras_abdos";
    SessionType["CARDIO"] = "cardio";
    SessionType["EMOM"] = "emom";
    SessionType["CIRCUIT"] = "circuit";
    SessionType["OTHER"] = "other";
})(SessionType || (exports.SessionType = SessionType = {}));
let SessionTemplate = class SessionTemplate {
};
exports.SessionTemplate = SessionTemplate;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], SessionTemplate.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], SessionTemplate.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: SessionType }),
    __metadata("design:type", String)
], SessionTemplate.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], SessionTemplate.prototype, "dayOfWeek", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 1 }),
    __metadata("design:type", Number)
], SessionTemplate.prototype, "weeklyTarget", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], SessionTemplate.prototype, "durationMinutes", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], SessionTemplate.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true, default: '[]' }),
    __metadata("design:type", Array)
], SessionTemplate.prototype, "templateExercises", void 0);
exports.SessionTemplate = SessionTemplate = __decorate([
    (0, typeorm_1.Entity)('session_templates')
], SessionTemplate);
let Session = class Session {
};
exports.Session = Session;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Session.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Session.prototype, "templateId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Session.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: SessionType }),
    __metadata("design:type", String)
], Session.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date' }),
    __metadata("design:type", String)
], Session.prototype, "date", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], Session.prototype, "durationMinutes", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Session.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Exercise, (e) => e.session, { cascade: true, eager: true }),
    __metadata("design:type", Array)
], Session.prototype, "exercises", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Session.prototype, "createdAt", void 0);
exports.Session = Session = __decorate([
    (0, typeorm_1.Entity)('sessions')
], Session);
let Exercise = class Exercise {
};
exports.Exercise = Exercise;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Exercise.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Exercise.prototype, "sessionId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Session, (s) => s.exercises, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'sessionId' }),
    __metadata("design:type", Session)
], Exercise.prototype, "session", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Exercise.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], Exercise.prototype, "sets", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], Exercise.prototype, "reps", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', nullable: true }),
    __metadata("design:type", Number)
], Exercise.prototype, "weight", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], Exercise.prototype, "durationSeconds", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], Exercise.prototype, "restSeconds", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', nullable: true }),
    __metadata("design:type", Number)
], Exercise.prototype, "distanceKm", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', nullable: true }),
    __metadata("design:type", Number)
], Exercise.prototype, "avgSpeedKmh", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Exercise.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], Exercise.prototype, "order", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Exercise.prototype, "createdAt", void 0);
exports.Exercise = Exercise = __decorate([
    (0, typeorm_1.Entity)('exercises')
], Exercise);
//# sourceMappingURL=sport.entity.js.map