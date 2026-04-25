import { AssetsService } from './assets.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { AssetFiltersDto } from './dto/asset-filters.dto';
export declare class AssetsController {
    private readonly assetsService;
    constructor(assetsService: AssetsService);
    create(dto: CreateAssetDto, userId: string): Promise<import("./asset.entity").Asset>;
    findAll(filters: AssetFiltersDto): Promise<{
        data: import("./asset.entity").Asset[];
        total: number;
        page: number;
        limit: number;
    }>;
    findOne(id: string): Promise<import("./asset.entity").Asset>;
    update(id: string, dto: UpdateAssetDto, userId: string): Promise<import("./asset.entity").Asset>;
    remove(id: string, userId: string): Promise<void>;
    restore(id: string, userId: string): Promise<import("./asset.entity").Asset>;
}
