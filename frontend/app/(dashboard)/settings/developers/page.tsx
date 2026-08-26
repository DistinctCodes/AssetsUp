"use client";

import { useState } from "react";
import { Plus, Trash2, Eye, EyeOff, Copy, Send, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface APIKey {
  id: string;
  name: string;
  prefix: string;
  lastUsed?: string;
  isActive: boolean;
  expiresAt?: string;
  scopes: string[];
}

interface Webhook {
  id: string;
  url: string;
  events: string[];
  isActive: boolean;
  signingSecret?: string;
  recentDeliveries: { timestamp: string; event: string; status: number }[];
}

const EVENT_OPTIONS = ["asset.created", "asset.updated", "asset.deleted", "transfer.requested", "transfer.approved", "maintenance.created"];

export default function DevelopersPage() {
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [showCreateKey, setShowCreateKey] = useState(false);
  const [showCreateWebhook, setShowCreateWebhook] = useState(false);
  const [newKeySecret, setNewKeySecret] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: "key" | "webhook"; id: string } | null>(null);
  const [expandedWebhook, setExpandedWebhook] = useState<string | null>(null);

  const handleCreateKey = (name: string, scopes: string[]) => {
    const secret = "ak_" + Array.from({ length: 48 }, () => "abcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(Math.random() * 36)]).join("");
    setApiKeys((prev) => [...prev, {
      id: Date.now().toString(),
      name,
      prefix: secret.slice(0, 8),
      isActive: true,
      scopes,
    }]);
    setNewKeySecret(secret);
    setShowCreateKey(false);
  };

  const handleCreateWebhook = (url: string, events: string[]) => {
    const secret = "whsec_" + Array.from({ length: 32 }, () => "abcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(Math.random() * 36)]).join("");
    setWebhooks((prev) => [...prev, {
      id: Date.now().toString(),
      url,
      events,
      isActive: true,
      signingSecret: secret,
      recentDeliveries: [],
    }]);
    setShowCreateWebhook(false);
  };

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Developer Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage API keys and webhooks</p>
      </div>

      {/* API Keys */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">API Keys</h2>
          <Button size="sm" onClick={() => setShowCreateKey(true)}>
            <Plus className="w-4 h-4 mr-1" /> Create Key
          </Button>
        </div>
        <div className="bg-white border rounded-xl divide-y">
          {apiKeys.length === 0 ? (
            <p className="p-6 text-center text-gray-400 text-sm">No API keys yet</p>
          ) : (
            apiKeys.map((key) => (
              <div key={key.id} className="flex items-center gap-4 px-4 py-3">
                <div className="flex-1">
                  <p className="text-sm font-medium">{key.name}</p>
                  <p className="text-xs text-gray-500 font-mono">{key.prefix}... · {key.scopes.join(", ")}</p>
                </div>
                {key.lastUsed && <span className="text-xs text-gray-400">Last used: {key.lastUsed}</span>}
                <Badge className={key.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}>
                  {key.isActive ? "Active" : "Revoked"}
                </Badge>
                <button onClick={() => setDeleteTarget({ type: "key", id: key.id })} className="text-red-400 hover:text-red-600">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Webhooks */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Webhooks</h2>
          <Button size="sm" onClick={() => setShowCreateWebhook(true)}>
            <Plus className="w-4 h-4 mr-1" /> Add Webhook
          </Button>
        </div>
        <div className="bg-white border rounded-xl divide-y">
          {webhooks.length === 0 ? (
            <p className="p-6 text-center text-gray-400 text-sm">No webhooks configured</p>
          ) : (
            webhooks.map((wh) => (
              <div key={wh.id}>
                <div className="flex items-center gap-4 px-4 py-3">
                  <button onClick={() => setExpandedWebhook(expandedWebhook === wh.id ? null : wh.id)}>
                    {expandedWebhook === wh.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                  <div className="flex-1">
                    <p className="text-sm font-medium font-mono">{wh.url}</p>
                    <p className="text-xs text-gray-500">{wh.events.join(", ")}</p>
                  </div>
                  <Badge className={wh.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}>
                    {wh.isActive ? "Active" : "Disabled"}
                  </Badge>
                  <Button variant="outline" size="sm"><Send className="w-3 h-3 mr-1" /> Test</Button>
                  <button onClick={() => setDeleteTarget({ type: "webhook", id: wh.id })} className="text-red-400 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {expandedWebhook === wh.id && (
                  <div className="px-12 pb-4 space-y-2">
                    {wh.signingSecret && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Signing secret:</span>
                        <code className="text-xs bg-gray-100 px-2 py-0.5 rounded">{wh.signingSecret.slice(0, 16)}...</code>
                        <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(wh.signingSecret ?? "")}>
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                    <p className="text-xs text-gray-500">Recent deliveries: {wh.recentDeliveries.length}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      {/* New key secret display */}
      {newKeySecret && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h3 className="font-semibold mb-2">API Key Created</h3>
            <p className="text-sm text-gray-500 mb-3">Copy this key now. It won&apos;t be shown again.</p>
            <div className="bg-gray-100 rounded-lg p-3 font-mono text-xs break-all">{newKeySecret}</div>
            <div className="flex justify-end gap-2 mt-4">
              <Button onClick={() => { navigator.clipboard.writeText(newKeySecret); setNewKeySecret(null); }}>
                <Copy className="w-4 h-4 mr-1" /> Copy & Close
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onConfirm={() => {
          if (deleteTarget?.type === "key") setApiKeys((p) => p.filter((k) => k.id !== deleteTarget.id));
          if (deleteTarget?.type === "webhook") setWebhooks((p) => p.filter((w) => w.id !== deleteTarget.id));
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
        title={`Delete ${deleteTarget?.type === "key" ? "API Key" : "Webhook"}`}
        description="This action cannot be undone."
      />

      {showCreateKey && <CreateKeyModal onSave={handleCreateKey} onClose={() => setShowCreateKey(false)} />}
      {showCreateWebhook && <CreateWebhookModal onSave={handleCreateWebhook} onClose={() => setShowCreateWebhook(false)} />}
    </div>
  );
}

function CreateKeyModal({ onSave, onClose }: { onSave: (name: string, scopes: string[]) => void; onClose: () => void }) {
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<string[]>(["assets:read"]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
        <h3 className="font-semibold mb-4">Create API Key</h3>
        <Input placeholder="Key name" value={name} onChange={(e) => setName(e.target.value)} className="mb-3" />
        <div className="mb-3">
          <p className="text-xs text-gray-500 mb-1">Scopes</p>
          <div className="flex flex-wrap gap-1">
            {["assets:read", "assets:write", "users:read", "reports:read"].map((s) => (
              <button key={s} onClick={() => setScopes((p) => p.includes(s) ? p.filter((x) => x !== s) : [...p, s])}
                className={`px-2 py-0.5 text-xs rounded-full border ${scopes.includes(s) ? "bg-gray-900 text-white border-gray-900" : "border-gray-300 text-gray-600"}`}>
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(name, scopes)} disabled={!name}>Create</Button>
        </div>
      </div>
    </div>
  );
}

function CreateWebhookModal({ onSave, onClose }: { onSave: (url: string, events: string[]) => void; onClose: () => void }) {
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>([]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
        <h3 className="font-semibold mb-4">Add Webhook</h3>
        <Input placeholder="Endpoint URL" value={url} onChange={(e) => setUrl(e.target.value)} className="mb-3" />
        <div className="mb-3">
          <p className="text-xs text-gray-500 mb-1">Events</p>
          <div className="flex flex-wrap gap-1">
            {EVENT_OPTIONS.map((e) => (
              <button key={e} onClick={() => setEvents((p) => p.includes(e) ? p.filter((x) => x !== e) : [...p, e])}
                className={`px-2 py-0.5 text-xs rounded-full border ${events.includes(e) ? "bg-gray-900 text-white border-gray-900" : "border-gray-300 text-gray-600"}`}>
                {e}
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(url, events)} disabled={!url}>Create</Button>
        </div>
      </div>
    </div>
  );
}
