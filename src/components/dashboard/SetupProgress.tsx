"use client";

import Link from "next/link";
import { CheckCircle2, Circle, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/Card";

interface Step {
  label: string;
  done: boolean;
  href: string;
}

interface SetupProgressProps {
  steps: Step[];
  schoolName: string;
}

export function SetupProgress({ steps, schoolName }: SetupProgressProps) {
  const doneCount = steps.filter((s) => s.done).length;
  const percent = Math.round((doneCount / steps.length) * 100);
  const nextStep = steps.find((s) => !s.done);

  return (
    <Card className="border-[var(--border-brand)] bg-gradient-to-br from-[var(--indigo-50)] to-white">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--brand)] mb-1">Getting started</p>
          <h3 className="text-lg font-bold text-[var(--text-strong)]">
            Welcome to {schoolName || "CompunerdEduSys"}
          </h3>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            Complete your school setup to unlock all features.
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-3xl font-extrabold text-[var(--brand)]">{percent}%</p>
          <p className="text-xs text-[var(--text-muted)]">complete</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-[var(--indigo-100)] rounded-full mb-5 overflow-hidden">
        <div
          className="h-full rounded-full bg-[var(--brand)] transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Steps */}
      <div className="space-y-2.5">
        {steps.map((step, i) => (
          <Link key={i} href={step.done ? "#" : step.href} className={step.done ? "pointer-events-none" : ""}>
            <div className={`flex items-center gap-3 px-3 py-2.5 rounded-[10px] transition-all ${
              step.done ? "opacity-50" : "hover:bg-[var(--brand-subtle)] cursor-pointer"
            }`}>
              {step.done
                ? <CheckCircle2 size={18} className="text-[var(--success)] shrink-0" />
                : <Circle size={18} className="text-[var(--neutral-300)] shrink-0" />
              }
              <span className={`text-sm flex-1 ${step.done ? "line-through text-[var(--text-muted)]" : "font-medium text-[var(--text-strong)]"}`}>
                {step.label}
              </span>
              {!step.done && <ArrowRight size={14} className="text-[var(--text-subtle)]" />}
            </div>
          </Link>
        ))}
      </div>

      {nextStep && (
        <Link href={nextStep.href}>
          <div className="mt-4 flex items-center gap-2 px-4 py-2.5 rounded-[10px] text-sm font-semibold text-white transition-all hover:opacity-90" style={{ background: "var(--gradient-brand)" }}>
            <ArrowRight size={15} />
            Continue setup: {nextStep.label}
          </div>
        </Link>
      )}
    </Card>
  );
}
