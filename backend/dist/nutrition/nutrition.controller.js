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
exports.NutritionController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const nutrition_service_1 = require("./nutrition.service");
const nutrition_dto_1 = require("./nutrition.dto");
let NutritionController = class NutritionController {
    constructor(service) {
        this.service = service;
    }
    findByDate(date) {
        return this.service.findByDate(date);
    }
    getDailyTotals(date) {
        return this.service.getDailyTotals(date);
    }
    searchFood(q) {
        return this.service.searchFood(q);
    }
    create(body) { return this.service.create(body); }
    update(id, body) { return this.service.update(id, body); }
    remove(id) { return this.service.remove(id); }
    analyzeImage(body) {
        return this.service.analyzeImage(body.base64, body.mediaType || 'image/jpeg');
    }
};
exports.NutritionController = NutritionController;
__decorate([
    (0, common_1.Get)('meals'),
    (0, swagger_1.ApiOperation)({ summary: 'Repas du jour (param: date YYYY-MM-DD)' }),
    __param(0, (0, common_1.Query)('date')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], NutritionController.prototype, "findByDate", null);
__decorate([
    (0, common_1.Get)('totals'),
    (0, swagger_1.ApiOperation)({ summary: 'Macros totaux d\'une journée' }),
    __param(0, (0, common_1.Query)('date')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], NutritionController.prototype, "getDailyTotals", null);
__decorate([
    (0, common_1.Get)('search'),
    (0, swagger_1.ApiOperation)({ summary: 'Recherche aliment via Open Food Facts' }),
    __param(0, (0, common_1.Query)('q')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], NutritionController.prototype, "searchFood", null);
__decorate([
    (0, common_1.Post)('meals'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [nutrition_dto_1.CreateMealDto]),
    __metadata("design:returntype", void 0)
], NutritionController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)('meals/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, nutrition_dto_1.UpdateMealDto]),
    __metadata("design:returntype", void 0)
], NutritionController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)('meals/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], NutritionController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)('analyze-image'),
    (0, swagger_1.ApiOperation)({ summary: 'Analyse une photo de repas ou d\'emballage via Claude Vision' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [nutrition_dto_1.AnalyzeImageDto]),
    __metadata("design:returntype", void 0)
], NutritionController.prototype, "analyzeImage", null);
exports.NutritionController = NutritionController = __decorate([
    (0, swagger_1.ApiTags)('Nutrition'),
    (0, common_1.Controller)('nutrition'),
    __metadata("design:paramtypes", [nutrition_service_1.NutritionService])
], NutritionController);
//# sourceMappingURL=nutrition.controller.js.map