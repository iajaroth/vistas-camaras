"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiClient } from "@/lib/api";
import { Camera, AnalysisReport, CriticalNote } from "@/lib/types";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import ImageUploader from "@/components/cameras/ImageUploader";
import ImageOverlay from "@/components/cameras/ImageOverlay";
import AnalysisTrigger from "@/components/analysis/AnalysisTrigger";
import AnalysisReportView from "@/components/analysis/AnalysisReport";
import CriticalNotes from "@/components/analysis/CriticalNotes";
import ExportButtons from "@/components/export/ExportButtons";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export default function CameraDetailPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.groupId as string;
  const cameraId = params.cameraId as string;

  const [camera, setCamera] = useState<Camera | null>(null);
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [notes, setNotes] = useState<CriticalNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete state
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Overlay state
  const [overlayImage, setOverlayImage] = useState<string | null>(null);

  useEffect(() => {
    fetchCamera();
  }, [cameraId]);

  async function fetchCamera() {
    setLoading(true);
    try {
      const [camRes, reportRes, notesRes] = await Promise.allSettled([
        apiClient.get<Camera>(`/api/cameras/${cameraId}/`),
        apiClient.get<AnalysisReport>(`/api/cameras/${cameraId}/report/`),
        apiClient.get<{ results: CriticalNote[] }>(`/api/cameras/${cameraId}/notes/`),
      ]);

      if (camRes.status === "fulfilled") {
        setCamera(camRes.value.data);
        setEditName(camRes.value.data.name);
        setEditDescription(camRes.value.data.description);
      }
      if (reportRes.status === "fulfilled") {
        setReport(reportRes.value.data);
      }
      if (notesRes.status === "fulfilled") {
        setNotes(notesRes.value.data.results);
      }
    } catch {
      setError("Error al cargar la cámara.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveEdit() {
    setSaving(true);
    try {
      const res = await apiClient.patch<Camera>(`/api/cameras/${cameraId}/`, {
        name: editName,
        description: editDescription,
      });
      setCamera(res.data);
      setEditing(false);
    } catch {
      setError("Error al guardar los cambios.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await apiClient.delete(`/api/cameras/${cameraId}/`);
      router.push(`/groups/${groupId}`);
    } catch {
      setError("Error al eliminar la cámara.");
      setDeleting(false);
    }
  }

  function getImageUrl(path: string) {
    if (!path) return null;
    const v = camera ? new Date(camera.updated_at).getTime() : Date.now();
    return `${API_BASE}/media/${path}?v=${v}`;
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-zinc-500">Cargando...</p>
      </div>
    );
  }

  if (!camera) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-red-400">Cámara no encontrada.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <Link
        href={`/groups/${groupId}`}
        className="text-sm text-blue-400 hover:text-blue-300 mb-4 inline-block"
      >
        ← Volver al grupo
      </Link>

      {error && (
        <div className="mb-4 p-3 bg-red-950 text-red-400 border border-red-800 rounded-none text-sm">{error}</div>
      )}

      {/* Camera header */}
      <div className="bg-[#111218] rounded-none border border-zinc-800 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {editing ? (
              <div className="space-y-3 max-w-md">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full border border-zinc-800 rounded-none bg-[#18181b] px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  className="w-full border border-zinc-800 rounded-none bg-[#18181b] px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Descripción (opcional)"
                />
                <div className="flex gap-2">
                  <Button onClick={handleSaveEdit} loading={saving}>
                    Guardar
                  </Button>
                  <Button variant="secondary" onClick={() => setEditing(false)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-1">
                  <span className="font-mono text-sm font-medium text-blue-400 bg-blue-600/10 px-2 py-1 tracking-wider">
                    {camera.compound_code}
                  </span>
                  <h1 className="text-2xl font-bold text-zinc-100">{camera.name}</h1>
                </div>
                {camera.description && (
                  <p className="text-zinc-400 mt-1">{camera.description}</p>
                )}
              </>
            )}
          </div>
          {!editing && (
            <div className="flex gap-2">
              <ExportButtons exportUrl={`/api/cameras/${cameraId}/export`} />
              <Button variant="secondary" onClick={() => setEditing(true)}>
                Editar
              </Button>
              <Button variant="danger" onClick={() => setShowDelete(true)}>
                Eliminar
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Image section */}
      <div className="bg-[#111218] rounded-none border border-zinc-800 p-5 mb-6">
        <h3 className="text-sm font-semibold text-zinc-200 mb-3 flex items-center gap-2">
          <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Vista
        </h3>
        {camera.day_thumbnail_path ? (
          <div
            className="cursor-pointer rounded-none overflow-hidden border border-zinc-800 mb-3"
            onClick={() => setOverlayImage(getImageUrl(camera.day_view_path)!)}
          >
            <img
              src={getImageUrl(camera.day_thumbnail_path)!}
              alt="Vista de cámara"
              className="w-full h-64 object-cover"
            />
          </div>
        ) : (
          <div className="w-full h-64 bg-[#18181b] rounded-none flex items-center justify-center mb-3">
            <span className="text-sm text-zinc-600">Sin imagen</span>
          </div>
        )}
        <ImageUploader
          cameraId={cameraId}
          viewType="day"
          onUploadComplete={fetchCamera}
        />
      </div>

      {/* AI Analysis */}
      <div className="bg-[#111218] rounded-none border border-zinc-800 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-zinc-100">Análisis IA</h2>
          <AnalysisTrigger cameraId={cameraId} onAnalysisComplete={fetchCamera} />
        </div>
        {report ? (
          <AnalysisReportView report={report} />
        ) : (
          <p className="text-sm text-zinc-500">
            No hay reporte de análisis. Sube al menos una imagen y solicita el análisis.
          </p>
        )}
      </div>

      {/* Critical Notes */}
      <div className="bg-[#111218] rounded-none border border-zinc-800 p-6">
        <h2 className="text-lg font-semibold text-zinc-100 mb-4">Notas Críticas</h2>
        <CriticalNotes cameraId={cameraId} notes={notes} onNotesChange={fetchCamera} />
      </div>

      {/* Image overlay */}
      {overlayImage && (
        <ImageOverlay src={overlayImage} onClose={() => setOverlayImage(null)} />
      )}

      {/* Delete modal */}
      <Modal
        open={showDelete}
        onClose={() => setShowDelete(false)}
        title="Eliminar cámara"
        confirmLabel="Eliminar"
        confirmVariant="danger"
        onConfirm={handleDelete}
        loading={deleting}
      >
        <p>
          ¿Estás seguro de que deseas eliminar la cámara{" "}
          <strong>{camera.compound_code}</strong>? Esta acción no se puede deshacer.
        </p>
      </Modal>
    </div>
  );
}
