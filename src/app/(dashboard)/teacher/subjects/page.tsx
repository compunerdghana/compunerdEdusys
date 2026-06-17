"use client";

import { useState, useEffect } from "react";
import { BookOpen, Search, GraduationCap, Loader2, ArrowRight } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface Subject {
  id: string;
  name: string;
}

export default function MySubjectsView() {
  const { error: toastError } = useToast();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchSubjects() {
      try {
        const res = await fetch("/api/teacher/teacher-roster");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed");
        setSubjects(data.subjects || []);
      } catch {
        toastError("Failed to fetch subject details.");
      } finally {
        setLoading(false);
      }
    }
    fetchSubjects();
  }, [toastError]);

  if (loading) {
    return (
      <div className="py-24 text-center">
        <Loader2 size={32} className="animate-spin text-violet-600 mx-auto" />
        <p className="text-slate-400 text-[13px] font-semibold mt-3">Fetching subject lists...</p>
      </div>
    );
  }

  const filtered = subjects.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));

  // Mock analytics totals
  const mockAnalytics = [
    { title: "Class Average Score", value: "78.4%", color: "border-l-indigo-500" },
    { title: "Syllabus Coverage", value: "85%", color: "border-l-violet-500" },
    { title: "Exams Submitted", value: "Pending Finalization", color: "border-l-amber-500 text-amber-600" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-[20px] font-extrabold text-slate-900 leading-tight">My Subjects</h1>
        <p className="text-slate-500 text-[12px] font-semibold mt-0.5">Assigned subjects overview, grading metrics, and term performance tracker.</p>
      </div>

      {/* Analytics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {mockAnalytics.map(an => (
          <div key={an.title} className={`bg-white rounded-2xl border-l-4 ${an.color} border border-y border-r border-[#e8e4f3] p-4 shadow-sm flex flex-col gap-1`}>
            <span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400 leading-none">{an.title}</span>
            <span className="text-[16px] font-extrabold text-slate-900 mt-1">{an.value}</span>
          </div>
        ))}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search subjects assigned..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white"
        />
      </div>

      {/* Subjects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.length === 0 ? (
          <div className="col-span-full bg-white rounded-2xl border border-[#e8e4f3] p-16 text-center text-slate-400 font-semibold text-[13px] shadow-sm">
            No subjects found matching search.
          </div>
        ) : (
          filtered.map(sub => (
            <div key={sub.id} className="bg-white rounded-2xl border border-[#e8e4f3] p-5 shadow-sm space-y-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
                  <BookOpen size={18} />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-[14px] leading-tight">{sub.name}</h4>
                  <p className="text-slate-400 font-medium text-[11px] mt-0.5">Primary / JHS Syllabus</p>
                </div>
              </div>

              <div className="border-t border-[#f5f3fc] pt-3 flex items-center justify-between text-[11.5px] font-semibold text-slate-500">
                <span>Assessments Done</span>
                <span className="text-slate-800 font-bold">5 Quizzes · 2 Exams</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
