'use client';
import React, { useEffect, useRef } from 'react';
import { Download } from 'lucide-react';
import Button from '@/components/ui/Button';

interface QRCodeDisplayProps {
  assetId: string;
  qrCodeValue?: string | null;
}

export function QRCodeDisplay({
  assetId,
  qrCodeValue,
}: QRCodeDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const qrValue =
    qrCodeValue || `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/assets/${assetId}`;

  useEffect(() => {
    const generateQR = async () => {
      if (canvasRef.current) {
        const QRCode = (await import('qrcode')).default;
        await QRCode.toCanvas(canvasRef.current, qrValue, {
          width: 150,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#ffffff',
          },
        });
      }
    };
    generateQR();
  }, [qrValue]);

  const handleDownload = () => {
    if (canvasRef.current) {
      const link = document.createElement('a');
      link.download = `${assetId}-qrcode.png`;
      link.href = canvasRef.current.toDataURL('image/png');
      link.click();
    }
  };

  return (
    <div className="flex flex-col items-center p-4 border border-gray-200 rounded-lg bg-white">
      <canvas ref={canvasRef} className="mb-2" />
      <p className="text-sm text-gray-500 mb-3 font-mono">{assetId}</p>
      <Button size="sm" variant="secondary" onClick={handleDownload}>
        <Download className="w-4 h-4 mr-1" /> Download QR
      </Button>
    </div>
  );
}
