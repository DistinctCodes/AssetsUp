'use client';

import { useState, useCallback } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { api } from '@/lib/api';

interface ExportAssetsButtonProps {
  filters?: Record<string, string | undefined>;
}

export function ExportAssetsButton({ filters = {} }: ExportAssetsButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleExport = useCallback(async () => {
    setLoading(true);
    try {
      // Build query params from active filters
      const params = new URLSearchParams();
      params.set('format', 'csv');
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.set(key, value);
      });

      const response = await api.get(`/assets/export?${params.toString()}`, {
        responseType: 'blob',
        timeout: 30000, // 30 second timeout for large exports
      });

      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `assets_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Assets exported as CSV successfully');
    } catch (err: unknown) {
      console.error('Export failed:', err);
      const errorMessage =
        (err as { response?: { status?: number } })?.response?.status === 403
          ? 'You do not have permission to export assets.'
          : 'Failed to export assets. Please try again.';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleExport}
      loading={loading}
    >
      <Download size={14} className="mr-1.5" />
      Export CSV
    </Button>
  );
}
