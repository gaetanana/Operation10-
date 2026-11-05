"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RevisionModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const revision_entity_1 = require("./revision.entity");
const revision_service_1 = require("./revision.service");
const revision_controller_1 = require("./revision.controller");
const revision_seed_service_1 = require("./revision-seed.service");
let RevisionModule = class RevisionModule {
};
exports.RevisionModule = RevisionModule;
exports.RevisionModule = RevisionModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([revision_entity_1.Subject, revision_entity_1.Sheet, revision_entity_1.Flashcard])],
        providers: [revision_service_1.RevisionService, revision_seed_service_1.RevisionSeedService],
        controllers: [revision_controller_1.RevisionController],
    })
], RevisionModule);
//# sourceMappingURL=revision.module.js.map