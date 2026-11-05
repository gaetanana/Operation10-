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
exports.MealFavorite = exports.Meal = exports.MealType = void 0;
const typeorm_1 = require("typeorm");
var MealType;
(function (MealType) {
    MealType["BREAKFAST"] = "breakfast";
    MealType["LUNCH"] = "lunch";
    MealType["DINNER"] = "dinner";
    MealType["SNACK"] = "snack";
})(MealType || (exports.MealType = MealType = {}));
let Meal = class Meal {
};
exports.Meal = Meal;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Meal.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Meal.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date' }),
    __metadata("design:type", String)
], Meal.prototype, "date", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', default: 0 }),
    __metadata("design:type", Number)
], Meal.prototype, "calories", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', default: 0 }),
    __metadata("design:type", Number)
], Meal.prototype, "proteins", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', default: 0 }),
    __metadata("design:type", Number)
], Meal.prototype, "carbs", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', default: 0 }),
    __metadata("design:type", Number)
], Meal.prototype, "fats", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: MealType, default: MealType.LUNCH }),
    __metadata("design:type", String)
], Meal.prototype, "mealType", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Meal.prototype, "imageUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Array)
], Meal.prototype, "items", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Meal.prototype, "createdAt", void 0);
exports.Meal = Meal = __decorate([
    (0, typeorm_1.Entity)('meals')
], Meal);
let MealFavorite = class MealFavorite {
};
exports.MealFavorite = MealFavorite;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], MealFavorite.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], MealFavorite.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', default: '[]' }),
    __metadata("design:type", Array)
], MealFavorite.prototype, "entries", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], MealFavorite.prototype, "createdAt", void 0);
exports.MealFavorite = MealFavorite = __decorate([
    (0, typeorm_1.Entity)('meal_favorites')
], MealFavorite);
//# sourceMappingURL=nutrition.entity.js.map