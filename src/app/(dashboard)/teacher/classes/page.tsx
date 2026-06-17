"use client";

import { useState, useEffect } from "react";
import { Users2, Search, ArrowRight, Loader2, BookOpen, GraduationCap } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface Classroom {
  id: string;
  name: string;
  level: string;
}

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  admission_number: string;
  student_id: string;
  class_id: string;
}

export default function MyClassesView() {
  const { error: toastError } = useToast();
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRoster() {
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
        toastError("Failed to fetch classroom schedules.");
      } finally {
        setLoading(false);
      }
    }
    fetchRoster();
  }, [toastError]);

  if (loading) {
    return (
      <div className="py-24 text-center">
        <Loader2 size={32} className="animate-spin text-violet-600 mx-auto" />
        <p className="text-slate-400 text-[13px] font-semibold mt-3">Fetching assigned classes...</p>
      </div>
    );
  }

  const selectedClass = classrooms.find(c => c.id === selectedClassId);
  const classStudents = students.filter(s => s.class_id === selectedClassId);
  
  const filteredStudents = classStudents.filter(s => {
    const q = search.toLowerCase();
    return s.first_name.toLowerCase().includes(q) || s.last_name.toLowerCase().includes(q) || s.admission_number.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-[20px] font-extrabold text-slate-900 leading-tight flex items-center gap-2">
          My Classes
        </h1>
        <p className="text-slate-500 text-[12px] font-semibold mt-0.5">
          Roster index of classrooms and students assigned to you.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Classes Menu */}
        <div className="bg-white rounded-2xl border border-[#e8e4f3] p-4 shadow-sm space-y-3">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1.5 pb-1">
            <Users2 size={11} className="text-violet-500" />
            Classroom Registry
          </p>

          <div className="space-y-1">
            {classrooms.length === 0 ? (
              <p className="text-[12px] text-slate-400 font-semibold p-2">No classes assigned.</p>
            ) : (
              classrooms.map((cls) => (
                <button
                  key={cls.id}
                  onClick={() => setSelectedClassId(cls.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-left text-[12.5px] font-semibold transition-all ${
                    selectedClassId === cls.id
                      ? "bg-violet-50 border border-violet-100 text-violet-700 font-bold"
                      : "hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <span className="truncate">{cls.name}</span>
                  <span className="text-[10px] font-bold text-slate-400 capitalize">{cls.level}</span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Student list */}
        <div className="lg:col-span-3 space-y-4">
          {selectedClass ? (
            <>
              {/* Toolbar */}
              <div className="flex gap-3 items-center">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder={`Search students in ${selectedClass.name}...`}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white"
                  />
                </div>
                <div className="bg-white rounded-xl border border-[#e8e4f3] h-10 px-4 flex items-center text-[12px] font-bold text-slate-600 gap-1.5 shrink-0 shadow-sm">
                  <GraduationCap size={14} className="text-violet-500" />
                  <span>{classStudents.length} Students Total</span>
                </div>
              </div>

              {/* Roster Table */}
              <div className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-[#faf9ff] border-b border-[#f0edf8]">
                        <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Student Details</th>
                        <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Admission Code</th>
                        <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Student ID</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f5f3fc]">
                      {filteredStudents.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="py-16 text-center text-slate-400 font-semibold text-[13px]">
                            No students found matching filters.
                          </td>
                        </tr>
                      ) : (
                        filteredStudents.map((stud) => {
                          const initials = stud.first_name[0] + (stud.last_name[0] || "");
                          return (
                            <tr key={stud.id} className="hover:bg-slate-50/50 transition-colors">
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
                                    <p className="text-slate-400 font-medium text-[11px]">{selectedClass.name}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-3.5 text-slate-700 font-semibold text-[13px] font-mono">{stud.admission_number || "—"}</td>
                              <td className="px-6 py-3.5 text-slate-500 font-semibold text-[13.5px] font-mono">{stud.student_id || "—"}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-2xl border border-[#e8e4f3] p-16 text-center text-slate-400 font-semibold text-[13px] shadow-sm">
              Please select a classroom from the sidebar registry list.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
