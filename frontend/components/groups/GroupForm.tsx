"use client";

import { FormEvent, useState } from "react";
import { apiClient } from "@/lib/api";
import { ApiError, CameraGroup } from "@/lib/types";
import Button from "@/components/ui/Button";
import { AxiosError } from "axios";

const CODE_REGEX = /^[A-Z]{2,4}\d{2}$/;

interface GroupFormProps {
  /** If provided, the form is in edit mode */
  group?: CameraGroup;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function GroupForm({ group, onSuccess, onCancel }: GroupFormProps) {
  const isEdit = !!group;

  const [code, setCode] = useState(group?.code ?? "");
  const [name, setName] = useState(group?.name ?? "");
  const [description, setDescription] = useState(group?.description ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!isEdit && !CODE_REGEX.test(code)) {
      e.code = "Formato: 2-4 letras mayúsculas + 2 dígitos (ej: AB01, CCTV99)";
    }
    if (!name.trim() || name.length > 100) {
      e.name = "El nombre es requerido (máx. 100 caracteres)";
    }
    if (description.length > 500) {
      e.description = "La descripción no puede exceder 500 caracteres";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setErrors({});

    try {
      if (isEdit) {
        await apiClient.patch(`/api/groups/${group.id}/`, { name, description });
      } else {
        await apiClient.post("/api/groups/", { code, name, description });
      }
      onSuccess();
    } catch (err) {
      const axiosErr = err as AxiosError<ApiError>;
      const apiErrors = axiosErr.response?.data?.errors;
      if (apiErrors) {
        const mapped: Record<string, string> = {};
        for (const { field, message } of apiErrors) {
          mapped[field] = message;
        }
        setErrors(mapped);
      } else {
        setErrors({ _general: axiosErr.response?.data?.detail ?? "Error al guardar el grupo" });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Code field */}
      <div>
        <label htmlFor="group-code" className="block text-sm font-medium text-zinc-300 mb-1">
          Código
        </label>
        <input
          id="group-code"
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          disabled={isEdit}
          placeholder="AB01"
          className="w-full rounded-none border border-zinc-800 bg-[#18181b] px-3 py-2 text-sm font-mono text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-zinc-900 disabled:text-zinc-600"
        />
        {errors.code && <p className="text-xs text-red-600 mt-1">{errors.code}</p>}
      </div>

      {/* Name field */}
      <div>
        <label htmlFor="group-name" className="block text-sm font-medium text-zinc-300 mb-1">
          Nombre
        </label>
        <input
          id="group-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          placeholder="Nombre del grupo"
          className="w-full rounded-none border border-zinc-800 bg-[#18181b] px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
      </div>

      {/* Description field */}
      <div>
        <label htmlFor="group-desc" className="block text-sm font-medium text-zinc-300 mb-1">
          Descripción
        </label>
        <textarea
          id="group-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder="Descripción opcional"
          className="w-full rounded-none border border-zinc-800 bg-[#18181b] px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
        <p className="text-xs text-zinc-600 mt-1">{description.length}/500</p>
        {errors.description && <p className="text-xs text-red-600 mt-1">{errors.description}</p>}
      </div>

      {errors._general && <p className="text-sm text-red-600">{errors._general}</p>}

      <div className="flex justify-end gap-3 pt-2">
        <Button variant="secondary" type="button" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" loading={loading}>
          {isEdit ? "Guardar" : "Crear Grupo"}
        </Button>
      </div>
    </form>
  );
}
