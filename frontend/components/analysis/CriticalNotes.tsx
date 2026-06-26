"use client";

import { useState } from "react";
import { apiClient } from "@/lib/api";
import { CriticalNote } from "@/lib/types";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";

interface CriticalNotesProps {
  cameraId: string;
  notes: CriticalNote[];
  onNotesChange: () => void;
}

export default function CriticalNotes({ cameraId, notes, onNotesChange }: CriticalNotesProps) {
  const [newContent, setNewContent] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  // Edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<CriticalNote | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleAdd() {
    if (!newContent.trim()) return;
    if (newContent.length > 2000) {
      setError("La nota no puede exceder 2000 caracteres.");
      return;
    }
    setAdding(true);
    setError("");
    try {
      await apiClient.post(`/api/cameras/${cameraId}/notes/`, {
        content: newContent.trim(),
      });
      setNewContent("");
      onNotesChange();
    } catch {
      setError("Error al agregar la nota.");
    } finally {
      setAdding(false);
    }
  }

  async function handleSaveEdit() {
    if (!editContent.trim() || !editingId) return;
    if (editContent.length > 2000) {
      setError("La nota no puede exceder 2000 caracteres.");
      return;
    }
    setSavingEdit(true);
    try {
      await apiClient.patch(`/api/notes/${editingId}/`, {
        content: editContent.trim(),
      });
      setEditingId(null);
      onNotesChange();
    } catch {
      setError("Error al editar la nota.");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/api/notes/${deleteTarget.id}/`);
      setDeleteTarget(null);
      onNotesChange();
    } catch {
      setError("Error al eliminar la nota.");
    } finally {
      setDeleting(false);
    }
  }

  function startEdit(note: CriticalNote) {
    setEditingId(note.id);
    setEditContent(note.content);
  }

  return (
    <div>
      {error && <p className="text-xs text-red-600 mb-3">{error}</p>}

      {/* Note list */}
      {notes.length === 0 ? (
        <p className="text-sm text-gray-500 mb-4">No hay notas críticas.</p>
      ) : (
        <div className="space-y-3 mb-4">
          {notes.map((note) => (
            <div
              key={note.id}
              className="border border-gray-200 rounded-md p-3"
            >
              {editingId === note.id ? (
                <div className="space-y-2">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={3}
                    maxLength={2000}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">
                      {editContent.length}/2000
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => setEditingId(null)}
                        className="text-xs"
                      >
                        Cancelar
                      </Button>
                      <Button
                        onClick={handleSaveEdit}
                        loading={savingEdit}
                        className="text-xs"
                      >
                        Guardar
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">
                    {note.content}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-400">
                      {new Date(note.created_at).toLocaleDateString("es-ES", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {note.author && ` · Usuario #${note.author}`}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(note)}
                        className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => setDeleteTarget(note)}
                        className="text-xs text-red-600 hover:text-red-800 cursor-pointer"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add note form */}
      <div className="border-t border-gray-200 pt-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Agregar nota
        </label>
        <textarea
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="Escribe una nota crítica..."
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">{newContent.length}/2000</span>
          <Button onClick={handleAdd} loading={adding} disabled={!newContent.trim()}>
            Agregar nota
          </Button>
        </div>
      </div>

      {/* Delete confirmation modal */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Eliminar nota"
        confirmLabel="Eliminar"
        confirmVariant="danger"
        onConfirm={handleDelete}
        loading={deleting}
      >
        <p>¿Estás seguro de que deseas eliminar esta nota? Esta acción no se puede deshacer.</p>
      </Modal>
    </div>
  );
}
