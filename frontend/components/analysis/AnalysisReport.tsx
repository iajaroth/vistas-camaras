"use client";

import { AnalysisReport } from "@/lib/types";

interface AnalysisReportViewProps {
  report: AnalysisReport;
}

const sections: { key: keyof Pick<AnalysisReport, "pros" | "improvements" | "recommended_analytics" | "critical_notes">; title: string; icon: string; color: string }[] = [
  { key: "pros", title: "Puntos a Favor", icon: "✓", color: "text-green-700 bg-green-50" },
  { key: "improvements", title: "Puntos de Mejora", icon: "↑", color: "text-amber-700 bg-amber-50" },
  { key: "recommended_analytics", title: "Analíticas Recomendadas", icon: "◎", color: "text-blue-700 bg-blue-50" },
  { key: "critical_notes", title: "Notas Críticas (IA)", icon: "!", color: "text-red-700 bg-red-50" },
];

export default function AnalysisReportView({ report }: AnalysisReportViewProps) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">
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
            <h4 className={`text-sm font-semibold mb-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded ${color}`}>
              <span>{icon}</span> {title}
            </h4>
            <ul className="space-y-1 ml-1">
              {items.map((item, i) => (
                <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                  <span className="text-gray-400 mt-0.5">•</span>
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
