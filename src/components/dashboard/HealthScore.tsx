"use client";

import { Card } from "@/components/ui/Card";

interface HealthScoreProps {
  score: number;
  breakdown: { label: string; value: number; color: string }[];
}

export function HealthScore({ score, breakdown }: HealthScoreProps) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;

  const color =
    score >= 80 ? "var(--success)" :
    score >= 60 ? "var(--amber-500)" :
    "var(--danger)";

  const label =
    score >= 80 ? "Excellent" :
    score >= 60 ? "Good" :
    score >= 40 ? "Fair" : "Needs attention";

  return (
    <Card>
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)] mb-4">School health score</p>
      <div className="flex items-center gap-6">
        {/* Gauge */}
        <div className="relative shrink-0">
          <svg width="132" height="132" viewBox="0 0 132 132">
            <circle cx="66" cy="66" r={r} fill="none" stroke="var(--neutral-100)" strokeWidth="12" />
            <circle
              cx="66" cy="66" r={r} fill="none"
              stroke={color} strokeWidth="12"
              strokeDasharray={circ}
              strokeDashoffset={offset}
              strokeLinecap="round"
              transform="rotate(-90 66 66)"
              style={{ transition: "stroke-dashoffset 1s ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-extrabold text-[var(--text-strong)]">{score}%</span>
            <span className="text-xs font-medium" style={{ color }}>{label}</span>
          </div>
        </div>

        {/* Breakdown */}
        <div className="flex-1 space-y-2.5">
          {breakdown.map((item) => (
            <div key={item.label}>
              <div className="flex justify-between mb-1">
                <span className="text-xs text-[var(--text-muted)]">{item.label}</span>
                <span className="text-xs font-semibold font-mono text-[var(--text-strong)]">{item.value}%</span>
              </div>
              <div className="h-1.5 bg-[var(--neutral-100)] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${item.value}%`, background: item.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
