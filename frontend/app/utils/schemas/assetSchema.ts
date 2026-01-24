import { z } from 'zod';

export const assetSchema = z.object({
  basic: z.object({
    name: z.string().min(2, "Asset name is required"),
    serialNumber: z.string().min(2, "Serial/ID is required"),
    category: z.string().min(1, "Select a category"),
  }),
  details: z.object({
    description: z.string().optional(),
    purchaseDate: z.string().min(1, "Purchase date is required"),
    purchasePrice: z
      .number({ invalid_type_error: "Must be a number" })
      .min(0, "Price must be positive"),
    warrantyExpiration: z.string().optional(),
  }),
  assignment: z.object({
    department: z.string().min(1, "Select a department"),
    location: z.string().min(1, "Select a location"),
    assignedUser: z.string().optional(),
  }),
  additional: z.object({
    status: z.enum(["active", "inactive"]),
    condition: z.enum(["new", "good", "fair", "poor"]),
    tags: z.array(z.string()).optional(),
    images: z.array(z.instanceof(File)).optional(),
  }),
});

export type AssetFormData = z.infer<typeof assetSchema>;
