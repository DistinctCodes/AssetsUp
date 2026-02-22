"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Clock, FileText, Hash } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/assets/status-badge";
import { ConditionBadge } from "@/components/assets/condition-badge";
import { useAsset, useAssetHistory } from "@/lib/query/hooks/useAsset";

type Tab = "overview" | "history";

export default function AssetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");

  const { data: asset, isLoading } = useAsset(id);
  const { data: history = [] } = useAssetHistory(id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400 text-sm">
        Loading asset...
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="text-center py-24">
        <p className="text-gray-500 mb-4">Asset not found.</p>
        <Button variant="outline" onClick={() => router.push("/assets")}>
          Back to Assets
        </Button>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "overview", label: "Overview", icon: <FileText size={15} /> },
    { key: "history", label: "History", icon: <Clock size={15} /> },
  ];

  return (
    <div>
      {/* Back */}
      <button
        onClick={() => router.push("/assets")}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-5 transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Assets
      </button>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 px-6 py-5 mb-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs text-gray-400 flex items-center gap-1">
                <Hash size={12} /> {asset.assetId}
              </span>
            </div>
            <h1 className="text-xl font-bold text-gray-900">{asset.name}</h1>
            {asset.description && (
              <p className="text-sm text-gray-500 mt-1">{asset.description}</p>
            )}
            <div className="flex items-center gap-2 mt-3">
              <StatusBadge status={asset.status} />
              <ConditionBadge condition={asset.condition} />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {tabs.map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === key
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Basic info */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">
              Asset Details
            </h2>
            <dl className="space-y-3">
              <DetailRow label="Category" value={asset.category?.name} />
              <DetailRow label="Department" value={asset.department?.name} />
              <DetailRow
                label="Assigned To"
                value={
                  asset.assignedTo
                    ? `${asset.assignedTo.firstName} ${asset.assignedTo.lastName}`
                    : undefined
                }
                fallback="Unassigned"
              />
              <DetailRow label="Location" value={asset.location} />
              <DetailRow label="Serial Number" value={asset.serialNumber} />
              <DetailRow label="Manufacturer" value={asset.manufacturer} />
              <DetailRow label="Model" value={asset.model} />
            </dl>
          </div>

          {/* Financial info */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">
              Financial & Dates
            </h2>
            <dl className="space-y-3">
              <DetailRow
                label="Purchase Price"
                value={
                  asset.purchasePrice != null
                    ? `$${Number(asset.purchasePrice).toLocaleString()}`
                    : undefined
                }
              />
              <DetailRow
                label="Current Value"
                value={
                  asset.currentValue != null
                    ? `$${Number(asset.currentValue).toLocaleString()}`
                    : undefined
                }
              />
              <DetailRow
                label="Purchase Date"
                value={
                  asset.purchaseDate
                    ? format(new Date(asset.purchaseDate), "MMM d, yyyy")
                    : undefined
                }
              />
              <DetailRow
                label="Warranty Expires"
                value={
                  asset.warrantyExpiration
                    ? format(new Date(asset.warrantyExpiration), "MMM d, yyyy")
                    : undefined
                }
              />
              <DetailRow
                label="Registered"
                value={format(new Date(asset.createdAt), "MMM d, yyyy")}
              />
              <DetailRow
                label="Last Updated"
                value={format(new Date(asset.updatedAt), "MMM d, yyyy")}
              />
            </dl>
          </div>

          {/* Tags & notes */}
          {(asset.tags?.length || asset.notes) && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 lg:col-span-2">
              {asset.tags && asset.tags.length > 0 && (
                <div className="mb-4">
                  <h2 className="text-sm font-semibold text-gray-900 mb-2">
                    Tags
                  </h2>
                  <div className="flex flex-wrap gap-1.5">
                    {asset.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {asset.notes && (
                <div>
                  <h2 className="text-sm font-semibold text-gray-900 mb-2">
                    Notes
                  </h2>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">
                    {asset.notes}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === "history" && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">
            Change History
          </h2>
          {history.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">
              No history recorded yet.
            </p>
          ) : (
            <ol className="relative border-l border-gray-200 ml-3 space-y-6">
              {history.map((event) => (
                <li key={event.id} className="ml-4">
                  <div className="absolute -left-1.5 mt-1.5 w-3 h-3 rounded-full bg-gray-300 border-2 border-white" />
                  <p className="text-sm font-medium text-gray-900">
                    {event.description}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {format(new Date(event.createdAt), "MMM d, yyyy · h:mm a")}
                    {event.performedBy &&
                      ` · ${event.performedBy.firstName} ${event.performedBy.lastName}`}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}

function DetailRow({
  label,
  value,
  fallback = "—",
}: {
  label: string;
  value?: string | null;
  fallback?: string;
}) {
  return (
    <div className="flex justify-between text-sm">
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-gray-900 font-medium text-right">
        {value || fallback}
      </dd>
    </div>
  );
}
