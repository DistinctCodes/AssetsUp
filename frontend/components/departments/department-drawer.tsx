'use client';

import { Department, useDepartmentAssets, useDepartmentUsers } from '@/lib/query/hooks/useDepartments';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

interface DepartmentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  department: Department | null;
}

export function DepartmentDrawer({ isOpen, onClose, department }: DepartmentDrawerProps) {
  const { data: users, isLoading: usersLoading } = useDepartmentUsers(department?.id);
  const { data: assets, isLoading: assetsLoading } = useDepartmentAssets(department?.id);

  if (!department) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>{department.name}</SheetTitle>
          <p className="text-sm text-gray-500">{department.description || 'No description provided'}</p>
        </SheetHeader>

        <Tabs defaultValue="members" className="mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="members">Members ({department.memberCount})</TabsTrigger>
            <TabsTrigger value="assets">Assets ({department.assetCount})</TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="space-y-4 mt-4">
            {usersLoading ? (
              <p className="text-sm text-gray-500">Loading members...</p>
            ) : (
              users?.map((user: any) => (
                <div key={user.id} className="flex justify-between items-center p-3 border rounded-md">
                  <div>
                    <p className="font-medium text-sm">{user.firstName} {user.lastName}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                  <Badge variant="outline">{user.role}</Badge>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="assets" className="space-y-4 mt-4">
            {assetsLoading ? (
              <p className="text-sm text-gray-500">Loading assets...</p>
            ) : (
              assets?.map((asset: any) => (
                <div key={asset.id} className="flex justify-between items-center p-3 border rounded-md">
                  <div>
                    <p className="font-medium text-sm">{asset.name}</p>
                    <p className="text-xs text-gray-500">Tag: {asset.assetTag}</p>
                  </div>
                  <Badge>{asset.status}</Badge>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}