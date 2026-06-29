"use client";

import { useEffect } from "react";

interface ImageOverlayProps {
  src: string;
  onClose: () => void;
}

export default function ImageOverlay({ src, onClose }: ImageOverlayProps) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer z-10"
        aria-label="Cerrar"
      >
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Image */}
      <img
        src={src}
        alt="Vista completa"
        className="max-w-[90vw] max-h-[90vh] object-contain rounded-none border border-zinc-800 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
