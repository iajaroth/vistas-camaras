"use client";

import { AnalysisReport } from "@/lib/types";

interface AnalysisReportViewProps {
  report: AnalysisReport;
}

const sections: { key: keyof Pick<AnalysisReport, "pros" | "improvements" | "recommended_analytics" | "critical_notes">; title: string; icon: string; color: string }[] = [
  { key: "pros", title: "Puntos a Favor", icon: "✓", color: "text-emerald-400 bg-emerald-950 border border-emerald-800" },
  { key: "improvements", title: "Puntos de Mejora", icon: "↑", color: "text-amber-400 bg-amber-950 border border-amber-800" },
  { key: "recommended_analytics", title: "Analíticas Recomendadas", icon: "◎", color: "text-blue-400 bg-blue-950 border border-blue-800" },
  { key: "critical_notes", title: "Notas Críticas (IA)", icon: "!", color: "text-red-400 bg-red-950 border border-red-800" },
];

export default function AnalysisReportView({ report }: AnalysisReportViewProps) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-zinc-500">
        Analizado: {new Date(report.analyzed_at).toLocaleDateString("es-ES", {
          day: "numeric",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </p>
      {sections.map(({ key, title, icon, color }) => {
        const items = report[key];
        if (!items || items.length === 0) return null;
        return (
          <div key={key}>
            <h4 className={`text-sm font-semibold mb-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-none ${color}`}>
              <span>{icon}</span> {title}
            </h4>
            <ul className="space-y-1 ml-1">
              {items.map((item, i) => (
                <li key={i} className="text-sm text-zinc-300 flex items-start gap-2">
                  <span className="text-zinc-600 mt-0.5">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
