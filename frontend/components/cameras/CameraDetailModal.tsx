"use client";

import { useEffect, useState, useCallback } from "react";
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

interface CameraDetailModalProps {
  cameraId: string;
  open: boolean;
  onClose: () => void;
  onDeleted: () => void;
  onUpdated: () => void;
}

export default function CameraDetailModal({
  cameraId,
  open,
  onClose,
  onDeleted,
  onUpdated,
}: CameraDetailModalProps) {
  const [camera, setCamera] = useState<Camera | null>(null);
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [notes, setNotes] = useState<CriticalNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [overlayImage, setOverlayImage] = useState<string | null>(null);

  const fetchCamera = useCallback(async () => {
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
  }, [cameraId]);

  useEffect(() => {
    if (open && cameraId) {
      setCamera(null);
      setReport(null);
      setNotes([]);
      setEditing(false);
      setError("");
      fetchCamera();
    }
  }, [open, cameraId, fetchCamera]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !overlayImage && !showDelete) onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose, overlayImage, showDelete]);

  async function handleSaveEdit() {
    setSaving(true);
    try {
      const res = await apiClient.patch<Camera>(`/api/cameras/${cameraId}/`, {
        name: editName,
        description: editDescription,
      });
      setCamera(res.data);
      setEditing(false);
      onUpdated();
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
      setShowDelete(false);
      onClose();
      onDeleted();
    } catch {
      setError("Error al eliminar la cámara.");
      setDeleting(false);
    }
  }

  function handleUploadComplete() {
    fetchCamera();
    onUpdated();
  }

  function getImageUrl(path: string) {
    if (!path) return null;
    const v = camera ? new Date(camera.updated_at).getTime() : Date.now();
    return `${API_BASE}/media/${path}?v=${v}`;
  }

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm"
        onClick={onClose}
      >
        <div
          className="bg-[#111218] border border-zinc-800 rounded-none w-full max-w-5xl mx-4 max-h-[90vh] overflow-y-auto no-scrollbar"
          onClick={(e) => e.stopPropagation()}
        >
          {loading ? (
            <div className="flex justify-center py-20">
              <svg className="animate-spin h-6 w-6 text-blue-600" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : !camera ? (
            <div className="p-6">
              <p className="text-red-400">Cámara no encontrada.</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="bg-[#0F1115] border-b border-zinc-800 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[11px] font-medium text-blue-400 bg-blue-600/10 px-2 py-1 tracking-widest">
                    {camera.compound_code}
                  </span>
                  {!editing && (
                    <h2 className="text-lg font-bold text-zinc-100">{camera.name}</h2>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!editing && (
                    <>
                      <ExportButtons exportUrl={`/api/cameras/${cameraId}/export`} />
                      <Button variant="secondary" onClick={() => setEditing(true)} className="text-xs">
                        Editar
                      </Button>
                      <Button variant="danger" onClick={() => setShowDelete(true)} className="text-xs">
                        Eliminar
                      </Button>
                    </>
                  )}
                  <button
                    onClick={onClose}
                    className="text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer ml-2"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {error && (
                  <div className="p-3 bg-red-950 text-red-400 border border-red-800 rounded-none text-sm">{error}</div>
                )}

                {/* Edit form */}
                {editing && (
                  <div className="bg-[#18181b] border border-zinc-800 p-4 space-y-3">
                    <div>
                      <label className="block text-[11px] text-zinc-500 tracking-wider mb-1">NOMBRE</label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full border border-zinc-800 rounded-none bg-[#111218] px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-zinc-500 tracking-wider mb-1">DESCRIPCIÓN</label>
                      <textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        rows={2}
                        className="w-full border border-zinc-800 rounded-none bg-[#111218] px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Descripción (opcional)"
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button variant="secondary" onClick={() => setEditing(false)}>Cancelar</Button>
                      <Button onClick={handleSaveEdit} loading={saving}>Guardar</Button>
                    </div>
                  </div>
                )}

                {/* Description when not editing */}
                {!editing && camera.description && (
                  <p className="text-zinc-400 text-sm">{camera.description}</p>
                )}

                {/* Image section */}
                <div className="border border-zinc-800 p-4">
                  <h3 className="text-[11px] text-zinc-500 tracking-wider font-medium mb-3 flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    VISTA
                  </h3>
                  {camera.day_view_path ? (
                    <div className="max-w-md mx-auto">
                      <div
                        className="cursor-pointer overflow-hidden border border-zinc-800 relative group"
                        onClick={() => setOverlayImage(getImageUrl(camera.day_view_path)!)}
                      >
                        <div className="aspect-square">
                          <img
                            src={getImageUrl(camera.day_view_path)!}
                            alt="Vista de cámara"
                            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-300"
                          />
                        </div>
                      </div>
                      <div className="mt-2">
                        <ImageUploader cameraId={cameraId} viewType="day" onUploadComplete={handleUploadComplete} />
                      </div>
                    </div>
                  ) : (
                    <div className="aspect-square max-w-md mx-auto bg-[#18181b] flex items-center justify-center">
                      <div className="text-center">
                        <span className="text-xs text-zinc-600 block mb-3">Sin imagen</span>
                        <ImageUploader cameraId={cameraId} viewType="day" onUploadComplete={handleUploadComplete} />
                      </div>
                    </div>
                  )}
                </div>

                {/* AI Analysis */}
                <div className="border border-zinc-800 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[11px] text-zinc-500 tracking-wider font-medium">ANÁLISIS IA</h3>
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
                <div className="border border-zinc-800 p-4">
                  <h3 className="text-[11px] text-zinc-500 tracking-wider font-medium mb-4">NOTAS CRÍTICAS</h3>
                  <CriticalNotes cameraId={cameraId} notes={notes} onNotesChange={fetchCamera} />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Image overlay */}
      {overlayImage && (
        <ImageOverlay src={overlayImage} onClose={() => setOverlayImage(null)} />
      )}

      {/* Delete confirmation */}
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
          <strong>{camera?.compound_code}</strong>? Esta acción no se puede deshacer.
        </p>
      </Modal>
    </>
  );
}
