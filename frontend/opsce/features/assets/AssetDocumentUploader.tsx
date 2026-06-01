'use client';

import { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, FileText, Download, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import type { AssetDocument } from '@/lib/query/types/asset';

const ACCEPTED_TYPES: Record<string, string[]> = {
  'application/pdf': ['.pdf'],
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

interface AssetDocumentUploaderProps {
  assetId: string;
  onUploadComplete?: () => void;
}

export function AssetDocumentUploader({ assetId, onUploadComplete }: AssetDocumentUploaderProps) {
  const [documents, setDocuments] = useState<AssetDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loading, setLoading] = useState(true);

  // Fetch existing documents on mount
  useEffect(() => {
    let cancelled = false;

    api.get<AssetDocument[]>(`/assets/${assetId}/documents`)
      .then((res) => {
        if (!cancelled) setDocuments(res.data);
      })
      .catch(() => {
        if (!cancelled) toast.error('Failed to load documents');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [assetId]);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];

      if (file.size > MAX_FILE_SIZE) {
        toast.error('File size exceeds 10 MB limit');
        return;
      }

      setUploading(true);
      setUploadProgress(0);

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('name', file.name);

        const response = await api.post<AssetDocument>(
          `/assets/${assetId}/documents`,
          formData,
          {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: (progressEvent) => {
              if (progressEvent.total) {
                const pct = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                setUploadProgress(pct);
              }
            },
          },
        );

        setDocuments((prev) => [response.data, ...prev]);
        toast.success('Document uploaded successfully');
        onUploadComplete?.();
      } catch (err) {
        console.error('Upload failed:', err);
        toast.error('Failed to upload document. Please try again.');
      } finally {
        setUploading(false);
        setUploadProgress(0);
      }
    },
    [assetId, onUploadComplete],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxFiles: 1,
    maxSize: MAX_FILE_SIZE,
    disabled: uploading,
  });

  const handleDelete = async (documentId: string) => {
    try {
      await api.delete(`/assets/${assetId}/documents/${documentId}`);
      setDocuments((prev) => prev.filter((d) => d.id !== documentId));
      toast.success('Document deleted');
    } catch (err) {
      console.error('Delete failed:', err);
      toast.error('Failed to delete document');
    }
  };

  const handleDownload = async (doc: AssetDocument) => {
    try {
      const response = await api.get(`/assets/${assetId}/documents/${doc.id}/download`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
      toast.error('Failed to download document');
    }
  };

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-gray-900 bg-gray-50'
            : 'border-gray-300 hover:border-gray-400 bg-white'
        } ${uploading ? 'pointer-events-none opacity-60' : ''}`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-2">
          {uploading ? (
            <>
              <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
              <p className="text-sm text-gray-500">Uploading... {uploadProgress}%</p>
              {/* Progress bar */}
              <div className="w-full max-w-xs h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gray-900 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </>
          ) : (
            <>
              <Upload size={32} className={isDragActive ? 'text-gray-900' : 'text-gray-400'} />
              {isDragActive ? (
                <p className="text-sm font-medium text-gray-900">Drop your file here</p>
              ) : (
                <>
                  <p className="text-sm font-medium text-gray-700">
                    Drag & drop a file here, or click to browse
                  </p>
                  <p className="text-xs text-gray-400">
                    PDF, PNG, or JPG up to 10 MB
                  </p>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Document list */}
      {loading ? (
        <div className="text-sm text-gray-400 text-center py-4">Loading documents...</div>
      ) : documents.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">No documents uploaded yet.</p>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between border border-gray-200 rounded-lg px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <FileText size={18} className="text-gray-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{doc.name}</p>
                  <p className="text-xs text-gray-400">
                    {doc.type} · {(doc.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDownload(doc)}
                  title="Download"
                >
                  <Download size={14} />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="!text-red-500"
                  onClick={() => handleDelete(doc.id)}
                  title="Delete"
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
