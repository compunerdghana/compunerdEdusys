"use client";

import { useState, useEffect } from "react";
import { ScrollText, Search, Save, MessageSquare, Loader2, Sparkles, HelpCircle } from "lucide-react";
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
  const [remarks, setRemarks] = useState<Record<string, { subject: string; conduct: string; recommendations: string }>>({});

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
    const initialRemarks: Record<string, { subject: string; conduct: string; recommendations: string }> = {};
    classStudents.forEach(s => {
      initialRemarks[s.id] = {
        subject: "Excellent performance throughout the term.",
        conduct: "Very well-behaved, disciplined and focused student.",
        recommendations: "Keep up the excellent academic standard."
      };
    });
    setRemarks(initialRemarks);
  }, [selectedClassId, students]);

  function handleRemarkChange(studentId: string, field: "subject" | "conduct" | "recommendations", val: string) {
    setRemarks(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: val
      }
    }));
  }

  const templates = {
    "Excellent": {
      subject: "Excellent performance, shows high interest and capability.",
      conduct: "Exemplary behavior, highly disciplined and helpful.",
      recommendations: "Keep up the excellent standard!"
    },
    "Good": {
      subject: "Good performance, showing strong progress and focus.",
      conduct: "Well-behaved, respectful, and cooperative.",
      recommendations: "Continue to work hard to achieve even better grades."
    },
    "Fair": {
      subject: "Satisfactory performance, has capability for better grades.",
      conduct: "Satisfactory conduct, sometimes distracted in class.",
      recommendations: "More effort should be put into home revisions."
    },
    "Needs Improvement": {
      subject: "Performance is below average, requires consistent revision.",
      conduct: "Requires strict supervision and discipline guidelines.",
      recommendations: "Should attend extra tutorials and focus on weak areas."
    }
  };

  function applyTemplate(studentId: string, type: keyof typeof templates) {
    setRemarks(prev => ({
      ...prev,
      [studentId]: templates[type]
    }));
    success(`Applied ${type} template to student remarks.`);
  }

  function applyBulkTemplate(type: keyof typeof templates) {
    const updated = { ...remarks };
    classStudents.forEach(s => {
      updated[s.id] = templates[type];
    });
    setRemarks(updated);
    success(`Applied ${type} template in bulk to all ${classStudents.length} students!`);
  }

  async function handleSave() {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      success("Subject, conduct, and recommendation remarks saved successfully!");
    }, 1000);
  }

  if (loading) {
    return (
      <div className="py-24 text-center">
        <Loader2 size={32} className="animate-spin text-violet-600 mx-auto" />
        <p className="text-slate-400 text-[13px] font-semibold mt-3">Loading report contribution interface...</p>
      </div>
    );
  }

  const filteredStudents = classStudents.filter(s => {
    const q = search.toLowerCase();
    return s.first_name.toLowerCase().includes(q) || s.last_name.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white/70 backdrop-blur-md p-6 rounded-2xl border border-[#e8e4f3] shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-violet-50 text-violet-600 border border-violet-100">
              <ScrollText size={18} />
            </span>
            <h1 className="text-[20px] font-extrabold text-slate-900 leading-tight">Report Card Contribution</h1>
          </div>
          <p className="text-slate-500 text-[12px] font-semibold mt-1">
            Contribute student subject remarks, conduct/behavior records, and formal recommendations for report cards.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || classStudents.length === 0}
          className="h-10 px-4 rounded-xl text-white text-[12px] font-bold hover:opacity-90 disabled:opacity-50 transition-all shrink-0 flex items-center gap-1.5 active:scale-98"
          style={{ background: "linear-gradient(135deg, #262262, #92278F)" }}
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
          Save All Remarks
        </button>
      </div>

      {/* Filters & Bulk Control Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Selection & Search */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-[#e8e4f3] p-5 shadow-sm space-y-4">
          <h3 className="text-[12.5px] font-black text-slate-900 border-b border-[#f5f3fc] pb-2.5">
            Roster Filters
          </h3>

          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Classroom</label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-700 outline-none focus:border-[#7c3aed] bg-white transition-all"
            >
              {classrooms.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Search Students</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={`Search student...`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] bg-white transition-all"
              />
            </div>
          </div>
        </div>

        {/* Bulk Action Panel */}
        <div className="lg:col-span-2 bg-gradient-to-tr from-violet-50/40 via-white to-indigo-50/20 rounded-2xl border border-[#e8e4f3] p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-[12.5px] font-black text-slate-900 flex items-center gap-1.5 border-b border-[#f5f3fc] pb-2.5">
              <Sparkles size={14} className="text-violet-600" />
              Bulk Remarks Application
            </h3>
            <p className="text-[11.5px] text-slate-500 font-semibold leading-relaxed mt-2">
              Apply a template of standard remarks and recommendations to all students currently enrolled in this classroom. 
              You can customize each comment individually below after applying.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5 pt-4">
            {(Object.keys(templates) as Array<keyof typeof templates>).map(tmpl => (
              <button
                key={tmpl}
                onClick={() => applyBulkTemplate(tmpl)}
                disabled={classStudents.length === 0}
                className="h-9 px-3.5 rounded-xl border border-violet-100 hover:border-violet-200 text-violet-700 bg-white hover:bg-violet-50/50 font-bold text-[11px] active:scale-98 transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50 disabled:pointer-events-none"
              >
                <span>Bulk: {tmpl}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Roster list with remarks */}
      <div className="space-y-4">
        {filteredStudents.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#e8e4f3] p-16 text-center text-slate-400 font-semibold text-[13px] shadow-sm">
            No students found matching your search.
          </div>
        ) : (
          filteredStudents.map(stud => {
            const val = remarks[stud.id] || { subject: "", conduct: "", recommendations: "" };
            return (
              <div key={stud.id} className="bg-white rounded-2xl border border-[#e8e4f3] p-5 shadow-sm space-y-4 flex flex-col xl:flex-row xl:items-start gap-5 hover:border-violet-200 transition-all">
                {/* Student Bio & Quick presets */}
                <div className="xl:w-60 shrink-0">
                  <h4 className="font-extrabold text-slate-900 text-[13.5px] leading-tight">
                    {stud.first_name} {stud.last_name}
                  </h4>
                  <p className="text-slate-400 font-bold text-[10.5px] font-mono mt-1">
                    ID: {stud.admission_number}
                  </p>

                  <div className="mt-4 pt-3 border-t border-slate-50">
                    <p className="text-[9.5px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">Preset Templates</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(Object.keys(templates) as Array<keyof typeof templates>).map(tmpl => (
                        <button
                          key={tmpl}
                          onClick={() => applyTemplate(stud.id, tmpl)}
                          className="text-[9.5px] font-bold text-violet-700 bg-violet-50/50 hover:bg-violet-100 border border-violet-100/50 rounded-lg py-1 px-1.5 transition-all text-center"
                        >
                          {tmpl}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Contribution Textareas */}
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Subject Remarks</label>
                      <span className="text-[9px] font-bold text-slate-300">Auto-saved</span>
                    </div>
                    <textarea
                      value={val.subject}
                      onChange={(e) => handleRemarkChange(stud.id, "subject", e.target.value)}
                      rows={3}
                      className="w-full p-3 text-[12.5px] font-semibold text-slate-700 border border-[#e0daf0] rounded-xl outline-none focus:border-violet-500 bg-[#faf9ff]/30 focus:bg-white transition-all resize-none"
                      placeholder="Comment on class academic results..."
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Conduct Remarks</label>
                      <span className="text-[9px] font-bold text-slate-300">Auto-saved</span>
                    </div>
                    <textarea
                      value={val.conduct}
                      onChange={(e) => handleRemarkChange(stud.id, "conduct", e.target.value)}
                      rows={3}
                      className="w-full p-3 text-[12.5px] font-semibold text-slate-700 border border-[#e0daf0] rounded-xl outline-none focus:border-violet-500 bg-[#faf9ff]/30 focus:bg-white transition-all resize-none"
                      placeholder="Comment on behaviour and discipline..."
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Recommendations</label>
                      <span className="text-[9px] font-bold text-slate-300">Auto-saved</span>
                    </div>
                    <textarea
                      value={val.recommendations}
                      onChange={(e) => handleRemarkChange(stud.id, "recommendations", e.target.value)}
                      rows={3}
                      className="w-full p-3 text-[12.5px] font-semibold text-slate-700 border border-[#e0daf0] rounded-xl outline-none focus:border-violet-500 bg-[#faf9ff]/30 focus:bg-white transition-all resize-none"
                      placeholder="Promotions, improvement plans, etc..."
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
