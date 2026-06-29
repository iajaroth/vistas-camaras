"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiClient } from "@/lib/api";
import CombinedView from "@/components/cameras/CombinedView";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

interface CombinedData {
  group_code: string;
  group_name: string;
  cameras: {
    id: number;
    compound_code: string;
    name: string;
    day_view_url: string | null;
    day_thumbnail_url: string | null;
    night_view_url: string | null;
    night_thumbnail_url: string | null;
  }[];
}

export default function CombinedViewPage() {
  const params = useParams();
  const groupId = params.groupId as string;

  const [data, setData] = useState<CombinedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchCombined() {
      setLoading(true);
      try {
        const res = await apiClient.get<CombinedData>(`/api/groups/${groupId}/combined/`);
        // Resolve relative paths to full URLs
        const cameras = res.data.cameras.map((c) => ({
          ...c,
          day_view_url: c.day_view_url ? `${API_BASE}/media/${c.day_view_url}` : null,
          day_thumbnail_url: c.day_thumbnail_url ? `${API_BASE}/media/${c.day_thumbnail_url}` : null,
          night_view_url: c.night_view_url ? `${API_BASE}/media/${c.night_view_url}` : null,
          night_thumbnail_url: c.night_thumbnail_url ? `${API_BASE}/media/${c.night_thumbnail_url}` : null,
        }));
        setData({ ...res.data, cameras });
      } catch {
        setError("Error al cargar la vista combinada.");
      } finally {
        setLoading(false);
      }
    }
    fetchCombined();
  }, [groupId]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-zinc-500">Cargando...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-red-400">{error || "Datos no disponibles."}</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link
        href={`/groups/${groupId}`}
        className="text-sm text-blue-400 hover:text-blue-300 mb-4 inline-block"
      >
        ← Volver al grupo
      </Link>

      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <span className="inline-block bg-blue-600/10 text-blue-400 text-sm font-mono font-medium px-2 py-1 tracking-wider">
            {data.group_code}
          </span>
          <h1 className="text-2xl font-bold text-zinc-100">
            Vista Combinada — {data.group_name}
          </h1>
        </div>
        <p className="text-sm text-zinc-500">{data.cameras.length} cámaras</p>
      </div>

      <CombinedView groupId={groupId} cameras={data.cameras} />
    </div>
  );
}
