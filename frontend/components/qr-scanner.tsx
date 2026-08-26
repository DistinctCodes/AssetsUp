"use client";

import { useState, useRef, useEffect } from "react";
import { Camera, X, Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QRScannerProps {
  onScan: (assetId: string) => void;
  onClose: () => void;
}

export function QRScanner({ onScan, onClose }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mode, setMode] = useState<"camera" | "manual">("camera");
  const [manualId, setManualId] = useState("");
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (mode !== "camera") return;
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setScanning(true);
          // Try BarcodeDetector API
          if ("BarcodeDetector" in window) {
            const detector = new (window as any).BarcodeDetector({ formats: ["qr_code"] });
            const detect = async () => {
              if (!videoRef.current || !scanning) return;
              try {
                const barcodes = await detector.detect(videoRef.current);
                if (barcodes.length > 0) {
                  const value = barcodes[0].rawValue;
                  const match = value.match(/\/scan\/([a-zA-Z0-9-]+)/);
                  onScan(match ? match[1] : value);
                  return;
                }
              } catch {}
              requestAnimationFrame(detect);
            };
            detect();
          }
        }
      } catch {
        setError("Camera access denied. Use manual entry instead.");
        setMode("manual");
      }
    };

    startCamera();
    return () => {
      setScanning(false);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [mode, onScan]);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="flex items-center justify-between p-4">
        <h2 className="text-white font-medium">Scan Asset QR</h2>
        <button onClick={onClose} className="text-white"><X className="w-6 h-6" /></button>
      </div>

      {mode === "camera" ? (
        <div className="flex-1 relative">
          <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-48 h-48 border-2 border-white/50 rounded-xl" />
          </div>
          {error && (
            <div className="absolute bottom-4 left-4 right-4 bg-red-600/80 text-white p-3 rounded-lg text-sm">
              {error}
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-sm space-y-4">
            <input
              type="text"
              placeholder="Enter Asset ID"
              value={manualId}
              onChange={(e) => setManualId(e.target.value)}
              className="w-full px-4 py-3 rounded-lg text-lg text-center"
              autoFocus
            />
            <Button className="w-full" onClick={() => manualId && onScan(manualId)}>
              Look Up Asset
            </Button>
          </div>
        </div>
      )}

      <div className="p-4 flex justify-center">
        <button onClick={() => setMode(mode === "camera" ? "manual" : "camera")}
          className="text-white/70 text-sm flex items-center gap-1">
          {mode === "camera" ? <><Keyboard className="w-4 h-4" /> Enter ID manually</> : <><Camera className="w-4 h-4" /> Use camera</>}
        </button>
      </div>
    </div>
  );
}
