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
exports.RevisionController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const revision_service_1 = require("./revision.service");
const revision_dto_1 = require("./revision.dto");
let RevisionController = class RevisionController {
    constructor(service) {
        this.service = service;
    }
    findSubjects() {
        return this.service.findSubjects();
    }
    createSubject(body) {
        return this.service.createSubject(body);
    }
    updateSubject(id, body) {
        return this.service.updateSubject(id, body);
    }
    removeSubject(id) {
        return this.service.removeSubject(id);
    }
    regenerateSubjectCards(id, body) {
        return this.service.regenerateSubjectCards(id, body.cardCount);
    }
    findSheets(subjectId) {
        return this.service.findSheets(subjectId);
    }
    findSheet(id) {
        return this.service.findSheet(id);
    }
    createSheet(body) {
        return this.service.createSheet(body);
    }
    generateCardsForSheet(id, body) {
        return this.service.generateCardsForSheet(id, body.cardCount);
    }
    updateSheet(id, body) {
        return this.service.updateSheet(id, body);
    }
    removeSheet(id) {
        return this.service.removeSheet(id);
    }
    findCards(subjectId) {
        return this.service.findCards(subjectId);
    }
    findDueCards(subjectId) {
        return this.service.findDueCards(subjectId);
    }
    createCard(body) {
        return this.service.createCard(body);
    }
    updateCard(id, body) {
        return this.service.updateCard(id, body);
    }
    review(id, body) {
        return this.service.review(id, body.grade);
    }
    check(id, body) {
        return this.service.checkAnswer(id, body.userAnswer);
    }
    removeCard(id) {
        return this.service.removeCard(id);
    }
    generate(body) {
        return this.service.generate(body);
    }
};
exports.RevisionController = RevisionController;
__decorate([
    (0, common_1.Get)('subjects'),
    (0, swagger_1.ApiOperation)({ summary: 'Liste des matières' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], RevisionController.prototype, "findSubjects", null);
__decorate([
    (0, common_1.Post)('subjects'),
    (0, swagger_1.ApiOperation)({ summary: 'Crée une matière' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [revision_dto_1.CreateSubjectDto]),
    __metadata("design:returntype", void 0)
], RevisionController.prototype, "createSubject", null);
__decorate([
    (0, common_1.Patch)('subjects/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, revision_dto_1.UpdateSubjectDto]),
    __metadata("design:returntype", void 0)
], RevisionController.prototype, "updateSubject", null);
__decorate([
    (0, common_1.Delete)('subjects/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], RevisionController.prototype, "removeSubject", null);
__decorate([
    (0, common_1.Post)('subjects/:id/regenerate-cards'),
    (0, swagger_1.ApiOperation)({ summary: 'Régénère Tout le paquet de cartes d\'une matière (remplace)' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, revision_dto_1.GenerateCardsDto]),
    __metadata("design:returntype", void 0)
], RevisionController.prototype, "regenerateSubjectCards", null);
__decorate([
    (0, common_1.Get)('sheets'),
    (0, swagger_1.ApiOperation)({ summary: 'Fiches (filtre par subjectId possible)' }),
    __param(0, (0, common_1.Query)('subjectId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], RevisionController.prototype, "findSheets", null);
__decorate([
    (0, common_1.Get)('sheets/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], RevisionController.prototype, "findSheet", null);
__decorate([
    (0, common_1.Post)('sheets'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [revision_dto_1.CreateSheetDto]),
    __metadata("design:returntype", void 0)
], RevisionController.prototype, "createSheet", null);
__decorate([
    (0, common_1.Post)('sheets/:id/generate-cards'),
    (0, swagger_1.ApiOperation)({ summary: 'Génère des flashcards depuis une fiche (ajoute)' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, revision_dto_1.GenerateCardsDto]),
    __metadata("design:returntype", void 0)
], RevisionController.prototype, "generateCardsForSheet", null);
__decorate([
    (0, common_1.Patch)('sheets/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, revision_dto_1.UpdateSheetDto]),
    __metadata("design:returntype", void 0)
], RevisionController.prototype, "updateSheet", null);
__decorate([
    (0, common_1.Delete)('sheets/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], RevisionController.prototype, "removeSheet", null);
__decorate([
    (0, common_1.Get)('flashcards'),
    (0, swagger_1.ApiOperation)({ summary: 'Cartes (filtre par subjectId possible)' }),
    __param(0, (0, common_1.Query)('subjectId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], RevisionController.prototype, "findCards", null);
__decorate([
    (0, common_1.Get)('flashcards/due'),
    (0, swagger_1.ApiOperation)({ summary: 'Cartes à réviser aujourd\'hui' }),
    __param(0, (0, common_1.Query)('subjectId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], RevisionController.prototype, "findDueCards", null);
__decorate([
    (0, common_1.Post)('flashcards'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [revision_dto_1.CreateFlashcardDto]),
    __metadata("design:returntype", void 0)
], RevisionController.prototype, "createCard", null);
__decorate([
    (0, common_1.Patch)('flashcards/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, revision_dto_1.UpdateFlashcardDto]),
    __metadata("design:returntype", void 0)
], RevisionController.prototype, "updateCard", null);
__decorate([
    (0, common_1.Patch)('flashcards/:id/review'),
    (0, swagger_1.ApiOperation)({ summary: 'Note une carte (SM-2) et reprogramme son échéance' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, revision_dto_1.ReviewDto]),
    __metadata("design:returntype", void 0)
], RevisionController.prototype, "review", null);
__decorate([
    (0, common_1.Post)('flashcards/:id/check'),
    (0, swagger_1.ApiOperation)({ summary: 'Valide une réponse libre via Claude' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, revision_dto_1.CheckAnswerDto]),
    __metadata("design:returntype", void 0)
], RevisionController.prototype, "check", null);
__decorate([
    (0, common_1.Delete)('flashcards/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], RevisionController.prototype, "removeCard", null);
__decorate([
    (0, common_1.Post)('generate'),
    (0, swagger_1.ApiOperation)({ summary: 'Génère une fiche + flashcards via Claude' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [revision_dto_1.GenerateDto]),
    __metadata("design:returntype", void 0)
], RevisionController.prototype, "generate", null);
exports.RevisionController = RevisionController = __decorate([
    (0, swagger_1.ApiTags)('Revision'),
    (0, common_1.Controller)('revision'),
    __metadata("design:paramtypes", [revision_service_1.RevisionService])
], RevisionController);
//# sourceMappingURL=revision.controller.js.map