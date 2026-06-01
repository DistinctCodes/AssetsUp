'use client';

import { useState, useEffect } from 'react';
import { QrCode, Download, Printer, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { api } from '@/lib/api';

interface AssetQRCodeProps {
  assetId: string;
  assetName: string;
  size?: number;
}

export function AssetQRCode({ assetId, assetName, size = 200 }: AssetQRCodeProps) {
  const [qrCodeDataUri, setQrCodeDataUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!assetId) return;

    const fetchQR = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get(`/assets/${assetId}/qr?format=base64`, {
          responseType: 'blob',
        });

        const blob = response.data as Blob;
        const reader = new FileReader();
        reader.onloadend = () => {
          setQrCodeDataUri(reader.result as string);
          setLoading(false);
        };
        reader.onerror = () => {
          setError('Failed to load QR code');
          setLoading(false);
        };
        reader.readAsDataURL(blob);
      } catch (err) {
        console.error('Failed to fetch QR code:', err);
        setError('Failed to load QR code');
        setLoading(false);
      }
    };

    fetchQR();
  }, [assetId]);

  const handleDownloadPNG = () => {
    if (!qrCodeDataUri) return;
    const link = document.createElement('a');
    link.href = qrCodeDataUri;
    link.download = `${assetName.replace(/\s+/g, '_')}_qr.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('QR code downloaded');
  };

  const handlePrint = () => {
    if (!qrCodeDataUri) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow pop-ups to print');
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>QR Code - ${assetName}</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            }
            .container { text-align: center; }
            h2 { margin-bottom: 8px; color: #111; font-size: 16px; }
            p { margin: 4px 0; color: #666; font-size: 12px; }
            img { width: 200px; height: 200px; margin: 16px 0; }
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>${assetName}</h2>
            <p>ID: ${assetId}</p>
            <img src="${qrCodeDataUri}" alt="QR Code" />
            <p>Scan to view asset details</p>
          </div>
          <script>window.print(); window.close();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-center" style={{ height: size + 80 }}>
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
          <p className="text-xs text-gray-400">Loading QR code...</p>
        </div>
      </div>
    );
  }

  if (error || !qrCodeDataUri) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-center" style={{ height: size + 80 }}>
        <div className="flex flex-col items-center gap-2">
          <AlertCircle size={24} className="text-red-400" />
          <p className="text-xs text-red-500">{error || 'QR code unavailable'}</p>
          <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <QrCode size={16} className="text-gray-400" />
        <h2 className="text-sm font-semibold text-gray-900">QR Code</h2>
      </div>

      <div className="flex justify-center mb-4">
        <img
          src={qrCodeDataUri}
          alt={`QR Code for ${assetName}`}
          style={{ width: size, height: size }}
          className="rounded-lg"
        />
      </div>

      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="flex-1" onClick={handleDownloadPNG}>
          <Download size={14} className="mr-1.5" />
          Download PNG
        </Button>
        <Button size="sm" variant="outline" className="flex-1" onClick={handlePrint}>
          <Printer size={14} className="mr-1.5" />
          Print Tag
        </Button>
      </div>
    </div>
  );
}
