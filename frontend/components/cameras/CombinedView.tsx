"use client";

import { useState } from "react";
import Link from "next/link";

interface CombinedCamera {
  id: number;
  compound_code: string;
  name: string;
  day_view_url: string | null;
  day_thumbnail_url: string | null;
  night_view_url: string | null;
  night_thumbnail_url: string | null;
}

interface CombinedViewProps {
  groupId: string;
  cameras: CombinedCamera[];
}

export default function CombinedView({ groupId, cameras }: CombinedViewProps) {
  const [viewType, setViewType] = useState<"day" | "night">("day");

  return (
    <div>
      {/* Toggle */}
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => setViewType("day")}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-none text-sm font-medium transition-colors cursor-pointer ${
            viewType === "day"
              ? "bg-amber-950 text-amber-400 border border-amber-800"
              : "bg-[#18181b] text-zinc-400 border border-zinc-800 hover:border-zinc-600"
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          Día
        </button>
        <button
          onClick={() => setViewType("night")}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-none text-sm font-medium transition-colors cursor-pointer ${
            viewType === "night"
              ? "bg-blue-950 text-blue-400 border border-blue-800"
              : "bg-[#18181b] text-zinc-400 border border-zinc-800 hover:border-zinc-600"
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
          Noche
        </button>
      </div>

      {/* Grid */}
      {cameras.length === 0 ? (
        <p className="text-sm text-zinc-500">No hay cámaras en este grupo.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {cameras.map((camera) => {
            const thumbUrl =
              viewType === "day" ? camera.day_thumbnail_url : camera.night_thumbnail_url;

            return (
              <Link
                key={camera.id}
                href={`/groups/${groupId}/cameras/${camera.id}`}
                className="group relative rounded-none overflow-hidden border border-zinc-800 hover:border-blue-600 transition-colors cursor-pointer"
              >
                {thumbUrl ? (
                  <img
                    src={thumbUrl}
                    alt={`${camera.compound_code} - ${camera.name}`}
                    className="w-full h-40 object-cover"
                  />
                ) : (
                  <div className="w-full h-40 bg-[#18181b] flex items-center justify-center">
                    <span className="text-xs text-zinc-600">
                      Sin imagen {viewType === "day" ? "diurna" : "nocturna"}
                    </span>
                  </div>
                )}
                {/* Code label overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-3 py-2">
                  <span className="text-xs font-mono font-medium text-white">
                    {camera.compound_code}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
