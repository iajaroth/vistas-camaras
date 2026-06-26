"use client";

import Link from "next/link";
import { CameraGroup } from "@/lib/types";

interface GroupCardProps {
  group: CameraGroup;
  onDelete: (group: CameraGroup) => void;
}

export default function GroupCard({ group, onDelete }: GroupCardProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer">
      <Link href={`/groups/${group.id}`} className="block">
        <div className="flex items-start justify-between mb-2">
          <span className="inline-block bg-blue-50 text-blue-700 text-xs font-mono font-medium px-2 py-1 rounded">
            {group.code}
          </span>
          <span className="text-xs text-gray-500">
            {group.camera_count ?? 0} cámara{group.camera_count !== 1 ? "s" : ""}
          </span>
        </div>
        <h3 className="text-sm font-semibold text-gray-900 mb-1">{group.name}</h3>
        {group.description && (
          <p className="text-xs text-gray-500 line-clamp-2">{group.description}</p>
        )}
      </Link>
      <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end">
        <button
          onClick={(e) => {
            e.preventDefault();
            onDelete(group);
          }}
          className="text-xs text-red-600 hover:text-red-800 transition-colors cursor-pointer"
        >
          Eliminar
        </button>
      </div>
    </div>
  );
}
