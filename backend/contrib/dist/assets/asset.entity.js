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
exports.Asset = void 0;
const typeorm_1 = require("typeorm");
const asset_history_entity_1 = require("./asset-history.entity");
let Asset = class Asset {
};
exports.Asset = Asset;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Asset.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Asset.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Asset.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, unique: true }),
    __metadata("design:type", String)
], Asset.prototype, "assetId", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Asset.prototype, "serialNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Asset.prototype, "manufacturer", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Asset.prototype, "model", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Asset.prototype, "categoryId", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Asset.prototype, "departmentId", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Asset.prototype, "location", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ['NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED'], nullable: true }),
    __metadata("design:type", String)
], Asset.prototype, "condition", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 18, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], Asset.prototype, "value", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], Asset.prototype, "purchaseDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'RETIRED'], default: 'ACTIVE' }),
    __metadata("design:type", String)
], Asset.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Asset.prototype, "assignedTo", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Asset.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Asset.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.DeleteDateColumn)(),
    __metadata("design:type", Date)
], Asset.prototype, "deletedAt", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => asset_history_entity_1.AssetHistory, (history) => history.asset, { cascade: true }),
    __metadata("design:type", Array)
], Asset.prototype, "history", void 0);
exports.Asset = Asset = __decorate([
    (0, typeorm_1.Entity)('asset')
], Asset);
//# sourceMappingURL=asset.entity.js.map