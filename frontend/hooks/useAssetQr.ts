'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

export function useAssetQr(assetId: string) {
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get(`/assets/${assetId}/qr`, { responseType: 'blob' })
      .then((r) => {
        if (cancelled) return;
        const url = URL.createObjectURL(r.data);
        setQrUrl(url);
      })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [assetId]);

  return { qrUrl, loading, error };
}