"use client";

import { useState } from "react";
import { Package, AlertTriangle, ArrowRightLeft, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/assets/status-badge";
import { ConditionBadge } from "@/components/assets/condition-badge";

interface MyAsset {
  id: string;
  name: string;
  assetId: string;
  condition: string;
  status: string;
  imageUrl?: string;
  checkedOutAt?: string;
  dueDate?: string;
}

interface MyRequest {
  id: string;
  type: "transfer" | "maintenance";
  title: string;
  status: string;
  createdAt: string;
}

const MOCK_ASSETS: MyAsset[] = [];
const MOCK_REQUESTS: MyRequest[] = [];

export default function MyAssetsPage() {
  const [tab, setTab] = useState<"assets" | "requests">("assets");

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Assets</h1>
        <p className="text-sm text-gray-500 mt-1">Assets assigned to you and your requests</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        <button onClick={() => setTab("assets")} className={`px-4 py-2 rounded-md text-sm font-medium ${
          tab === "assets" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
        }`}>
          My Assets ({MOCK_ASSETS.length})
        </button>
        <button onClick={() => setTab("requests")} className={`px-4 py-2 rounded-md text-sm font-medium ${
          tab === "requests" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
        }`}>
          My Requests ({MOCK_REQUESTS.length})
        </button>
      </div>

      {tab === "assets" && (
        <div className="space-y-3">
          {MOCK_ASSETS.length === 0 ? (
            <div className="bg-white border rounded-xl p-12 text-center">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No assets assigned to you yet</p>
            </div>
          ) : (
            MOCK_ASSETS.map((asset) => (
              <div key={asset.id} className="bg-white border rounded-xl p-4 flex items-center gap-4">
                {asset.imageUrl ? (
                  <img src={asset.imageUrl} alt="" className="w-12 h-12 rounded-lg object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                    <Package className="w-6 h-6 text-gray-400" />
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{asset.name}</p>
                  <p className="text-xs text-gray-500">{asset.assetId}</p>
                </div>
                <StatusBadge status={asset.status} />
                <ConditionBadge condition={asset.condition} />
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <AlertTriangle className="w-3 h-3 mr-1" /> Report Issue
                  </Button>
                  <Button variant="outline" size="sm">
                    <ArrowRightLeft className="w-3 h-3 mr-1" /> Request Transfer
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "requests" && (
        <div className="space-y-3">
          {MOCK_REQUESTS.length === 0 ? (
            <div className="bg-white border rounded-xl p-12 text-center">
              <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No requests yet</p>
            </div>
          ) : (
            MOCK_REQUESTS.map((req) => (
              <div key={req.id} className="bg-white border rounded-xl p-4 flex items-center gap-4">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{req.title}</p>
                  <p className="text-xs text-gray-500 capitalize">{req.type} · {new Date(req.createdAt).toLocaleDateString()}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  req.status === "PENDING" ? "bg-yellow-100 text-yellow-700" :
                  req.status === "APPROVED" ? "bg-green-100 text-green-700" :
                  "bg-gray-100 text-gray-600"
                }`}>{req.status}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
