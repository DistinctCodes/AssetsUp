import { Asset } from './asset.entity';
import { AssetHistoryAction } from './enums';
export declare class AssetHistory {
    id: string;
    asset: Asset;
    action: AssetHistoryAction;
    changes: Record<string, unknown> | null;
    performedBy: string | null;
    createdAt: Date;
}
