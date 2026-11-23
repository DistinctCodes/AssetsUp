'use client';

import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';

export function useAssetQr(assetId: string) {
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  // The URL currently published as `qrUrl`. Only the effect that created it
  // may release it, and never while it is still the rendered value.
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let createdUrl: string | null = null;

    setLoading(true);
    api
      .get(`/assets/${assetId}/qr`, { responseType: 'blob' })
      .then((r) => {
        // A request superseded by a new assetId (or an unmount) must not
        // create an object URL that nobody will ever render.
        if (cancelled) return;
        createdUrl = URL.createObjectURL(r.data);
        objectUrlRef.current = createdUrl;
        setQrUrl(createdUrl);
      })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => {
      cancelled = true;
      // Cleanup runs when assetId changes or the hook unmounts: the URL from
      // this effect is no longer needed. Clear it from state first so no
      // <img> is left pointing at a revoked URL, then release the blob.
      if (createdUrl) {
        if (objectUrlRef.current === createdUrl) {
          objectUrlRef.current = null;
          setQrUrl(null);
        }
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [assetId]);

  return { qrUrl, loading, error };
}
