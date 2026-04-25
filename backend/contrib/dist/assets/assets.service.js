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
exports.AssetsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const asset_entity_1 = require("./asset.entity");
const asset_history_entity_1 = require("./asset-history.entity");
const enums_1 = require("./enums");
let AssetsService = class AssetsService {
    constructor(assetRepo, historyRepo) {
        this.assetRepo = assetRepo;
        this.historyRepo = historyRepo;
    }
    async findAll(filters) {
        const { search, status, condition, categoryId, departmentId, page = 1, limit = 20 } = filters;
        const qb = this.assetRepo.createQueryBuilder('asset')
            .leftJoinAndSelect('asset.history', 'history')
            .where('asset.deletedAt IS NULL');
        if (search) {
            const term = `%${search}%`;
            qb.andWhere(`(asset.name ILIKE :term OR asset.assetId ILIKE :term OR asset.serialNumber ILIKE :term OR asset.manufacturer ILIKE :term OR asset.model ILIKE :term)`, { term });
        }
        if (status) {
            qb.andWhere('asset.status = :status', { status });
        }
        if (condition) {
            qb.andWhere('asset.condition = :condition', { condition });
        }
        if (categoryId) {
            qb.andWhere('asset.categoryId = :categoryId', { categoryId });
        }
        if (departmentId) {
            qb.andWhere('asset.departmentId = :departmentId', { departmentId });
        }
        const [data, total] = await qb
            .skip((page - 1) * limit)
            .take(limit)
            .getManyAndCount();
        return { data, total, page, limit };
    }
    async findOne(id) {
        const asset = await this.assetRepo.findOne({
            where: { id },
            relations: ['history'],
            withDeleted: true,
        });
        if (!asset) {
            throw new common_1.NotFoundException(`Asset with id "${id}" not found`);
        }
        return asset;
    }
    async update(id, dto, performedBy) {
        const asset = await this.assetRepo.findOne({
            where: { id },
            relations: ['history'],
        });
        if (!asset) {
            throw new common_1.NotFoundException(`Asset with id "${id}" not found`);
        }
        const changes = {};
        for (const key of Object.keys(dto)) {
            const k = key;
            if (dto[k] !== undefined && asset[k] !== dto[k]) {
                changes[k] = { old: asset[k], new: dto[k] };
                asset[k] = dto[k];
            }
        }
        const updated = await this.assetRepo.save(asset);
        if (Object.keys(changes).length > 0) {
            const history = this.historyRepo.create({
                asset: updated,
                action: enums_1.AssetHistoryAction.UPDATED,
                changes,
                performedBy,
            });
            await this.historyRepo.save(history);
        }
        return updated;
    }
    async softDelete(id, performedBy) {
        const asset = await this.assetRepo.findOne({ where: { id } });
        if (!asset) {
            throw new common_1.NotFoundException(`Asset with id "${id}" not found`);
        }
        await this.assetRepo.softDelete(id);
        const history = this.historyRepo.create({
            asset,
            action: enums_1.AssetHistoryAction.DELETED,
            changes: null,
            performedBy,
        });
        await this.historyRepo.save(history);
    }
    async restore(id, performedBy) {
        const asset = await this.assetRepo.findOne({
            where: { id },
            withDeleted: true,
        });
        if (!asset) {
            throw new common_1.NotFoundException(`Asset with id "${id}" not found`);
        }
        await this.assetRepo.restore(id);
        const restored = await this.assetRepo.findOneOrFail({ where: { id } });
        const history = this.historyRepo.create({
            asset: restored,
            action: enums_1.AssetHistoryAction.RESTORED,
            changes: null,
            performedBy,
        });
        await this.historyRepo.save(history);
        return restored;
    }
};
exports.AssetsService = AssetsService;
exports.AssetsService = AssetsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(asset_entity_1.Asset)),
    __param(1, (0, typeorm_1.InjectRepository)(asset_history_entity_1.AssetHistory)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], AssetsService);
//# sourceMappingURL=assets.service.js.map