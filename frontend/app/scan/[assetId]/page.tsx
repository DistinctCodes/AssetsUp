"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Package, ExternalLink, AlertTriangle, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/assets/status-badge";

interface PublicAsset {
  id: string;
  assetId: string;
  name: string;
  category?: string;
  status: string;
  imageUrl?: string;
  organization?: string;
  contactEmail?: string;
}

export default function ScanPage() {
  const params = useParams();
  const router = useRouter();
  const assetId = params.assetId as string;
  const [asset, setAsset] = useState<PublicAsset | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/assets/scan/${assetId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((data) => setAsset(data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [assetId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-400 text-sm">Loading asset...</div>
      </div>
    );
  }

  if (notFound || !asset) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-gray-400" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Asset Not Found</h1>
          <p className="text-gray-500 text-sm mb-4">
            This QR code does not match any registered asset in our system.
          </p>
          <p className="text-xs text-gray-400">
            If you found this asset, please contact the owner for assistance.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto">
        {/* Public view — minimal safe info */}
        <div className="bg-white rounded-2xl shadow-sm border p-6 mb-4">
          {asset.imageUrl && (
            <img src={asset.imageUrl} alt={asset.name} className="w-full h-48 object-cover rounded-xl mb-4" />
          )}
          <div className="flex items-start justify-between mb-3">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">{asset.name}</h1>
              <p className="text-sm text-gray-500 font-mono">{asset.assetId}</p>
            </div>
            <StatusBadge status={asset.status} />
          </div>
          {asset.category && (
            <p className="text-sm text-gray-600 mb-2">Category: {asset.category}</p>
          )}
          {asset.organization && (
            <p className="text-sm text-gray-500">This asset belongs to <strong>{asset.organization}</strong></p>
          )}
          {asset.contactEmail && (
            <p className="text-xs text-gray-400 mt-1">Contact: {asset.contactEmail}</p>
          )}
        </div>

        {/* Quick actions */}
        <div className="bg-white rounded-2xl shadow-sm border p-4 space-y-2">
          <Button variant="outline" className="w-full justify-start" onClick={() => router.push("/login")}>
            <LogIn className="w-4 h-4 mr-2" /> Log in for more options
          </Button>
          <Button variant="outline" className="w-full justify-start" onClick={() => {
            const el = document.createElement("a");
            el.href = `mailto:${asset.contactEmail}?subject=Found Asset: ${asset.name} (${asset.assetId})`;
            el.click();
          }}>
            <AlertTriangle className="w-4 h-4 mr-2" /> Report Issue
          </Button>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Powered by AssetsUp
        </p>
      </div>
    </div>
  );
}
