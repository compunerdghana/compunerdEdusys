"use client";

import { useState, useEffect } from "react";
import { User, Phone, Mail, MapPin, Building, GraduationCap, Briefcase, FileText, Download, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface TeacherProfile {
  full_name: string;
  username: string;
  email: string;
  phone: string;
  gender: string;
  date_of_birth: string;
  nationality: string;
  residential_address: string;
  digital_address: string;
  details?: {
    teacher_id: string;
    department: string;
    qualification: string;
    specialization: string;
    employment_date: string;
  };
}

export default function TeacherProfileView() {
  const { error: toastError } = useToast();
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch("/api/teacher/dashboard-stats");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed");
        
        // Fetch raw profile
        const profileRes = await fetch("/api/school/user-management/users");
        const profileData = await profileRes.json();
        const me = (profileData.users || []).find((u: any) => u.username === data.teacher.teacher_id || u.role === "teacher");
        
        setProfile({
          full_name: me?.full_name || "Educator Name",
          username: me?.username || "teacher.user",
          email: me?.email || "teacher@compunerdghana.com",
          phone: me?.phone || "+233 24 000 0000",
          gender: "Female",
          date_of_birth: "1992-05-20",
          nationality: "Ghanaian",
          residential_address: "Adenta Housing Estates, Accra",
          digital_address: "GD-045-1234",
          details: {
            teacher_id: data.teacher.teacher_id || "TCH-902",
            department: data.teacher.department || "Academic Department",
            qualification: data.teacher.qualification || "Bachelor of Science in Education",
            specialization: data.teacher.specialization || "Integrated Science / Mathematics",
            employment_date: "2023-01-15"
          }
        });
      } catch {
        toastError("Failed to fetch teacher profile details.");
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [toastError]);

  if (loading) {
    return (
      <div className="py-24 text-center">
        <Loader2 size={32} className="animate-spin text-violet-600 mx-auto" />
        <p className="text-slate-400 text-[13px] font-semibold mt-3">Fetching profile information...</p>
      </div>
    );
  }

  const documents = [
    { name: "Appointment Letter", size: "1.2 MB", type: "PDF Document" },
    { name: "First Degree Certificate", size: "2.4 MB", type: "PDF Document" },
    { name: "GES Teaching License", size: "850 KB", type: "PDF Document" },
    { name: "Employment Contract", size: "3.1 MB", type: "PDF Document" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-[20px] font-extrabold text-slate-900 leading-tight">My Profile</h1>
        <p className="text-slate-500 text-[12px] font-semibold mt-0.5">Manage personal information, contact records, employment details and credentials.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Card: Summary */}
        <div className="bg-white rounded-2xl border border-[#e8e4f3] p-6 shadow-sm flex flex-col items-center justify-between text-center space-y-4">
          <div className="space-y-3 flex flex-col items-center">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white font-extrabold flex items-center justify-center text-4xl shadow-inner">
              {profile?.full_name.split(" ").map(n => n[0]).join("").slice(0,2)}
            </div>
            <div>
              <h3 className="text-[16px] font-extrabold text-slate-900 leading-tight">{profile?.full_name}</h3>
              <p className="text-slate-400 font-semibold text-[11px] font-mono mt-0.5">{profile?.details?.teacher_id}</p>
            </div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-violet-600 bg-violet-50 border border-violet-100/50 px-2.5 py-0.5 rounded-full inline-block">
              {profile?.details?.department}
            </span>
          </div>

          <div className="w-full border-t border-[#f5f3fc] pt-4 space-y-2">
            <div className="flex items-center justify-between text-[12px] text-slate-600 font-bold">
              <span>Employment Date</span>
              <span className="text-slate-900 font-extrabold">{profile?.details?.employment_date}</span>
            </div>
            <div className="flex items-center justify-between text-[12px] text-slate-600 font-bold">
              <span>Teaching License</span>
              <span className="text-emerald-600 font-extrabold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100/50">Active</span>
            </div>
          </div>
        </div>

        {/* Right Cards: Profile Sections */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section: Personal & Contact */}
          <div className="bg-white rounded-2xl border border-[#e8e4f3] p-5 shadow-sm space-y-4">
            <h4 className="font-extrabold text-slate-950 text-[14px] border-b border-[#f5f3fc] pb-3 flex items-center gap-2">
              <User size={15} className="text-violet-600" />
              Personal & Contact Information
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 leading-none">Gender</p>
                <p className="text-[13px] font-bold text-slate-800 mt-1 capitalize">{profile?.gender}</p>
              </div>
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 leading-none">Date of Birth</p>
                <p className="text-[13px] font-bold text-slate-800 mt-1">{profile?.date_of_birth}</p>
              </div>
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 leading-none">Nationality</p>
                <p className="text-[13px] font-bold text-slate-800 mt-1">{profile?.nationality}</p>
              </div>
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 leading-none">Phone Contact</p>
                <p className="text-[13px] font-bold text-slate-800 mt-1 flex items-center gap-1.5">
                  <Phone size={12} className="text-slate-400" />
                  {profile?.phone}
                </p>
              </div>
              <div className="md:col-span-2">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 leading-none">Email Address</p>
                <p className="text-[13px] font-bold text-slate-800 mt-1 flex items-center gap-1.5">
                  <Mail size={12} className="text-slate-400" />
                  {profile?.email}
                </p>
              </div>
              <div className="md:col-span-2">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 leading-none">Residential Address</p>
                <p className="text-[13px] font-bold text-slate-800 mt-1 flex items-center gap-1.5">
                  <MapPin size={12} className="text-slate-400" />
                  {profile?.residential_address} (GPS: {profile?.digital_address})
                </p>
              </div>
            </div>
          </div>

          {/* Section: Professional details */}
          <div className="bg-white rounded-2xl border border-[#e8e4f3] p-5 shadow-sm space-y-4">
            <h4 className="font-extrabold text-slate-950 text-[14px] border-b border-[#f5f3fc] pb-3 flex items-center gap-2">
              <Briefcase size={15} className="text-violet-600" />
              Employment & Professional Qualifications
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 leading-none">Highest Qualification</p>
                <p className="text-[13px] font-bold text-slate-800 mt-1">{profile?.details?.qualification}</p>
              </div>
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 leading-none">Specialization</p>
                <p className="text-[13px] font-bold text-slate-800 mt-1">{profile?.details?.specialization}</p>
              </div>
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 leading-none">Staff Position</p>
                <p className="text-[13px] font-bold text-slate-800 mt-1">Class Teacher</p>
              </div>
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 leading-none">Designation Code</p>
                <p className="text-[13px] font-bold text-slate-800 mt-1 font-mono">{profile?.details?.teacher_id}</p>
              </div>
            </div>
          </div>

          {/* Section: Documents */}
          <div className="bg-white rounded-2xl border border-[#e8e4f3] p-5 shadow-sm space-y-4">
            <h4 className="font-extrabold text-slate-950 text-[14px] border-b border-[#f5f3fc] pb-3 flex items-center gap-2">
              <FileText size={15} className="text-violet-600" />
              Credential Documents
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {documents.map(doc => (
                <div key={doc.name} className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-bold text-slate-800 truncate">{doc.name}</p>
                    <p className="text-[11px] font-semibold text-slate-400 mt-0.5">{doc.type} · {doc.size}</p>
                  </div>
                  <button className="p-2 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-colors shrink-0">
                    <Download size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
