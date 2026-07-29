'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useUpdateAsset } from '@/lib/query/hooks/useAsset';
import { useLocations } from '@/lib/query/hooks/useLocations';
import { flattenLocationsForSelect } from '@/lib/api/locations';
import type { Asset } from '@/lib/query/types/asset';

interface EditAssetModalProps {
  asset: Asset;
  isOpen: boolean;
  onClose: () => void;
}

export function EditAssetModal({ asset, isOpen, onClose }: EditAssetModalProps) {
  const [name, setName] = useState(asset.name);
  const [description, setDescription] = useState(asset.description || '');
  const [location, setLocation] = useState(asset.location || '');
  const [locationId, setLocationId] = useState(asset.locationId || '');
  const [manufacturer, setManufacturer] = useState(asset.manufacturer || '');
  const [model, setModel] = useState(asset.model || '');
  const [serialNumber, setSerialNumber] = useState(asset.serialNumber || '');
  const updateAsset = useUpdateAsset(asset.id, { onSuccess: onClose });
  const { data: locations = [] } = useLocations();
  const locationOptions = flattenLocationsForSelect(locations);

  useEffect(() => {
    if (isOpen) {
      setName(asset.name);
      setDescription(asset.description || '');
      setLocation(asset.location || '');
      setLocationId(asset.locationId || '');
      setManufacturer(asset.manufacturer || '');
      setModel(asset.model || '');
      setSerialNumber(asset.serialNumber || '');
    }
  }, [isOpen, asset]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateAsset.mutateAsync({
      name,
      description: description || undefined,
      location: location || undefined,
      locationId: locationId || undefined,
      manufacturer: manufacturer || undefined,
      model: model || undefined,
      serialNumber: serialNumber || undefined,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Asset</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-name">Name</Label>
              <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea id="edit-description" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="edit-locationId">Location</Label>
              <select
                id="edit-locationId"
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                <option value="">Unassigned</option>
                {locationOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="edit-location">Location notes (optional)</Label>
              <Input id="edit-location" value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="edit-manufacturer">Manufacturer</Label>
              <Input id="edit-manufacturer" value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="edit-model">Model</Label>
              <Input id="edit-model" value={model} onChange={(e) => setModel(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="edit-serialNumber">Serial Number</Label>
              <Input id="edit-serialNumber" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={updateAsset.isPending}>Save Changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
