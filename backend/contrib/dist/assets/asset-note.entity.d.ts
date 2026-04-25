import { User } from '../users/user.entity';
export declare class AssetNote {
    id: string;
    assetId: string;
    content: string;
    createdBy: User;
    createdAt: Date;
    updatedAt: Date;
}
