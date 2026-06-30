"use client";

import { Camera } from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

interface CameraCardProps {
  camera: Camera;
  onClick: (camera: Camera) => void;
}

export default function CameraCard({ camera, onClick }: CameraCardProps) {
  const cacheBuster = new Date(camera.updated_at).getTime();
  const thumbUrl = camera.day_thumbnail_path
    ? `${API_BASE}/media/${camera.day_thumbnail_path}?v=${cacheBuster}`
    : camera.night_thumbnail_path
      ? `${API_BASE}/media/${camera.night_thumbnail_path}?v=${cacheBuster}`
      : null;

  const hasImage = !!camera.day_view_path;

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

        {/* Status indicator */}
        <div className="absolute bottom-2 right-2">
          <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 tracking-wider ${
            hasImage ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800/60" : "bg-zinc-900/80 text-zinc-600 border border-zinc-800/60"
          }`}>
            {hasImage ? "ACTIVA" : "SIN VISTA"}
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
            hasImage ? "text-emerald-400" : "text-zinc-600"
          }`}>
            {hasImage ? "VISTA DISPONIBLE" : "PENDIENTE"}
          </span>
          <span className="text-[10px] text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity tracking-wider">
            DETALLES
          </span>
        </div>
      </div>
    </div>
  );
}
