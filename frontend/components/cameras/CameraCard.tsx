"use client";

import { Camera } from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

interface CameraCardProps {
  camera: Camera;
  onClick: (camera: Camera) => void;
}

export default function CameraCard({ camera, onClick }: CameraCardProps) {
  const thumbUrl = camera.day_thumbnail_path
    ? `${API_BASE}/media/${camera.day_thumbnail_path}`
    : camera.night_thumbnail_path
      ? `${API_BASE}/media/${camera.night_thumbnail_path}`
      : null;

  const hasDayView = !!camera.day_view_path;
  const hasNightView = !!camera.night_view_path;

  return (
    <div
      onClick={() => onClick(camera)}
      className="bg-[#111218] border border-zinc-800 rounded-none hover:border-blue-600 transition-colors cursor-pointer group overflow-hidden"
    >
      {/* Thumbnail area */}
      <div className="relative h-44 overflow-hidden">
        {thumbUrl ? (
          <>
            <img
              src={thumbUrl}
              alt={`${camera.compound_code} - ${camera.name}`}
              className="w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
            <div className="absolute top-0 left-0 right-0 h-1 bg-zinc-800 group-hover:bg-blue-600 transition-colors" />
          </>
        ) : (
          <div className="w-full h-full bg-[#18181b] flex items-center justify-center">
            <span className="text-xs text-zinc-600">Sin imagen</span>
          </div>
        )}

        {/* Code badge overlay */}
        <div className="absolute top-2 left-2">
          <span className="font-mono text-[10px] font-medium text-zinc-300 bg-black/60 px-1.5 py-0.5 border border-zinc-800/80 tracking-widest">
            {camera.compound_code}
          </span>
        </div>

        {/* Status indicators */}
        <div className="absolute bottom-2 right-2 flex gap-1.5">
          <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 ${
            hasDayView ? "bg-amber-950/80 text-amber-400 border border-amber-800/60" : "bg-zinc-900/80 text-zinc-600 border border-zinc-800/60"
          }`}>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </span>
          <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 ${
            hasNightView ? "bg-blue-950/80 text-blue-400 border border-blue-800/60" : "bg-zinc-900/80 text-zinc-600 border border-zinc-800/60"
          }`}>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-bold text-zinc-200 text-sm truncate">{camera.name}</h3>
        {camera.description && (
          <p className="text-[11px] text-zinc-500 mt-1 line-clamp-1">{camera.description}</p>
        )}
        <div className="mt-3 pt-3 border-t border-zinc-900 flex items-center justify-between">
          <span className={`text-[10px] tracking-wider font-medium ${
            hasDayView || hasNightView ? "text-emerald-400" : "text-zinc-600"
          }`}>
            {hasDayView && hasNightView ? "DIA + NOCHE" : hasDayView ? "SOLO DIA" : hasNightView ? "SOLO NOCHE" : "SIN VISTAS"}
          </span>
          <span className="text-[10px] text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity tracking-wider">
            DETALLES
          </span>
        </div>
      </div>
    </div>
  );
}
