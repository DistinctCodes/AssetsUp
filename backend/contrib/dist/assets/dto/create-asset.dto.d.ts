export declare class CreateAssetDto {
    name: string;
    categoryId: string;
    departmentId: string;
    description?: string;
    serialNumber?: string;
    purchaseDate?: string;
    purchasePrice?: number;
    currentValue?: number;
    warrantyExpiration?: string;
    status?: string;
    condition?: string;
    location?: string;
    assignedToId?: string;
    manufacturer?: string;
    model?: string;
    tags?: string[];
    notes?: string;
}
