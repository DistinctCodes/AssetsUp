import { api } from '../api';

export interface APIKey {
  id: string;
  name: string;
  prefix: string;
  lastUsed?: string;
  isActive: boolean;
  expiresAt?: string;
  scopes: string[];
}

export interface Webhook {
  id: string;
  url: string;
  events: string[];
  isActive: boolean;
  signingSecret?: string;
  recentDeliveries: { timestamp: string; event: string; status: number }[];
}

export const developerSettingsApiClient = {
  listApiKeys: (): Promise<APIKey[]> =>
    api.get<APIKey[]>('/developer/api-keys').then((r) => r.data),
  createApiKey: (name: string, scopes: string[]): Promise<{ key: APIKey; secret: string }> =>
    api.post<{ key: APIKey; secret: string }>('/developer/api-keys', { name, scopes }).then((r) => r.data),
  revokeApiKey: (id: string): Promise<void> =>
    api.delete(`/developer/api-keys/${id}`).then(() => undefined),
  listWebhooks: (): Promise<Webhook[]> =>
    api.get<Webhook[]>('/developer/webhooks').then((r) => r.data),
  createWebhook: (url: string, events: string[]): Promise<Webhook> =>
    api.post<Webhook>('/developer/webhooks', { url, events }).then((r) => r.data),
  deleteWebhook: (id: string): Promise<void> =>
    api.delete(`/developer/webhooks/${id}`).then(() => undefined),
  testWebhook: (id: string): Promise<{ status: number }> =>
    api.post<{ status: number }>(`/developer/webhooks/${id}/test`).then((r) => r.data),
  rotateWebhookSecret: (id: string): Promise<{ signingSecret: string }> =>
    api.post<{ signingSecret: string }>(`/developer/webhooks/${id}/rotate-secret`).then((r) => r.data),
};