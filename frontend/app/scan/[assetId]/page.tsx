"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Package, AlertTriangle, LogIn, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/assets/status-badge";
import axios from "axios";

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

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:6003/api";

export default function ScanPage() {
  const params = useParams();
  const router = useRouter();
  const assetId = params.assetId as string;
  const [asset, setAsset] = useState<PublicAsset | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    axios
      .get<PublicAsset>(`${API_BASE}/assets/scan/${assetId}`)
      .then((r) => setAsset(r.data?.data ?? r.data))
      .catch((err) => {
        if (err.response?.status === 404) {
          setNotFound(true);
        } else {
          setError(true);
        }
      })
      .finally(() => setLoading(false));
  }, [assetId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-400 text-sm">Loading asset...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <WifiOff className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Connection Error</h1>
          <p className="text-gray-500 text-sm mb-4">
            Could not reach the server. Please check your connection and try again.
          </p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
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
          <p className="text-xs text-gray-400 mb-4">
            If you found this asset, please contact the owner for assistance.
          </p>
          <Button variant="outline" size="sm" onClick={() => router.push("/login")}>
            <LogIn className="w-4 h-4 mr-2" /> Log in for more options
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto">
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