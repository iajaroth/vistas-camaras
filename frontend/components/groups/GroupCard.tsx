"use client";

import Link from "next/link";
import { CameraGroup } from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

interface CameraThumbnail {
  compound_code: string;
  thumbnail_path: string | null;
}

interface GroupCardProps {
  group: CameraGroup;
  thumbnails: CameraThumbnail[];
  onDelete: (group: CameraGroup) => void;
}

export default function GroupCard({ group, thumbnails, onDelete }: GroupCardProps) {
  const slots = thumbnails.slice(0, 4);
  const emptySlots = Math.max(0, 4 - slots.length);

  return (
    <div className="bg-[#111218] border border-zinc-800 rounded-none hover:border-blue-600 transition-colors cursor-pointer group overflow-hidden">
      <Link href={`/groups/${group.id}`} className="block">
        {/* Camera mosaic preview */}
        <div className="relative">
          <div className="grid grid-cols-2 gap-px bg-zinc-900">
            {slots.map((cam, i) => (
              <div key={i} className="relative h-28 overflow-hidden">
                {cam.thumbnail_path ? (
                  <>
                    <img
                      src={`${API_BASE}/media/${cam.thumbnail_path}`}
                      alt={cam.compound_code}
                      className="w-full h-full object-cover opacity-70 group-hover:opacity-85 transition-opacity duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  </>
                ) : (
                  <div className="w-full h-full bg-[#18181b] flex items-center justify-center">
                    <span className="text-[9px] text-zinc-700">SIN IMAGEN</span>
                  </div>
                )}
                <span className="absolute top-1 left-1 font-mono text-[9px] text-zinc-300 bg-black/60 px-1 py-0.5 tracking-wider">
                  {cam.compound_code}
                </span>
              </div>
            ))}
            {Array.from({ length: emptySlots }).map((_, i) => (
              <div key={`empty-${i}`} className="h-28 bg-[#18181b] flex items-center justify-center">
                <span className="text-[9px] text-zinc-800">—</span>
              </div>
            ))}
          </div>
          <div className="absolute top-0 left-0 right-0 h-1 bg-zinc-800 group-hover:bg-blue-600 transition-colors" />
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex items-start justify-between mb-2">
            <span className="inline-block bg-blue-600/10 text-blue-400 text-[10px] font-mono font-medium px-1.5 py-0.5 tracking-widest">
              {group.code}
            </span>
            <span className="text-[10px] text-zinc-500 tracking-wider">
              {group.camera_count ?? 0} CÁMARA{(group.camera_count ?? 0) !== 1 ? "S" : ""}
            </span>
          </div>
          <h3 className="text-sm font-bold text-zinc-200 mb-1">{group.name}</h3>
          {group.description && (
            <p className="text-[11px] text-zinc-500 line-clamp-1">{group.description}</p>
          )}
        </div>
      </Link>

      <div className="px-4 pb-3 pt-0">
        <div className="pt-3 border-t border-zinc-900 flex items-center justify-between">
          <span className="text-[10px] text-emerald-400 tracking-wider">
            {thumbnails.filter(t => t.thumbnail_path).length} ACTIVA{thumbnails.filter(t => t.thumbnail_path).length !== 1 ? "S" : ""}
          </span>
          <button
            onClick={(e) => {
              e.preventDefault();
              onDelete(group);
            }}
            className="text-[10px] text-red-400 hover:text-red-300 transition-colors cursor-pointer tracking-wider"
          >
            ELIMINAR
          </button>
        </div>
      </div>
    </div>
  );
}
