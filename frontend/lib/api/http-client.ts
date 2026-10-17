/**
 * Single HTTP client for the frontend.
 *
 * All API requests should go through the `api` axios instance from `lib/api.ts`.
 * Per-resource modules in `lib/api/*.ts` wrap specific endpoints.
 *
 * The legacy `apiClient.request` wrapper in `lib/api/client.ts` is deprecated;
 * new code should use the resource modules directly. Raw `fetch('/api/...')`
 * calls should be replaced with `api.get/post/patch/delete(...)` to ensure
 * the correct base URL and auth token are attached.
 *
 * @example
 * import { api } from '@/lib/api';
 * const { data } = await api.get('/assets');
 *
 * @example
 * import { assetApiClient } from '@/lib/api/assets';
 * const assets = await assetApiClient.getAssets();
 */
export { api } from '../api';