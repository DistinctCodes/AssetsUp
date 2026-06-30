
"use client";

import { useEffect, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { X } from "lucide-react";

interface ScannerModalProps {
  onClose: () => void;
  onScanSuccess: (decodedText: string) => void;
}

export function ScannerModal({ onClose, onScanSuccess }: ScannerModalProps) {
  const [cameraId, setCameraId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const scanner = new Html5Qrcode("reader");

    const startScanner = async () => {
      try {
        const cameras = await Html5Qrcode.getCameras();
        if (cameras && cameras.length) {
          const selectedCameraId = cameras[0].id;
          setCameraId(selectedCameraId);

          await scanner.start(
            selectedCameraId,
            {
              fps: 10,
              qrbox: { width: 250, height: 250 },
            },
            (decodedText, decodedResult) => {
              onScanSuccess(decodedText);
            },
            (errorMessage) => {}
          );
        } else {
          setError("No cameras found.");
        }
      } catch (err) {
        setError("Failed to start scanner. Please grant camera permissions.");
      }
    };

    startScanner();

    return () => {
      if (scanner.isScanning) {
        scanner.stop().catch((err) => console.error("Failed to stop scanner", err));
      }
    };
  }, [onScanSuccess]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-4 rounded-lg shadow-lg w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Scan QR/Barcode</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-900">
            <X size={24} />
          </button>
        </div>
        <div id="reader" className="w-full h-64 bg-gray-200"></div>
        {error && <p className="text-red-500 mt-2">{error}</p>}
      </div>
    </div>
  );
}