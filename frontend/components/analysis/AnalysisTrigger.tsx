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
  const [showPromptInput, setShowPromptInput] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");

  async function handleAnalyze() {
    setLoading(true);
    setError("");
    try {
      await apiClient.post(`/api/cameras/${cameraId}/analyze/`, {
        custom_prompt: customPrompt.trim(),
      });
      setShowPromptInput(false);
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

  if (showPromptInput) {
    return (
      <div className="flex items-center gap-2 w-full max-w-md">
        <input
          type="text"
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          placeholder="Contexto opcional (ej: es un parqueo, enfócate en vehículos)"
          className="flex-1 border border-zinc-800 rounded-none bg-[#18181b] px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
          autoFocus
        />
        <Button onClick={handleAnalyze} loading={loading} className="text-xs whitespace-nowrap">
          {loading ? "Analizando..." : "Analizar"}
        </Button>
        <button
          onClick={() => setShowPromptInput(false)}
          className="text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {error && <span className="text-xs text-red-400">{error}</span>}
      <Button onClick={() => setShowPromptInput(true)} loading={loading}>
        {loading ? "Analizando..." : "Solicitar análisis IA"}
      </Button>
    </div>
  );
}
