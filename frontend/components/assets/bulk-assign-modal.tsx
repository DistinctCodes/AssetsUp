'use client';

import { useState } from 'react';
import { useBulkAssign } from '@/lib/query/hooks/useBulkAssets';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface BulkAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedIds: string[];
  onSuccess: (updated: number, skipped: number) => void;
}

export function BulkAssignModal({ isOpen, onClose, selectedIds, onSuccess }: BulkAssignModalProps) {
  const [assignedToId, setAssignedToId] = useState<string>('');
  const [departmentId, setDepartmentId] = useState<string>('');
  const bulkAssign = useBulkAssign();

  const handleAssign = async () => {
    const res = await bulkAssign.mutateAsync({
      assetIds: selectedIds,
      assignedToId: assignedToId || undefined,
      departmentId: departmentId || undefined,
    });
    onSuccess(res.updatedCount, res.skippedCount);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bulk Assign {selectedIds.length} Assets</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Assign to User</Label>
            <Select value={assignedToId} onValueChange={setAssignedToId}>
              <SelectTrigger><SelectValue placeholder="Select User" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="usr_1">John Doe</SelectItem>
                <SelectItem value="usr_2">Jane Smith</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Assign to Department</Label>
            <Select value={departmentId} onValueChange={setDepartmentId}>
              <SelectTrigger><SelectValue placeholder="Select Department" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="dept_1">Engineering</SelectItem>
                <SelectItem value="dept_2">Operations</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleAssign} loading={bulkAssign.isPending}>
            Apply Assignment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}