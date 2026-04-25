import { Repository } from 'typeorm';
import { Asset } from './asset.entity';
import { AssetHistory } from './asset-history.entity';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { AssetFiltersDto } from './dto/asset-filters.dto';
export declare class AssetsService {
    private readonly assetRepo;
    private readonly historyRepo;
    constructor(assetRepo: Repository<Asset>, historyRepo: Repository<AssetHistory>);
    findAll(filters: AssetFiltersDto): Promise<{
        data: Asset[];
        total: number;
        page: number;
        limit: number;
    }>;
    findOne(id: string): Promise<Asset>;
    update(id: string, dto: UpdateAssetDto, performedBy: string): Promise<Asset>;
    softDelete(id: string, performedBy: string): Promise<void>;
    restore(id: string, performedBy: string): Promise<Asset>;
}
