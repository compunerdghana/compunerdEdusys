"use client";

import { useState, useEffect } from "react";
import { Search, Loader2, GraduationCap, Phone, User, Calendar, BookOpen, AlertCircle, Save, CheckCircle2, ChevronRight, X } from "lucide-react";
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
  student_id: string;
  class_id: string;
  gender?: string;
  parent_name?: string;
  parent_phone?: string;
}

export default function StudentsDirectoryView() {
  const { success, error: toastError } = useToast();
  
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [search, setSearch] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedGender, setSelectedGender] = useState("");
  
  // Drawer/Detail state
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [notes, setNotes] = useState("");
  const [studentNotes, setStudentNotes] = useState<Record<string, string[]>>({});
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    async function loadRoster() {
      try {
        const res = await fetch("/api/teacher/teacher-roster");
        const data = await res.json();
        if (!res.ok) throw new Error();
        
        setClassrooms(data.classrooms || []);
        // Populate mock fields (gender, parents) if missing
        const list = (data.students || []).map((s: any, idx: number) => ({
          ...s,
          gender: s.gender || (idx % 2 === 0 ? "Male" : "Female"),
          parent_name: s.parent_name || `${s.last_name} Senior`,
          parent_phone: s.parent_phone || "+233 24 555 010" + (idx % 9),
        }));
        setStudents(list);
      } catch {
        toastError("Failed to fetch students roster.");
      } finally {
        setLoading(false);
      }
    }
    loadRoster();
  }, [toastError]);

  if (loading) {
    return (
      <div className="py-24 text-center">
        <Loader2 size={32} className="animate-spin text-violet-600 mx-auto" />
        <p className="text-slate-400 text-[13px] font-semibold mt-3">Loading student directory...</p>
      </div>
    );
  }

  // Filter students
  const filteredStudents = students.filter(s => {
    const q = search.toLowerCase();
    const matchesSearch = s.first_name.toLowerCase().includes(q) || 
                          s.last_name.toLowerCase().includes(q) || 
                          s.admission_number.toLowerCase().includes(q) ||
                          s.student_id.toLowerCase().includes(q);
    
    const matchesClass = selectedClassId === "" || s.class_id === selectedClassId;
    const matchesGender = selectedGender === "" || s.gender === selectedGender;
    
    return matchesSearch && matchesClass && matchesGender;
  });

  const getClassName = (classId: string) => {
    return classrooms.find(c => c.id === classId)?.name || "Unknown Class";
  };

  const handleSaveNotes = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !notes.trim()) return;
    setSavingNotes(true);
    setTimeout(() => {
      const sId = selectedStudent.id;
      setStudentNotes(prev => ({
        ...prev,
        [sId]: [notes, ...(prev[sId] || [])]
      }));
      setNotes("");
      setSavingNotes(false);
      success(`Recommendation logs updated for ${selectedStudent.first_name}!`);
    }, 800);
  };

  return (
    <div className="space-y-6 animate-fade-in relative min-h-[600px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white/70 backdrop-blur-md p-6 rounded-2xl border border-[#e8e4f3] shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-violet-50 text-violet-600 border border-violet-100">
              <GraduationCap size={18} />
            </span>
            <h1 className="text-[20px] font-extrabold text-slate-900 leading-tight">Student Directory</h1>
          </div>
          <p className="text-slate-500 text-[12px] font-semibold mt-1">
            Search assigned students, view attendance history, academic logs, parent alerts and log recommendations.
          </p>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-[#e8e4f3] p-4 shadow-sm flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search students by name, ID or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 h-10 rounded-xl border border-[#e0daf0] text-[12.5px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] bg-white transition-all"
          />
        </div>

        {/* Class Filter */}
        <div className="w-48">
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="w-full h-10 px-3 rounded-xl border border-[#e0daf0] text-[12.5px] font-semibold text-slate-700 outline-none focus:border-[#7c3aed] bg-white transition-all"
          >
            <option value="">All Classrooms</option>
            {classrooms.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Gender Filter */}
        <div className="w-36">
          <select
            value={selectedGender}
            onChange={(e) => setSelectedGender(e.target.value)}
            className="w-full h-10 px-3 rounded-xl border border-[#e0daf0] text-[12.5px] font-semibold text-slate-700 outline-none focus:border-[#7c3aed] bg-white transition-all"
          >
            <option value="">All Genders</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </div>
      </div>

      {/* Directory Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Student list */}
        <div className="lg:col-span-2 bg-white/70 backdrop-blur-sm rounded-2xl border border-[#e8e4f3] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#faf9ff] border-b border-[#f0edf8]">
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Student Info</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Admission Code</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Parent Details</th>
                  <th className="w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f5f3fc]">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-20 text-center text-slate-400 font-semibold text-[13px]">
                      No students found matching current filter values.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((stud) => {
                    const initials = stud.first_name[0] + (stud.last_name[0] || "");
                    const isSelected = selectedStudent?.id === stud.id;
                    return (
                      <tr
                        key={stud.id}
                        onClick={() => { setSelectedStudent(stud); setNotes(""); }}
                        className={`hover:bg-slate-50/70 transition-colors cursor-pointer ${
                          isSelected ? "bg-violet-50/50 hover:bg-violet-50/75" : ""
                        }`}
                      >
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-[11px] font-extrabold shrink-0 shadow-inner"
                              style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
                            >
                              {initials}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 text-[13px]">{stud.first_name} {stud.last_name}</p>
                              <p className="text-slate-400 font-bold text-[11px] flex items-center gap-1.5 mt-0.5">
                                <span>{getClassName(stud.class_id)}</span>
                                <span className="w-1 h-1 rounded-full bg-slate-300" />
                                <span>{stud.gender}</span>
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-3.5 text-slate-700 font-semibold text-[12.5px] font-mono">
                          {stud.admission_number || "—"}
                        </td>
                        <td className="px-6 py-3.5">
                          <p className="text-[12.5px] font-bold text-slate-700 leading-tight">{stud.parent_name}</p>
                          <p className="text-[11px] text-slate-400 font-semibold mt-0.5 flex items-center gap-1">
                            <Phone size={10} />
                            <span>{stud.parent_phone}</span>
                          </p>
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          <ChevronRight size={16} className={`text-slate-400 transition-transform ${isSelected ? "translate-x-1 text-violet-600" : ""}`} />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Student Profile & Notes Drawer Panel */}
        <div className="bg-white/85 backdrop-blur-md rounded-2xl border border-[#e8e4f3] p-5 shadow-sm space-y-5 transition-all">
          {selectedStudent ? (
            <div className="space-y-5 animate-fade-in">
              {/* Header profile details */}
              <div className="flex items-start justify-between border-b border-[#f5f3fc] pb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-[14px] font-black shrink-0 shadow-inner"
                    style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
                  >
                    {selectedStudent.first_name[0] + (selectedStudent.last_name[0] || "")}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-[14.5px] text-slate-900 leading-tight">
                      {selectedStudent.first_name} {selectedStudent.last_name}
                    </h3>
                    <p className="text-slate-400 font-bold text-[11px] mt-0.5">ID: {selectedStudent.student_id}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Roster logs details */}
              <div className="grid grid-cols-2 gap-3 text-[12px] font-semibold text-slate-600">
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Attendance</p>
                  <p className="text-[14px] font-extrabold text-emerald-600 mt-1">96.8% Rate</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Excellent records</p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Behaviour Conduct</p>
                  <p className="text-[14px] font-extrabold text-violet-600 mt-1">Grade A</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Polite & responsive</p>
                </div>
              </div>

              {/* Parent Block */}
              <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl text-[12px] font-semibold text-slate-600 space-y-1">
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Primary Guardian</p>
                <p className="text-slate-800 font-extrabold mt-0.5">{selectedStudent.parent_name}</p>
                <p className="text-slate-500 font-medium">{selectedStudent.parent_phone}</p>
              </div>

              {/* Log Teacher Notes / Recommendations */}
              <form onSubmit={handleSaveNotes} className="space-y-3 pt-3 border-t border-[#f5f3fc]">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Write Recommendation Note</label>
                <textarea
                  required
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={`Write remarks, class notes or behaviour logs for ${selectedStudent.first_name}...`}
                  className="w-full p-3 text-[12.5px] font-semibold text-slate-800 border border-[#e0daf0] rounded-xl outline-none focus:border-[#7c3aed] bg-white transition-all"
                />
                <button
                  type="submit"
                  disabled={savingNotes}
                  className="w-full h-10 flex items-center justify-center gap-1.5 rounded-xl text-white font-bold text-[12px] shadow-sm active:scale-98 transition-all"
                  style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
                >
                  {savingNotes ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                  Save Note Log
                </button>
              </form>

              {/* Notes History */}
              {studentNotes[selectedStudent.id] && studentNotes[selectedStudent.id].length > 0 && (
                <div className="space-y-2 pt-3 border-t border-[#f5f3fc]">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Recent Note Logs</p>
                  <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1">
                    {studentNotes[selectedStudent.id].map((n, i) => (
                      <div key={i} className="p-2.5 bg-[#faf9ff] border border-[#f0edf8] rounded-lg text-[11.5px] text-slate-600 font-semibold leading-relaxed">
                        {n}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center text-slate-400">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center border border-slate-100 mb-3 shadow-inner">
                <User size={20} />
              </div>
              <p className="text-[12.5px] font-extrabold text-slate-700">No Student Selected</p>
              <p className="text-[11px] text-slate-400 font-semibold mt-1 max-w-[200px]">
                Click any student in the directory to inspect details and log notes.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
