'use client';
import React from 'react';
import { Asset, AssetStatus, AssetCondition } from '@/lib/query/types/asset';
import { Badge } from '@/components/ui/Badge';
import { ImageGallery } from './ImageGallery';
import { QRCodeDisplay } from './QRCodeDisplay';
import { StatusDropdown } from './StatusDropdown';
import {
  Building2,
  MapPin,
  User,
  Calendar,
  DollarSign,
  Tag,
  Hash,
  Edit,
  Factory,
  Box,
} from 'lucide-react';
import Button from '@/components/ui/Button';

interface AssetOverviewProps {
  asset: Asset;
  onStatusChange: (status: AssetStatus) => void;
  onEdit: () => void;
  isUpdatingStatus?: boolean;
}

type BadgeVariant = 'success' | 'warning' | 'danger' | 'default' | 'info';

const conditionVariants: Record<AssetCondition, BadgeVariant> = {
  [AssetCondition.NEW]: 'success',
  [AssetCondition.GOOD]: 'success',
  [AssetCondition.FAIR]: 'warning',
  [AssetCondition.POOR]: 'warning',
  [AssetCondition.DAMAGED]: 'danger',
};

interface DetailItemProps {
  icon: React.ReactNode;
  label: string;
  value: string | null | undefined;
}

function DetailItem({ icon, label, value }: DetailItemProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-gray-400">{icon}</div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-medium text-gray-900">{value || '-'}</p>
      </div>
    </div>
  );
}

export function AssetOverview({
  asset,
  onStatusChange,
  onEdit,
  isUpdatingStatus,
}: AssetOverviewProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column - Images */}
      <div className="lg:col-span-1 space-y-4">
        <ImageGallery images={asset.imageUrls || []} assetName={asset.name} />
        <QRCodeDisplay
          assetId={asset.assetId}
          qrCodeValue={asset.qrCode}
        />
      </div>

      {/* Right Column - Details */}
      <div className="lg:col-span-2">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{asset.name}</h1>
            <p className="text-sm text-gray-500 mt-1">
              Asset ID: {asset.assetId}
            </p>
          </div>
          <Button onClick={onEdit}>
            <Edit className="w-4 h-4 mr-2" /> Edit
          </Button>
        </div>

        {/* Status and Condition */}
        <div className="flex items-center gap-4 mb-6">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Status
            </label>
            <StatusDropdown
              value={asset.status}
              onChange={onStatusChange}
              disabled={isUpdatingStatus}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Condition
            </label>
            <Badge variant={conditionVariants[asset.condition]}>
              {asset.condition}
            </Badge>
          </div>
        </div>

        {/* Description */}
        {asset.description && (
          <p className="text-gray-600 mb-6">{asset.description}</p>
        )}

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DetailItem
            icon={<Tag className="w-4 h-4" />}
            label="Category"
            value={asset.category?.name}
          />
          <DetailItem
            icon={<Building2 className="w-4 h-4" />}
            label="Department"
            value={asset.department?.name}
          />
          <DetailItem
            icon={<MapPin className="w-4 h-4" />}
            label="Location"
            value={asset.location}
          />
          <DetailItem
            icon={<User className="w-4 h-4" />}
            label="Assigned To"
            value={asset.assignedTo?.name}
          />
          <DetailItem
            icon={<Hash className="w-4 h-4" />}
            label="Serial Number"
            value={asset.serialNumber}
          />
          <DetailItem
            icon={<Factory className="w-4 h-4" />}
            label="Manufacturer"
            value={asset.manufacturer}
          />
          <DetailItem
            icon={<Box className="w-4 h-4" />}
            label="Model"
            value={asset.model}
          />
          <DetailItem
            icon={<Calendar className="w-4 h-4" />}
            label="Purchase Date"
            value={
              asset.purchaseDate
                ? new Date(asset.purchaseDate).toLocaleDateString()
                : null
            }
          />
          <DetailItem
            icon={<DollarSign className="w-4 h-4" />}
            label="Purchase Price"
            value={
              asset.purchasePrice
                ? `$${asset.purchasePrice.toLocaleString()}`
                : null
            }
          />
          <DetailItem
            icon={<DollarSign className="w-4 h-4" />}
            label="Current Value"
            value={
              asset.currentValue
                ? `$${asset.currentValue.toLocaleString()}`
                : null
            }
          />
          <DetailItem
            icon={<Calendar className="w-4 h-4" />}
            label="Warranty Expires"
            value={
              asset.warrantyExpiration
                ? new Date(asset.warrantyExpiration).toLocaleDateString()
                : null
            }
          />
        </div>

        {/* Tags */}
        {asset.tags && asset.tags.length > 0 && (
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags
            </label>
            <div className="flex flex-wrap gap-2">
              {asset.tags.map((tag, i) => (
                <Badge key={i} variant="default">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Custom Fields */}
        {asset.customFields && Object.keys(asset.customFields).length > 0 && (
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Custom Fields
            </label>
            <div className="bg-gray-50 rounded-lg p-4">
              {Object.entries(asset.customFields).map(([key, value]) => (
                <div key={key} className="flex justify-between py-1">
                  <span className="text-sm text-gray-500">{key}</span>
                  <span className="text-sm text-gray-900">{String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {asset.notes && (
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-4">
              {asset.notes}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
