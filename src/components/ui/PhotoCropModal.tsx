"use client";
import { useState, useRef, useCallback } from "react";
import ReactCrop, { centerCrop, makeAspectCrop, type Crop, type PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { X, Check, RotateCcw } from "lucide-react";

interface Props {
  src: string;
  onConfirm: (blob: Blob) => void;
  onCancel: () => void;
  aspectRatio?: number; // default 1 (square/passport)
}

export function PhotoCropModal({ src, onConfirm, onCancel, aspectRatio = 1 }: Props) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [rotation, setRotation] = useState(0);

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget;
    const c = centerCrop(makeAspectCrop({ unit: "%", width: 80 }, aspectRatio, width, height), width, height);
    setCrop(c);
  }

  const handleConfirm = useCallback(async () => {
    if (!imgRef.current || !completedCrop) return;
    const canvas = document.createElement("canvas");
    const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
    const scaleY = imgRef.current.naturalHeight / imgRef.current.height;
    const size = Math.min(completedCrop.width * scaleX, completedCrop.height * scaleY);
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;

    if (rotation !== 0) {
      ctx.translate(size / 2, size / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.translate(-size / 2, -size / 2);
    }

    ctx.drawImage(
      imgRef.current,
      completedCrop.x * scaleX, completedCrop.y * scaleY,
      completedCrop.width * scaleX, completedCrop.height * scaleY,
      0, 0, size, size,
    );

    canvas.toBlob((blob) => { if (blob) onConfirm(blob); }, "image/jpeg", 0.92);
  }, [completedCrop, rotation, onConfirm]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-[15px] font-bold text-gray-900">Crop Photo</h3>
            <p className="text-[12px] text-gray-500 mt-0.5">Drag to reposition · resize handles at corners</p>
          </div>
          <button onClick={onCancel} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Crop area */}
        <div className="p-4 bg-gray-50 flex justify-center" style={{ minHeight: 280 }}>
          <ReactCrop
            crop={crop}
            onChange={(c) => setCrop(c)}
            onComplete={(c) => setCompletedCrop(c)}
            aspect={aspectRatio}
            circularCrop={false}
            keepSelection
          >
            <img
              ref={imgRef}
              src={src}
              alt="Crop"
              onLoad={onImageLoad}
              style={{
                maxHeight: 320,
                maxWidth: "100%",
                transform: `rotate(${rotation}deg)`,
                transition: "transform 0.2s",
              }}
            />
          </ReactCrop>
        </div>

        {/* Controls */}
        <div className="px-5 py-4">
          {/* Rotation */}
          <div className="flex items-center gap-3 mb-4">
            <RotateCcw className="w-4 h-4 text-gray-400 shrink-0" />
            <input
              type="range" min={-180} max={180} value={rotation}
              onChange={(e) => setRotation(Number(e.target.value))}
              className="flex-1 h-1.5 accent-[#262262]"
            />
            <span className="text-[12px] text-gray-500 w-10 text-right">{rotation}°</span>
            {rotation !== 0 && (
              <button onClick={() => setRotation(0)} className="text-[11px] text-[#262262] font-semibold">Reset</button>
            )}
          </div>

          <div className="flex gap-2">
            <button onClick={onCancel}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-[13px] font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button onClick={handleConfirm} disabled={!completedCrop}
              className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold text-white flex items-center justify-center gap-1.5 disabled:opacity-50 transition-colors"
              style={{ background: "linear-gradient(135deg, #262262, #92278F)" }}>
              <Check className="w-4 h-4" /> Use Photo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
