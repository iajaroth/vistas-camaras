"use client";

import Link from "next/link";
import { CameraGroup } from "@/lib/types";

interface GroupCardProps {
  group: CameraGroup;
  onDelete: (group: CameraGroup) => void;
}

export default function GroupCard({ group, onDelete }: GroupCardProps) {
  return (
    <div className="bg-[#111218] rounded-none border border-zinc-800 p-5 hover:border-blue-600 transition-colors cursor-pointer">
      <Link href={`/groups/${group.id}`} className="block">
        <div className="flex items-start justify-between mb-2">
          <span className="inline-block bg-blue-600/10 text-blue-400 text-xs font-mono font-medium px-2 py-1 tracking-wider">
            {group.code}
          </span>
          <span className="text-xs text-zinc-500">
            {group.camera_count ?? 0} cámara{group.camera_count !== 1 ? "s" : ""}
          </span>
        </div>
        <h3 className="text-sm font-semibold text-zinc-200 mb-1">{group.name}</h3>
        {group.description && (
          <p className="text-xs text-zinc-500 line-clamp-2">{group.description}</p>
        )}
      </Link>
      <div className="mt-3 pt-3 border-t border-zinc-900 flex justify-end">
        <button
          onClick={(e) => {
            e.preventDefault();
            onDelete(group);
          }}
          className="text-xs text-red-400 hover:text-red-300 transition-colors cursor-pointer"
        >
          Eliminar
        </button>
      </div>
    </div>
  );
}
