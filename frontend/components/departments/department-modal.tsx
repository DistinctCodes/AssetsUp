'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Department, useCreateDepartment, useUpdateDepartment } from '@/lib/query/hooks/useDepartments';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface DepartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  department?: Department | null;
}

interface FormData {
  name: string;
  description?: string;
  managerId?: string;
}

export function DepartmentModal({ isOpen, onClose, department }: DepartmentModalProps) {
  const { register, handleSubmit, reset } = useForm<FormData>();
  const createDepartment = useCreateDepartment();
  const updateDepartment = useUpdateDepartment();

  useEffect(() => {
    if (department) {
      reset({
        name: department.name,
        description: department.description || '',
        managerId: department.managerId || '',
      });
    } else {
      reset({ name: '', description: '', managerId: '' });
    }
  }, [department, reset]);

  const onSubmit = async (data: FormData) => {
    if (department) {
      await updateDepartment.mutateAsync({ id: department.id, payload: data });
    } else {
      await createDepartment.mutateAsync(data);
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{department ? 'Edit Department' : 'Add Department'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="name">Department Name *</Label>
            <Input id="name" {...register('name', { required: true })} required />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" {...register('description')} />
          </div>
          <div>
            <Label htmlFor="managerId">Manager ID</Label>
            <Input id="managerId" {...register('managerId')} placeholder="Select or enter Manager ID" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={createDepartment.isPending || updateDepartment.isPending}>
              {department ? 'Save Changes' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}