"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NutritionModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const nutrition_entity_1 = require("./nutrition.entity");
const nutrition_service_1 = require("./nutrition.service");
const nutrition_controller_1 = require("./nutrition.controller");
let NutritionModule = class NutritionModule {
};
exports.NutritionModule = NutritionModule;
exports.NutritionModule = NutritionModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([nutrition_entity_1.Meal])],
        providers: [nutrition_service_1.NutritionService],
        controllers: [nutrition_controller_1.NutritionController],
    })
], NutritionModule);
//# sourceMappingURL=nutrition.module.js.map