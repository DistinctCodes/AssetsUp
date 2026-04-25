import { AssetHistory } from './asset-history.entity';
export declare class Asset {
    id: string;
    name: string;
    description: string | null;
    assetId: string | null;
    serialNumber: string | null;
    manufacturer: string | null;
    model: string | null;
    categoryId: string | null;
    departmentId: string | null;
    location: string | null;
    condition: string | null;
    value: number | null;
    purchasePrice: number | null;
    currentValue: number | null;
    purchaseDate: Date | null;
    warrantyExpiration: Date | null;
    status: string;
    assignedToId: string | null;
    tags: string[] | null;
    notes: string | null;
    createdBy: string | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    history: AssetHistory[];
}
