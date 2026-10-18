'use client';

import { ReactNode, useState } from 'react';
import Link from 'next/link';
import {
  Department,
  DepartmentAsset,
  DepartmentUser,
  Paginated,
  useDepartmentAssets,
  useDepartmentUsers,
} from '@/lib/query/hooks/useDepartments';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface DepartmentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  department: Department | null;
}

interface PagedQuery<T> {
  data?: Paginated<T>;
  isLoading: boolean;
  isError: boolean;
  refetch: () => unknown;
}

interface PagedListProps<T extends { id: string }> {
  label: string;
  query: PagedQuery<T>;
  page: number;
  onPageChange: (page: number) => void;
  emptyText: string;
  renderRow: (item: T) => ReactNode;
}

function PagedList<T extends { id: string }>({
  label,
  query,
  page,
  onPageChange,
  emptyText,
  renderRow,
}: PagedListProps<T>) {
  if (query.isLoading) {
    return <p className="text-sm text-gray-500">Loading {label}...</p>;
  }

  if (query.isError) {
    return (
      <div role="alert" className="space-y-2">
        <p className="text-sm text-red-600">Could not load {label}.</p>
        <Button variant="outline" onClick={() => query.refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  const items = query.data?.items ?? [];
  if (items.length === 0) {
    return <p className="text-sm text-gray-500">{emptyText}</p>;
  }

  const totalPages = query.data?.totalPages ?? 1;
  return (
    <>
      {items.map(renderRow)}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 text-sm text-gray-500">
          <Button
            variant="outline"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            Previous
          </Button>
          <span>
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </>
  );
}

function DepartmentDrawerBody({ department }: { department: Department }) {
  const [userPage, setUserPage] = useState(1);
  const [assetPage, setAssetPage] = useState(1);
  const usersQuery = useDepartmentUsers(department.id, userPage);
  const assetsQuery = useDepartmentAssets(department.id, assetPage);

  const memberCount = usersQuery.data?.total ?? department.memberCount;
  const assetCount = assetsQuery.data?.total ?? department.assetCount;

  return (
    <Tabs defaultValue="members" className="mt-6">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="members">Members ({memberCount})</TabsTrigger>
        <TabsTrigger value="assets">Assets ({assetCount})</TabsTrigger>
      </TabsList>

      <TabsContent value="members" className="space-y-4 mt-4">
        <PagedList<DepartmentUser>
          label="members"
          query={usersQuery}
          page={userPage}
          onPageChange={setUserPage}
          emptyText="No members in this department"
          renderRow={(user) => (
            <Link
              key={user.id}
              href="/users"
              className="flex justify-between items-center p-3 border rounded-md hover:bg-gray-50"
            >
              <div>
                <p className="font-medium text-sm">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
              <Badge variant="outline">{user.role}</Badge>
            </Link>
          )}
        />
      </TabsContent>

      <TabsContent value="assets" className="space-y-4 mt-4">
        <PagedList<DepartmentAsset>
          label="assets"
          query={assetsQuery}
          page={assetPage}
          onPageChange={setAssetPage}
          emptyText="No assets in this department"
          renderRow={(asset) => (
            <Link
              key={asset.id}
              href={`/assets/${asset.id}`}
              className="flex justify-between items-center p-3 border rounded-md hover:bg-gray-50"
            >
              <div>
                <p className="font-medium text-sm">{asset.name}</p>
                <p className="text-xs text-gray-500">Tag: {asset.assetTag}</p>
              </div>
              <Badge>{asset.status}</Badge>
            </Link>
          )}
        />
      </TabsContent>
    </Tabs>
  );
}

export function DepartmentDrawer({ isOpen, onClose, department }: DepartmentDrawerProps) {
  if (!department) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>{department.name}</SheetTitle>
          <p className="text-sm text-gray-500">
            {department.description || 'No description provided'}
          </p>
        </SheetHeader>

        {/* Keyed so paging resets when another department is opened. */}
        <DepartmentDrawerBody key={department.id} department={department} />
      </SheetContent>
    </Sheet>
  );
}
