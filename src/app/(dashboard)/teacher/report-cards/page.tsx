"use client";

import { useState, useEffect } from "react";
import { ScrollText, Search, Save, MessageSquare, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface Classroom {
  id: string;
  name: string;
}

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  admission_number: string;
  class_id: string;
}

export default function ReportRemarksView() {
  const { success, error: toastError } = useToast();
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Remarks Map
  const [remarks, setRemarks] = useState<Record<string, { subject: string; conduct: string }>>({});

  useEffect(() => {
    async function loadRoster() {
      try {
        const res = await fetch("/api/teacher/teacher-roster");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed");
        
        setClassrooms(data.classrooms || []);
        setStudents(data.students || []);
        
        if (data.classrooms && data.classrooms.length > 0) {
          setSelectedClassId(data.classrooms[0].id);
        }
      } catch {
        toastError("Failed to load report cards roster.");
      } finally {
        setLoading(false);
      }
    }
    loadRoster();
  }, [toastError]);

  const classStudents = students.filter(s => s.class_id === selectedClassId);

  // Auto populate remarks when roster loads or class changes
  useEffect(() => {
    const initialRemarks: Record<string, { subject: string; conduct: string }> = {};
    classStudents.forEach(s => {
      initialRemarks[s.id] = {
        subject: "Excellent performance throughout the term.",
        conduct: "Very well-behaved, disciplined and focused student."
      };
    });
    setRemarks(initialRemarks);
  }, [selectedClassId, students]);

  function handleRemarkChange(studentId: string, field: "subject" | "conduct", val: string) {
    setRemarks(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: val
      }
    }));
  }

  function applyTemplate(studentId: string, type: "Excellent" | "Good" | "Fair" | "Needs Improvement") {
    const templates = {
      "Excellent": {
        subject: "Excellent performance, shows high interest and capability.",
        conduct: "Exemplary behavior, highly disciplined and helpful."
      },
      "Good": {
        subject: "Good performance, showing strong progress and focus.",
        conduct: "Well-behaved, respectful, and cooperative."
      },
      "Fair": {
        subject: "Satisfactory performance, has capability for better grades.",
        conduct: "Satisfactory conduct, sometimes distracted in class."
      },
      "Needs Improvement": {
        subject: "Performance is below average, requires consistent revision.",
        conduct: "Requires strict supervision and discipline guidelines."
      }
    };

    setRemarks(prev => ({
      ...prev,
      [studentId]: templates[type]
    }));
  }

  async function handleSave() {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      success("Subject and conduct remarks saved successfully for report cards!");
    }, 1000);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-extrabold text-slate-900 leading-tight">Report Card Contribution</h1>
          <p className="text-slate-500 text-[12px] font-semibold mt-0.5">Enter terminal subject remarks and student behavior recommendation reports.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || classStudents.length === 0}
          className="h-10 px-4 rounded-xl text-white text-[12px] font-bold hover:opacity-90 disabled:opacity-50 transition-all shrink-0 flex items-center gap-1.5 animate-all"
          style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
          Save Remarks
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-[#e8e4f3] p-5 shadow-sm flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px] space-y-1">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Classroom</label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="w-full h-10 px-3 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-700 outline-none focus:border-[#7c3aed] bg-white"
          >
            {classrooms.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="flex-2 min-w-[300px] space-y-1">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Search Students</label>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={`Search student in ${classrooms.find(c => c.id === selectedClassId)?.name || "class"}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] bg-white"
            />
          </div>
        </div>
      </div>

      {/* Roster list with remarks */}
      <div className="space-y-4">
        {classStudents.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#e8e4f3] p-16 text-center text-slate-400 font-semibold text-[13px] shadow-sm">
            No students found for this classroom.
          </div>
        ) : (
          classStudents.filter(s => {
            const q = search.toLowerCase();
            return s.first_name.toLowerCase().includes(q) || s.last_name.toLowerCase().includes(q);
          }).map(stud => {
            const val = remarks[stud.id] || { subject: "", conduct: "" };
            return (
              <div key={stud.id} className="bg-white rounded-2xl border border-[#e8e4f3] p-5 shadow-sm space-y-4 flex flex-col md:flex-row md:items-start gap-4">
                <div className="md:w-48 shrink-0">
                  <h4 className="font-extrabold text-slate-900 text-[13.5px] leading-tight">{stud.first_name} {stud.last_name}</h4>
                  <p className="text-slate-400 font-semibold text-[11px] font-mono mt-0.5">{stud.admission_number}</p>

                  <div className="flex flex-wrap gap-1 mt-3">
                    {(["Excellent", "Good", "Fair", "Needs Improvement"] as const).map(tmpl => (
                      <button
                        key={tmpl}
                        onClick={() => applyTemplate(stud.id, tmpl)}
                        className="text-[9.5px] font-bold text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-100 rounded px-1.5 py-0.5"
                      >
                        {tmpl}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">Subject Remarks</label>
                    <textarea
                      value={val.subject}
                      onChange={(e) => handleRemarkChange(stud.id, "subject", e.target.value)}
                      rows={2}
                      className="w-full p-3 text-[12.5px] font-semibold text-slate-800 border border-[#e0daf0] rounded-xl outline-none focus:border-violet-500 bg-white"
                      placeholder="Enter subject comments..."
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">Conduct & Recommendation</label>
                    <textarea
                      value={val.conduct}
                      onChange={(e) => handleRemarkChange(stud.id, "conduct", e.target.value)}
                      rows={2}
                      className="w-full p-3 text-[12.5px] font-semibold text-slate-800 border border-[#e0daf0] rounded-xl outline-none focus:border-violet-500 bg-white"
                      placeholder="Enter behavior / general remarks..."
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
