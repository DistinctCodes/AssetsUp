'use client';
import React from 'react';
import { AssetDocument } from '@/lib/query/types/asset';
import { Skeleton } from '@/components/ui/Skeleton';
import { FileText, Download, Trash2, Upload } from 'lucide-react';
import Button from '@/components/ui/Button';

interface DocumentListProps {
  documents: AssetDocument[];
  onUpload: () => void;
  onDelete: (id: string) => void;
  isLoading?: boolean;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentList({
  documents,
  onUpload,
  onDelete,
  isLoading,
}: DocumentListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Documents</h3>
        <Button size="sm" onClick={onUpload}>
          <Upload className="w-4 h-4 mr-2" /> Upload
        </Button>
      </div>

      {documents.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No documents uploaded</p>
          <Button size="sm" className="mt-3" onClick={onUpload}>
            <Upload className="w-4 h-4 mr-2" /> Upload Document
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center min-w-0">
                <FileText className="w-8 h-8 text-blue-600 mr-3 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{doc.name}</p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(doc.size)} - Uploaded by{' '}
                    {doc.uploadedBy.name} on{' '}
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex gap-1 flex-shrink-0 ml-2">
                <a
                  href={doc.url}
                  download
                  className="p-2 hover:bg-gray-100 rounded transition-colors"
                  title="Download"
                >
                  <Download className="w-4 h-4 text-gray-600" />
                </a>
                <button
                  onClick={() => onDelete(doc.id)}
                  className="p-2 hover:bg-red-100 rounded transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
