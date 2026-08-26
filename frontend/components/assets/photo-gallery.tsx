"use client";

import { useState, useRef } from "react";
import { Upload, Trash2, Star, X, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface PhotoGalleryProps {
  images: string[];
  onUpload: (file: File) => Promise<void>;
  onDelete: (index: number) => Promise<void>;
  onSetPrimary: (index: number) => void;
  isUploading?: boolean;
}

export function PhotoGallery({ images, onUpload, onDelete, onSetPrimary, isUploading }: PhotoGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Client-side validation
      if (!file.type.startsWith("image/")) return;
      if (file.size > 10 * 1024 * 1024) return; // 10MB max
      await onUpload(file);
      e.target.value = "";
    }
  };

  if (images.length === 0) {
    return (
      <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
        <ImageIcon className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-500 mb-3">No photos yet</p>
        <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
          <Upload className="w-4 h-4 mr-1" /> Upload Photo
        </Button>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-700">Photos ({images.length})</h3>
        <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
          <Upload className="w-3 h-3 mr-1" /> {isUploading ? "Uploading..." : "Add"}
        </Button>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      </div>

      {/* Thumbnails */}
      <div className="grid grid-cols-4 gap-2">
        {images.map((url, idx) => (
          <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200 cursor-pointer"
            onClick={() => setLightboxIndex(idx)}>
            <img src={url} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" loading="lazy" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1">
              <button onClick={(e) => { e.stopPropagation(); onSetPrimary(idx); }}
                className="p-1 bg-white/80 rounded-full hover:bg-white" title="Set as primary">
                <Star className={`w-3 h-3 ${idx === 0 ? "fill-yellow-400 text-yellow-400" : "text-gray-600"}`} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); setDeleteIndex(idx); }}
                className="p-1 bg-white/80 rounded-full hover:bg-white" title="Delete">
                <Trash2 className="w-3 h-3 text-red-600" />
              </button>
            </div>
            {idx === 0 && (
              <span className="absolute top-1 left-1 bg-yellow-400 text-xs font-medium px-1.5 py-0.5 rounded">Primary</span>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={() => setLightboxIndex(null)}>
          <button onClick={() => setLightboxIndex(null)} className="absolute top-4 right-4 text-white"><X className="w-8 h-8" /></button>
          <img src={images[lightboxIndex]} alt="Full size" className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg" />
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {images.map((_, i) => (
              <button key={i} onClick={(e) => { e.stopPropagation(); setLightboxIndex(i); }}
                className={`w-2 h-2 rounded-full ${i === lightboxIndex ? "bg-white" : "bg-white/40"}`} />
            ))}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteIndex !== null}
        onConfirm={async () => { if (deleteIndex !== null) await onDelete(deleteIndex); setDeleteIndex(null); }}
        onCancel={() => setDeleteIndex(null)}
        title="Delete Photo"
        description="Are you sure you want to delete this photo?"
      />
    </div>
  );
}
