"use client";

import { useState } from "react";
import { apiClient } from "@/lib/api";
import Button from "@/components/ui/Button";

interface AnalysisTriggerProps {
  cameraId: string;
  onAnalysisComplete: () => void;
}

export default function AnalysisTrigger({ cameraId, onAnalysisComplete }: AnalysisTriggerProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleAnalyze() {
    setLoading(true);
    setError("");
    try {
      await apiClient.post(`/api/cameras/${cameraId}/analyze/`);
      onAnalysisComplete();
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 503) {
        setError("El servicio de IA no está disponible. Intenta más tarde.");
      } else {
        setError("Error al solicitar el análisis.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      {error && <span className="text-xs text-red-400">{error}</span>}
      <Button onClick={handleAnalyze} loading={loading}>
        {loading ? "Analizando..." : "Solicitar análisis IA"}
      </Button>
    </div>
  );
}
