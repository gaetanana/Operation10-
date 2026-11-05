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
exports.DuplicateDayDto = exports.CreateFavoriteDto = exports.FavoriteEntryDto = exports.AnalyzeImageDto = exports.UpdateMealDto = exports.CreateMealDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const nutrition_entity_1 = require("./nutrition.entity");
class CreateMealDto {
}
exports.CreateMealDto = CreateMealDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    __metadata("design:type", String)
], CreateMealDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateMealDto.prototype, "date", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateMealDto.prototype, "calories", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateMealDto.prototype, "proteins", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateMealDto.prototype, "carbs", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateMealDto.prototype, "fats", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(nutrition_entity_1.MealType),
    __metadata("design:type", String)
], CreateMealDto.prototype, "mealType", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateMealDto.prototype, "imageUrl", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    __metadata("design:type", Array)
], CreateMealDto.prototype, "items", void 0);
class UpdateMealDto {
}
exports.UpdateMealDto = UpdateMealDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    __metadata("design:type", String)
], UpdateMealDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UpdateMealDto.prototype, "calories", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UpdateMealDto.prototype, "proteins", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UpdateMealDto.prototype, "carbs", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UpdateMealDto.prototype, "fats", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(nutrition_entity_1.MealType),
    __metadata("design:type", String)
], UpdateMealDto.prototype, "mealType", void 0);
class AnalyzeImageDto {
}
exports.AnalyzeImageDto = AnalyzeImageDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AnalyzeImageDto.prototype, "base64", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AnalyzeImageDto.prototype, "mediaType", void 0);
class FavoriteEntryDto {
}
exports.FavoriteEntryDto = FavoriteEntryDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    __metadata("design:type", String)
], FavoriteEntryDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(nutrition_entity_1.MealType),
    __metadata("design:type", String)
], FavoriteEntryDto.prototype, "mealType", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], FavoriteEntryDto.prototype, "calories", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], FavoriteEntryDto.prototype, "proteins", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], FavoriteEntryDto.prototype, "carbs", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], FavoriteEntryDto.prototype, "fats", void 0);
class CreateFavoriteDto {
}
exports.CreateFavoriteDto = CreateFavoriteDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    __metadata("design:type", String)
], CreateFavoriteDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => FavoriteEntryDto),
    __metadata("design:type", Array)
], CreateFavoriteDto.prototype, "entries", void 0);
class DuplicateDayDto {
}
exports.DuplicateDayDto = DuplicateDayDto;
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], DuplicateDayDto.prototype, "from", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], DuplicateDayDto.prototype, "to", void 0);
//# sourceMappingURL=nutrition.dto.js.map