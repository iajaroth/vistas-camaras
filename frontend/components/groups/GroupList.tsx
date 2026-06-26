"use client";

import { useEffect, useState, useCallback } from "react";
import { apiClient } from "@/lib/api";
import { CameraGroup, PaginatedResponse } from "@/lib/types";
import GroupCard from "./GroupCard";
import GroupForm from "./GroupForm";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";

export default function GroupList() {
  const [groups, setGroups] = useState<CameraGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CameraGroup | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchGroups = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await apiClient.get<PaginatedResponse<CameraGroup>>("/api/groups/", {
        params: { page: p },
      });
      setGroups(res.data.results);
      setTotalPages(res.data.total_pages);
      setPage(res.data.page);
    } catch {
      // ponytail: silent fail, list stays empty
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGroups(1);
  }, [fetchGroups]);

  const handleCreated = () => {
    setShowForm(false);
    fetchGroups(page);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/api/groups/${deleteTarget.id}/`);
      setDeleteTarget(null);
      fetchGroups(page);
    } catch {
      // ponytail: silent fail on delete
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Grupos de Cámaras</h2>
        <Button onClick={() => setShowForm(true)}>Nuevo Grupo</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <svg className="animate-spin h-6 w-6 text-blue-600" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : groups.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-12">
          No hay grupos creados. Crea tu primer grupo para comenzar.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map((g) => (
              <GroupCard key={g.id} group={g} onDelete={setDeleteTarget} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-6">
              <Button
                variant="ghost"
                disabled={page <= 1}
                onClick={() => fetchGroups(page - 1)}
              >
                Anterior
              </Button>
              <span className="text-sm text-gray-600">
                Página {page} de {totalPages}
              </span>
              <Button
                variant="ghost"
                disabled={page >= totalPages}
                onClick={() => fetchGroups(page + 1)}
              >
                Siguiente
              </Button>
            </div>
          )}
        </>
      )}

      {/* Create modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Nuevo Grupo</h2>
            <GroupForm onSuccess={handleCreated} onCancel={() => setShowForm(false)} />
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Eliminar grupo"
        confirmLabel="Eliminar"
        confirmVariant="danger"
        onConfirm={handleDelete}
        loading={deleting}
      >
        <p>
          ¿Estás seguro de eliminar el grupo{" "}
          <strong>{deleteTarget?.code}</strong>?
        </p>
        <p className="mt-2 text-red-600 font-medium">
          Se eliminarán todas las cámaras, imágenes, reportes y notas asociadas.
          Esta acción no se puede deshacer.
        </p>
      </Modal>
    </div>
  );
}
