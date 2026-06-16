"use client";

import { useState } from "react";
import {
  BarChart3, Calendar, User, AlertTriangle, GraduationCap, Rocket,
  TrendingUp, Clock, CheckCircle2, Percent,
} from "lucide-react";
import { SlidePanel } from "@/components/ui/SlidePanel";

interface ReportCard {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
  bg: string;
}

interface MockData {
  title: string;
  type: "bars" | "table";
  data: { label: string; value: number; color?: string }[] | { cols: string[]; rows: string[][] };
}

const REPORTS: ReportCard[] = [
  { id: "onboarded", icon: Calendar, title: "Schools Onboarded", description: "Count of schools onboarded by month, showing growth trends", color: "#4f46e5", bg: "#eef2ff" },
  { id: "duration", icon: Clock, title: "Average Onboarding Duration", description: "Average time taken per stage of the onboarding process", color: "#7c3aed", bg: "#f5f3ff" },
  { id: "officer", icon: User, title: "Officer Performance", description: "Schools per officer, completion rates and efficiency scores", color: "#0891b2", bg: "#ecfeff" },
  { id: "delayed", icon: AlertTriangle, title: "Delayed Projects", description: "Schools experiencing delays with reasons and impact analysis", color: "#dc2626", bg: "#fef2f2" },
  { id: "training", icon: GraduationCap, title: "Training Completion", description: "Training completion rates by type and school category", color: "#d97706", bg: "#fffbeb" },
  { id: "activation", icon: Rocket, title: "Activation Success Rate", description: "Monthly trend of successful school activations and go-lives", color: "#059669", bg: "#ecfdf5" },
];

const MOCK_REPORT_DATA: Record<string, MockData> = {
  onboarded: {
    title: "Schools Onboarded by Month",
    type: "bars",
    data: [
      { label: "Jan", value: 3, color: "#4f46e5" }, { label: "Feb", value: 5, color: "#4f46e5" },
      { label: "Mar", value: 8, color: "#4f46e5" }, { label: "Apr", value: 6, color: "#4f46e5" },
      { label: "May", value: 11, color: "#4f46e5" }, { label: "Jun", value: 9, color: "#4f46e5" },
    ],
  },
  duration: {
    title: "Average Duration by Stage",
    type: "bars",
    data: [
      { label: "Registration", value: 2, color: "#6366f1" }, { label: "Verification", value: 5, color: "#8b5cf6" },
      { label: "Setup", value: 14, color: "#a855f7" }, { label: "Training", value: 7, color: "#3b82f6" },
      { label: "Testing", value: 5, color: "#06b6d4" }, { label: "Go-Live", value: 3, color: "#10b981" },
    ],
  },
  officer: {
    title: "Officer Performance Report",
    type: "table",
    data: {
      cols: ["Officer", "Active Schools", "Completed", "Avg. Days", "Completion Rate"],
      rows: [
        ["Kwame Asante", "4", "12", "38", "85%"],
        ["Abena Mensah", "3", "8", "42", "78%"],
        ["Kofi Boateng", "5", "15", "35", "91%"],
      ],
    },
  },
  delayed: {
    title: "Delayed Projects",
    type: "table",
    data: {
      cols: ["School", "Stage", "Days Delayed", "Reason", "Officer"],
      rows: [
        ["Star Academy", "Verification", "12", "Missing documents", "Kwame Asante"],
        ["Bright Kids School", "Training", "8", "Staff unavailability", "Abena Mensah"],
        ["Future Leaders", "Setup", "5", "Technical issues", "Kofi Boateng"],
      ],
    },
  },
  training: {
    title: "Training Completion by Type",
    type: "bars",
    data: [
      { label: "Admin", value: 85, color: "#7c3aed" }, { label: "Teachers", value: 72, color: "#7c3aed" },
      { label: "Finance", value: 68, color: "#7c3aed" }, { label: "Attendance", value: 91, color: "#7c3aed" },
      { label: "Go-Live", value: 60, color: "#7c3aed" },
    ],
  },
  activation: {
    title: "Activation Success Rate",
    type: "bars",
    data: [
      { label: "Jan", value: 80, color: "#059669" }, { label: "Feb", value: 85, color: "#059669" },
      { label: "Mar", value: 78, color: "#059669" }, { label: "Apr", value: 90, color: "#059669" },
      { label: "May", value: 88, color: "#059669" }, { label: "Jun", value: 94, color: "#059669" },
    ],
  },
};

function BarChart({ data }: { data: { label: string; value: number; color?: string }[] }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="space-y-3">
      {data.map(d => (
        <div key={d.label} className="flex items-center gap-3">
          <span className="text-[12px] font-semibold text-slate-500 w-20 shrink-0 text-right">{d.label}</span>
          <div className="flex-1 h-7 bg-slate-100 rounded-lg overflow-hidden">
            <div
              className="h-7 rounded-lg flex items-center px-2 transition-all duration-500"
              style={{ width: `${(d.value / max) * 100}%`, background: d.color ?? "#4f46e5", minWidth: 32 }}>
              <span className="text-[11px] font-extrabold text-white">{d.value}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function DataTable({ data }: { data: { cols: string[]; rows: string[][] } }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="bg-[#faf9ff]">
            {data.cols.map(c => (
              <th key={c} className="px-4 py-2.5 text-left text-slate-400 uppercase tracking-widest text-[10px] font-bold">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#f0edf8]">
          {data.rows.map((row, i) => (
            <tr key={i} className="hover:bg-[#faf9ff]">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-2.5 text-[12px] font-semibold text-slate-700">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState<string | null>(null);
  const active = activeReport ? MOCK_REPORT_DATA[activeReport] : null;
  const activeCard = activeReport ? REPORTS.find(r => r.id === activeReport) : null;

  return (
    <div className="min-h-screen bg-[#f8f7ff]">
      <div className="max-w-screen-xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-[26px] font-extrabold text-slate-900">Onboarding Reports</h1>
          <p className="text-[13px] text-slate-500 mt-0.5">Analytics and insights for your school onboarding program</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { icon: Clock, label: "Avg Onboarding Duration", value: "42 days", color: "#7c3aed", bg: "#f5f3ff" },
            { icon: CheckCircle2, label: "Verification Success Rate", value: "87%", color: "#059669", bg: "#ecfdf5" },
            { icon: GraduationCap, label: "Training Completion Rate", value: "79%", color: "#d97706", bg: "#fffbeb" },
            { icon: Percent, label: "Activation Rate", value: "91%", color: "#4f46e5", bg: "#eef2ff" },
          ].map(({ icon: Icon, label, value, color, bg }) => (
            <div key={label} className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] p-5 flex items-center gap-4" style={{ borderLeftWidth: 4, borderLeftColor: color }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: bg }}>
                <Icon size={20} style={{ color }} />
              </div>
              <div>
                <p className="text-[20px] font-extrabold text-slate-900 leading-tight">{value}</p>
                <p className="text-[11px] font-semibold text-slate-500 mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Report Cards */}
        <h2 className="text-[18px] font-extrabold text-slate-900 mb-4">Available Reports</h2>
        <div className="grid grid-cols-3 gap-5">
          {REPORTS.map(report => {
            const Icon = report.icon;
            return (
              <div key={report.id} className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] p-6 hover:shadow-md transition-all">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: report.bg }}>
                    <Icon size={22} style={{ color: report.color }} />
                  </div>
                  <div>
                    <h3 className="text-[14px] font-extrabold text-slate-900">{report.title}</h3>
                    <p className="text-[12px] text-slate-400 font-semibold mt-1 leading-relaxed">{report.description}</p>
                  </div>
                </div>
                <button onClick={() => setActiveReport(report.id)}
                  className="w-full h-9 rounded-xl text-[12px] font-bold transition-all hover:opacity-90 text-white"
                  style={{ background: `linear-gradient(135deg,${report.color},${report.color}cc)` }}>
                  Generate Report
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Report SlidePanel */}
      {active && activeCard && (
        <SlidePanel
          open
          onClose={() => setActiveReport(null)}
          title={active.title}
          subtitle={activeCard.description}
          width="xl">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                Generated: {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}
              </span>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">Live Data</span>
            </div>
            {active.type === "bars" && Array.isArray(active.data) && (
              <BarChart data={active.data as { label: string; value: number; color?: string }[]} />
            )}
            {active.type === "table" && !Array.isArray(active.data) && (
              <DataTable data={active.data as { cols: string[]; rows: string[][] }} />
            )}
          </div>
        </SlidePanel>
      )}
    </div>
  );
}
