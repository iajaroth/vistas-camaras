"use client";

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
  return (
    <div>
      {cameras.length === 0 ? (
        <p className="text-sm text-zinc-500">No hay cámaras en este grupo.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {cameras.map((camera) => {
            const thumbUrl = camera.day_thumbnail_url;

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
                    className="w-full h-40 object-cover opacity-75 group-hover:opacity-95 transition-opacity duration-300"
                  />
                ) : (
                  <div className="w-full h-40 bg-[#18181b] flex items-center justify-center">
                    <span className="text-xs text-zinc-600">
                      Sin imagen
                    </span>
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-3 py-2">
                  <span className="text-xs font-mono font-medium text-white tracking-wider">
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
