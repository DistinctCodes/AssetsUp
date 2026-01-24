'use client';
import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Skeleton } from '@/components/ui/Skeleton';
import { AssetOverview } from '@/components/assets/AssetOverview';
import { AssetActions } from '@/components/assets/AssetActions';
import { HistoryTimeline } from '@/components/assets/HistoryTimeline';
import { DocumentList } from '@/components/assets/DocumentList';
import { MaintenanceList } from '@/components/assets/MaintenanceList';
import { NotesList } from '@/components/assets/NotesList';
import { TransferModal } from '@/components/assets/modals/TransferModal';
import { MaintenanceModal } from '@/components/assets/modals/MaintenanceModal';
import { UploadDocumentModal } from '@/components/assets/modals/UploadDocumentModal';
import {
  useAsset,
  useAssetHistory,
  useAssetDocuments,
  useMaintenanceRecords,
  useAssetNotes,
  useUpdateAssetStatus,
  useDeleteAsset,
  useDeleteDocument,
  useCreateNote,
} from '@/lib/query/hooks/useAsset';
import { generateAssetLabelPDF } from '@/lib/utils/pdfGenerator';
import { AssetStatus } from '@/lib/query/types/asset';
import Link from 'next/link';

export default function AssetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const assetId = params.id as string;

  // Modal states
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Queries
  const { data: asset, isLoading, error } = useAsset(assetId);
  const { data: history = [], isLoading: isLoadingHistory } =
    useAssetHistory(assetId);
  const { data: documents = [], isLoading: isLoadingDocs } =
    useAssetDocuments(assetId);
  const { data: maintenance = [], isLoading: isLoadingMaintenance } =
    useMaintenanceRecords(assetId);
  const { data: notes = [], isLoading: isLoadingNotes } =
    useAssetNotes(assetId);

  // Mutations
  const updateStatus = useUpdateAssetStatus(assetId);
  const deleteAsset = useDeleteAsset(assetId, {
    onSuccess: () => router.push('/assets'),
  });
  const deleteDocument = useDeleteDocument(assetId);
  const createNote = useCreateNote(assetId);

  // 404 handling
  if (error) {
    const statusCode = (error as { statusCode?: number }).statusCode;
    if (statusCode === 404) {
      return <AssetNotFound />;
    }
  }

  // Loading state
  if (isLoading) {
    return <AssetDetailSkeleton />;
  }

  if (!asset) {
    return <AssetNotFound />;
  }

  const handleStatusChange = (status: AssetStatus) => {
    updateStatus.mutate({ status });
  };

  const handlePrintLabel = async () => {
    await generateAssetLabelPDF(asset);
  };

  const breadcrumbItems = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Assets', href: '/assets' },
    { label: asset.name },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <Breadcrumb items={breadcrumbItems} />

      {/* Header with Actions */}
      <div className="mt-6 mb-8">
        <AssetActions
          assetId={assetId}
          assetName={asset.name}
          onTransfer={() => setShowTransferModal(true)}
          onScheduleMaintenance={() => setShowMaintenanceModal(true)}
          onUploadDocument={() => setShowUploadModal(true)}
          onAddNote={() => {}}
          onPrintLabel={handlePrintLabel}
          onDelete={() => deleteAsset.mutate()}
          isDeleting={deleteAsset.isPending}
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="mt-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="overview">
            <AssetOverview
              asset={asset}
              onStatusChange={handleStatusChange}
              onEdit={() => router.push(`/assets/${assetId}/edit`)}
              isUpdatingStatus={updateStatus.isPending}
            />
          </TabsContent>

          <TabsContent value="history">
            <HistoryTimeline events={history} isLoading={isLoadingHistory} />
          </TabsContent>

          <TabsContent value="documents">
            <DocumentList
              documents={documents}
              onUpload={() => setShowUploadModal(true)}
              onDelete={(id) => deleteDocument.mutate(id)}
              isLoading={isLoadingDocs}
            />
          </TabsContent>

          <TabsContent value="maintenance">
            <MaintenanceList
              records={maintenance}
              onSchedule={() => setShowMaintenanceModal(true)}
              isLoading={isLoadingMaintenance}
            />
          </TabsContent>

          <TabsContent value="notes">
            <NotesList
              notes={notes}
              onAddNote={(content) => createNote.mutate({ content })}
              isLoading={isLoadingNotes}
              isAdding={createNote.isPending}
            />
          </TabsContent>
        </div>
      </Tabs>

      {/* Modals */}
      <TransferModal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        assetId={assetId}
      />
      <MaintenanceModal
        isOpen={showMaintenanceModal}
        onClose={() => setShowMaintenanceModal(false)}
        assetId={assetId}
      />
      <UploadDocumentModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        assetId={assetId}
      />
    </div>
  );
}

function AssetNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <h1 className="text-6xl font-bold text-gray-200">404</h1>
      <h2 className="text-2xl font-semibold text-gray-900 mt-4">
        Asset Not Found
      </h2>
      <p className="text-gray-600 mt-2 text-center">
        The asset you&apos;re looking for doesn&apos;t exist or has been
        removed.
      </p>
      <Link
        href="/assets"
        className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Back to Assets
      </Link>
    </div>
  );
}

function AssetDetailSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Skeleton className="h-6 w-64 mb-6" />
      <div className="flex flex-wrap gap-2 mb-8">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-9 w-24" />
        ))}
      </div>
      <Skeleton className="h-10 w-96 mb-6" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          <Skeleton className="h-80" />
          <Skeleton className="h-48" />
        </div>
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-4 w-1/4" />
          <div className="flex gap-4">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-6 w-20" />
          </div>
          <Skeleton className="h-24" />
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
