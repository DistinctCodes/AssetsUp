"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssetsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const asset_entity_1 = require("./asset.entity");
const asset_history_entity_1 = require("./asset-history.entity");
const assets_service_1 = require("./assets.service");
const assets_controller_1 = require("./assets.controller");
let AssetsModule = class AssetsModule {
};
exports.AssetsModule = AssetsModule;
exports.AssetsModule = AssetsModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([asset_entity_1.Asset, asset_history_entity_1.AssetHistory])],
        providers: [assets_service_1.AssetsService],
        controllers: [assets_controller_1.AssetsController],
        exports: [assets_service_1.AssetsService],
    })
], AssetsModule);
//# sourceMappingURL=assets.module.js.map