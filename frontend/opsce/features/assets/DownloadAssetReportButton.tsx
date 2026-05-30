'use client';

import { useState, useCallback } from 'react';
import { FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { api } from '@/lib/api';

interface DownloadAssetReportButtonProps {
  assetId: string;
  assetName: string;
}

export function DownloadAssetReportButton({ assetId, assetName }: DownloadAssetReportButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleDownload = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get(`/assets/${assetId}/report`, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${assetName.replace(/\s+/g, '_')}_report.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Report downloaded successfully');
    } catch (err) {
      console.error('Failed to download asset report:', err);
      toast.error('Failed to download report. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [assetId, assetName]);

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleDownload}
      loading={loading}
    >
      <FileDown size={14} className="mr-1.5" />
      Download Report
    </Button>
  );
}
