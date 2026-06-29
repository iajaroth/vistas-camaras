"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiClient } from "@/lib/api";
import { Camera, CameraGroup, PaginatedResponse } from "@/lib/types";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import ExportButtons from "@/components/export/ExportButtons";

export default function GroupDetailPage() {
  const params = useParams();
  const groupId = params.groupId as string;

  const [group, setGroup] = useState<CameraGroup | null>(null);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCameraName, setNewCameraName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchData();
  }, [groupId]);

  async function fetchData() {
    setLoading(true);
    try {
      const [groupRes, camerasRes] = await Promise.all([
        apiClient.get<CameraGroup>(`/api/groups/${groupId}/`),
        apiClient.get<PaginatedResponse<Camera>>(`/api/groups/${groupId}/cameras/`),
      ]);
      setGroup(groupRes.data);
      setCameras(camerasRes.data.results);
    } catch {
      setError("Error al cargar los datos del grupo.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateCamera() {
    if (!newCameraName.trim()) return;
    setCreating(true);
    try {
      await apiClient.post(`/api/groups/${groupId}/cameras/`, {
        name: newCameraName.trim(),
      });
      setNewCameraName("");
      setShowAddModal(false);
      fetchData();
    } catch {
      setError("Error al crear la cámara.");
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-zinc-500">Cargando...</p>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-red-400">Grupo no encontrado.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link href="/groups" className="text-sm text-blue-400 hover:text-blue-300 mb-2 inline-block">
          ← Volver a grupos
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="inline-block bg-blue-600/10 text-blue-400 text-sm font-mono font-medium px-2 py-1 tracking-wider">
                {group.code}
              </span>
              <h1 className="text-2xl font-bold text-zinc-100">{group.name}</h1>
            </div>
            {group.description && (
              <p className="text-zinc-400 mt-1">{group.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <ExportButtons exportUrl={`/api/groups/${groupId}/export`} />
            <Link href={`/groups/${groupId}/combined`}>
              <Button variant="secondary">Vista Combinada</Button>
            </Link>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-950 text-red-400 border border-red-800 rounded-none text-sm">{error}</div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-zinc-100">
          Cámaras ({cameras.length})
        </h2>
        <Button onClick={() => setShowAddModal(true)}>Agregar cámara</Button>
      </div>

      {/* Camera list */}
      {cameras.length === 0 ? (
        <p className="text-zinc-500 text-sm">No hay cámaras en este grupo.</p>
      ) : (
        <div className="bg-[#111218] rounded-none border border-zinc-800 divide-y divide-zinc-800">
          {cameras.map((camera) => (
            <Link
              key={camera.id}
              href={`/groups/${groupId}/cameras/${camera.id}`}
              className="flex items-center justify-between px-5 py-4 hover:bg-zinc-800/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <span className="font-mono text-sm font-medium text-blue-400 bg-blue-600/10 px-2 py-0.5 tracking-wider">
                  {camera.compound_code}
                </span>
                <span className="text-sm text-zinc-200">{camera.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex items-center gap-1 text-xs ${
                    camera.day_view_path ? "text-emerald-400" : "text-zinc-600"
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  Día
                </span>
                <span
                  className={`inline-flex items-center gap-1 text-xs ${
                    camera.night_view_path ? "text-emerald-400" : "text-zinc-600"
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                  Noche
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Add camera modal */}
      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Agregar cámara"
        confirmLabel="Crear"
        onConfirm={handleCreateCamera}
        loading={creating}
      >
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">
            Nombre de la cámara
          </label>
          <input
            type="text"
            value={newCameraName}
            onChange={(e) => setNewCameraName(e.target.value)}
            placeholder="Ej: Entrada principal"
            className="w-full border border-zinc-800 rounded-none bg-[#18181b] px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyDown={(e) => e.key === "Enter" && handleCreateCamera()}
          />
        </div>
      </Modal>
    </div>
  );
}
