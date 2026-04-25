import { User } from '../users/user.entity';
export declare class AssetDocument {
    id: string;
    assetId: string;
    name: string;
    url: string;
    type: string;
    size: number;
    uploadedBy: User;
    createdAt: Date;
}
