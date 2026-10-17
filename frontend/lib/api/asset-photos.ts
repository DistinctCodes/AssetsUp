import { api } from '../api';

export interface AssetPhoto {
  id: string;
  url: string;
  isPrimary: boolean;
  createdAt: string;
}

export const assetPhotosApiClient = {
  list: (assetId: string): Promise<AssetPhoto[]> =>
    api.get<AssetPhoto[]>(`/assets/${assetId}/photos`).then((r) => r.data),

  upload: (assetId: string, file: File): Promise<AssetPhoto> => {
    const form = new FormData();
    form.append('file', file);
    return api.post<AssetPhoto>(`/assets/${assetId}/photos`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data);
  },

  delete: (assetId: string, photoId: string): Promise<void> =>
    api.delete(`/assets/${assetId}/photos/${photoId}`).then(() => undefined),

  setPrimary: (assetId: string, photoId: string): Promise<AssetPhoto> =>
    api.patch<AssetPhoto>(`/assets/${assetId}/photos/${photoId}/primary`).then((r) => r.data),
};