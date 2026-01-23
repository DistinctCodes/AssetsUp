import { AssetFormData } from "./schemas/assetSchema";

export const createAsset = async (data: AssetFormData) => {
  const formData = new FormData();

  Object.entries(data).forEach(([section, values]) => {
    if (typeof values === "object" && values !== null) {
      Object.entries(values).forEach(([key, value]) => {
        if (key === "images" && Array.isArray(value)) {
          value.forEach((file) => formData.append("images", file));
        } else formData.append(key, value as any);
      });
    }
  });

  const res = await fetch("/api/assets", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) throw new Error("Failed to create asset");
  return res.json();
};
