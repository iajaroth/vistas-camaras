"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { apiClient } from "@/lib/api";
import { Camera, CameraGroup, PaginatedResponse } from "@/lib/types";
import GroupCard from "./GroupCard";
import GroupForm from "./GroupForm";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";

const PAGE_SIZE = 9;

interface GroupThumbnails {
  [groupId: number]: { compound_code: string; thumbnail_path: string | null; updated_at: string }[];
}

export default function GroupList() {
  const [groups, setGroups] = useState<CameraGroup[]>([]);
  const [thumbnails, setThumbnails] = useState<GroupThumbnails>({});
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CameraGroup | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState("");

  const isFirstRender = useRef(true);

  const fetchGroups = useCallback(async (p: number, searchTerm: string) => {
    setLoading(true);
    try {
      const res = await apiClient.get<PaginatedResponse<CameraGroup>>("/api/groups/", {
        params: { page: p, page_size: PAGE_SIZE, search: searchTerm || undefined },
      });
      setGroups(res.data.results);
      setTotalPages(res.data.total_pages);
      setPage(res.data.page);

      const thumbMap: GroupThumbnails = {};
      await Promise.all(
        res.data.results.map(async (group) => {
          try {
            const camRes = await apiClient.get<PaginatedResponse<Camera>>(
              `/api/groups/${group.id}/cameras/`
            );
            thumbMap[group.id] = camRes.data.results.map((cam) => ({
              compound_code: cam.compound_code,
              thumbnail_path: cam.day_thumbnail_path || cam.night_thumbnail_path || null,
              updated_at: cam.updated_at,
            }));
          } catch {
            thumbMap[group.id] = [];
          }
        })
      );
      setThumbnails(thumbMap);
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      fetchGroups(1, "");
      return;
    }
    const timer = setTimeout(() => {
      fetchGroups(1, search);
    }, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const handleCreated = () => {
    setShowForm(false);
    fetchGroups(page, search);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/api/groups/${deleteTarget.id}/`);
      setDeleteTarget(null);
      fetchGroups(page, search);
    } catch {
      // silent fail
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-4">
        <h2 className="text-xl font-semibold text-zinc-100 whitespace-nowrap">Grupos de Cámaras</h2>
        <div className="flex items-center gap-3 flex-1 justify-end">
          <div className="relative w-full max-w-xs">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar grupo por nombre o código..."
              className="w-full border border-zinc-800 rounded-none bg-[#18181b] pl-9 pr-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <Button onClick={() => setShowForm(true)} className="whitespace-nowrap">Nuevo Grupo</Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <svg className="animate-spin h-6 w-6 text-blue-600" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : groups.length === 0 ? (
        <p className="text-sm text-zinc-500 text-center py-12">
          {search ? "No se encontraron grupos que coincidan con la búsqueda." : "No hay grupos creados. Crea tu primer grupo para comenzar."}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map((g) => (
              <GroupCard
                key={g.id}
                group={g}
                thumbnails={thumbnails[g.id] ?? []}
                onDelete={setDeleteTarget}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-6">
              <Button
                variant="ghost"
                disabled={page <= 1}
                onClick={() => fetchGroups(page - 1, search)}
              >
                Anterior
              </Button>
              <span className="text-sm text-zinc-500">
                Página {page} de {totalPages}
              </span>
              <Button
                variant="ghost"
                disabled={page >= totalPages}
                onClick={() => fetchGroups(page + 1, search)}
              >
                Siguiente
              </Button>
            </div>
          )}
        </>
      )}

      {/* Create modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm">
          <div className="bg-[#111218] border border-zinc-800 rounded-none shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-semibold text-zinc-100 mb-4">Nuevo Grupo</h2>
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
        <p className="mt-2 text-red-400 font-medium">
          Se eliminarán todas las cámaras, imágenes, reportes y notas asociadas.
          Esta acción no se puede deshacer.
        </p>
      </Modal>
    </div>
  );
}
