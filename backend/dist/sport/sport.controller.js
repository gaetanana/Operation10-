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
exports.SportController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const sport_service_1 = require("./sport.service");
const sport_dto_1 = require("./sport.dto");
let SportController = class SportController {
    constructor(service) {
        this.service = service;
    }
    findTemplates() { return this.service.findAllTemplates(); }
    createTemplate(body) { return this.service.createTemplate(body); }
    updateTemplate(id, body) {
        return this.service.updateTemplate(id, body);
    }
    removeTemplate(id) { return this.service.removeTemplate(id); }
    findSessions(from, to) {
        return this.service.findAllSessions(from, to);
    }
    findSession(id) { return this.service.findSessionById(id); }
    createSession(body) { return this.service.createSession(body); }
    updateSession(id, body) {
        return this.service.updateSession(id, body);
    }
    removeSession(id) { return this.service.removeSession(id); }
    addTemplateExercise(id, body) {
        return this.service.addTemplateExercise(id, body);
    }
    updateTemplateExercise(id, exId, body) {
        return this.service.updateTemplateExercise(id, exId, body);
    }
    removeTemplateExercise(id, exId) {
        return this.service.removeTemplateExercise(id, exId);
    }
    addExercise(id, body) {
        return this.service.addExercise(id, body);
    }
    updateExercise(exerciseId, body) {
        return this.service.updateExercise(exerciseId, body);
    }
    removeExercise(exerciseId) {
        return this.service.removeExercise(exerciseId);
    }
    getStats() { return this.service.getStats(); }
    getStrengthProgress(exercise) {
        return this.service.getStrengthProgress(exercise);
    }
};
exports.SportController = SportController;
__decorate([
    (0, common_1.Get)('templates'),
    (0, swagger_1.ApiOperation)({ summary: 'Programme type (contrat hebdo)' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SportController.prototype, "findTemplates", null);
__decorate([
    (0, common_1.Post)('templates'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [sport_dto_1.CreateTemplateDto]),
    __metadata("design:returntype", void 0)
], SportController.prototype, "createTemplate", null);
__decorate([
    (0, common_1.Patch)('templates/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, sport_dto_1.UpdateTemplateDto]),
    __metadata("design:returntype", void 0)
], SportController.prototype, "updateTemplate", null);
__decorate([
    (0, common_1.Delete)('templates/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SportController.prototype, "removeTemplate", null);
__decorate([
    (0, common_1.Get)('sessions'),
    (0, swagger_1.ApiOperation)({ summary: 'Liste des séances réalisées (filtre from/to)' }),
    __param(0, (0, common_1.Query)('from')),
    __param(1, (0, common_1.Query)('to')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], SportController.prototype, "findSessions", null);
__decorate([
    (0, common_1.Get)('sessions/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SportController.prototype, "findSession", null);
__decorate([
    (0, common_1.Post)('sessions'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [sport_dto_1.CreateSessionDto]),
    __metadata("design:returntype", void 0)
], SportController.prototype, "createSession", null);
__decorate([
    (0, common_1.Patch)('sessions/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, sport_dto_1.UpdateSessionDto]),
    __metadata("design:returntype", void 0)
], SportController.prototype, "updateSession", null);
__decorate([
    (0, common_1.Delete)('sessions/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SportController.prototype, "removeSession", null);
__decorate([
    (0, common_1.Post)('templates/:id/exercises'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, sport_dto_1.ExerciseDto]),
    __metadata("design:returntype", void 0)
], SportController.prototype, "addTemplateExercise", null);
__decorate([
    (0, common_1.Patch)('templates/:id/exercises/:exId'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('exId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, sport_dto_1.ExerciseDto]),
    __metadata("design:returntype", void 0)
], SportController.prototype, "updateTemplateExercise", null);
__decorate([
    (0, common_1.Delete)('templates/:id/exercises/:exId'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('exId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], SportController.prototype, "removeTemplateExercise", null);
__decorate([
    (0, common_1.Post)('sessions/:id/exercises'),
    (0, swagger_1.ApiOperation)({ summary: 'Ajoute un exercice à une séance' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, sport_dto_1.ExerciseDto]),
    __metadata("design:returntype", void 0)
], SportController.prototype, "addExercise", null);
__decorate([
    (0, common_1.Patch)('exercises/:exerciseId'),
    __param(0, (0, common_1.Param)('exerciseId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, sport_dto_1.UpdateExerciseDto]),
    __metadata("design:returntype", void 0)
], SportController.prototype, "updateExercise", null);
__decorate([
    (0, common_1.Delete)('exercises/:exerciseId'),
    __param(0, (0, common_1.Param)('exerciseId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SportController.prototype, "removeExercise", null);
__decorate([
    (0, common_1.Get)('stats'),
    (0, swagger_1.ApiOperation)({ summary: 'Stats globales sport' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SportController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)('strength-progress'),
    (0, swagger_1.ApiOperation)({ summary: 'Progression des charges par exercice (≥2 points de données)' }),
    __param(0, (0, common_1.Query)('exercise')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SportController.prototype, "getStrengthProgress", null);
exports.SportController = SportController = __decorate([
    (0, swagger_1.ApiTags)('Sport'),
    (0, common_1.Controller)('sport'),
    __metadata("design:paramtypes", [sport_service_1.SportService])
], SportController);
//# sourceMappingURL=sport.controller.js.map