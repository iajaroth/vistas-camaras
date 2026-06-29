"use client";

import { useCallback, useRef, useState } from "react";
import { apiClient } from "@/lib/api";
import Button from "@/components/ui/Button";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

interface ImageUploaderProps {
  cameraId: string;
  viewType: "day" | "night";
  onUploadComplete: () => void;
}

export default function ImageUploader({ cameraId, viewType, onUploadComplete }: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function validate(file: File): string | null {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return "Formato no soportado. Solo JPEG, PNG o WebP.";
    }
    if (file.size > MAX_SIZE) {
      return "El archivo excede 10 MB.";
    }
    return null;
  }

  async function uploadFile(file: File) {
    const validationError = validate(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      await apiClient.post(`/api/cameras/${cameraId}/upload/?type=${viewType}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onUploadComplete();
    } catch {
      setError("Error al subir la imagen. Intenta de nuevo.");
    } finally {
      setUploading(false);
    }
  }

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) uploadFile(file);
    },
    [cameraId, viewType]
  );

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    // Reset so same file can be uploaded again
    e.target.value = "";
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-none p-4 text-center transition-colors ${
          dragOver
            ? "border-blue-500 bg-blue-600/10"
            : "border-zinc-700 hover:border-zinc-500"
        }`}
      >
        <p className="text-xs text-zinc-500 mb-2">
          Arrastra una imagen aquí o
        </p>
        <Button
          variant="secondary"
          onClick={() => inputRef.current?.click()}
          loading={uploading}
          className="text-xs"
        >
          {uploading ? "Subiendo..." : "Seleccionar archivo"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp"
          onChange={handleFileChange}
          className="hidden"
        />
        <p className="text-xs text-zinc-600 mt-2">JPEG, PNG o WebP · máx. 10 MB</p>
      </div>
      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
    </div>
  );
}
