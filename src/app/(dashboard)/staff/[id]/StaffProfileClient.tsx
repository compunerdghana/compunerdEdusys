"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  ChevronLeft, User, Phone, Mail, MapPin, Briefcase, BookOpen,
  GraduationCap, CreditCard, FileText, Camera, Pencil, FileDown,
  Check, X, Building2, Calendar, Shield, Upload, Trash2,
  Clock, Dumbbell,
} from "lucide-react";
import jsPDF from "jspdf";
import { uploadAsset } from "@/lib/uploadAsset";

const ROLE_STYLE: Record<string, { bg: string; text: string }> = {
  teacher:    { bg:"#ede9fe", text:"#5b21b6" },
  headmaster: { bg:"#fce7f3", text:"#be185d" },
  accountant: { bg:"#d1fae5", text:"#065f46" },
  secretary:  { bg:"#fef3c7", text:"#92400e" },
  admin:      { bg:"#dbeafe", text:"#1e40af" },
};

const SECTION_TABS = [
  { id:"overview",  label:"Overview",         icon:User },
  { id:"contact",   label:"Contact",          icon:Phone },
  { id:"employment",label:"Employment",       icon:Briefcase },
  { id:"qualifications",label:"Qualifications",icon:GraduationCap },
  { id:"payroll",   label:"Payroll",          icon:CreditCard },
  { id:"academic",  label:"Academic",         icon:BookOpen },
  { id:"documents", label:"Documents",        icon:FileText },
  { id:"timeline",  label:"Timeline",         icon:Clock },
  { id:"training",  label:"Training",         icon:Dumbbell },
];

const STAFF_DOC_TYPES = [
  "Appointment Letter","Academic Certificate","Professional Certificate","NTC License",
  "Ghana Card","Passport","SSNIT Card","Birth Certificate","Contract","Other",
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Details = Record<string, any> | null;
type DocRow  = { id:string; document_type:string; file_name:string|null; file_url:string; uploaded_at:string };
type ClassRow   = { id:string; name:string };
type SubjectRow = { id:string; name:string };

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  profile: Record<string, any>;
  details: Details;
  docs: DocRow[];
  assignedClasses: ClassRow[];
  assignedSubjects: SubjectRow[];
  isHeadmaster: boolean;
  isSelf: boolean;
  viewerId: string;
}

export function StaffProfileClient({
  profile, details, docs, assignedClasses, assignedSubjects, isHeadmaster, isSelf,
}: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [tab, setTab] = useState("overview");
  const [bio, setBio]           = useState<string>(profile.bio ?? "");
  const [editingBio, setEditingBio] = useState(false);
  const [bioText, setBioText]   = useState<string>(profile.bio ?? "");
  const [savingBio, setSavingBio] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string>(profile.photo_url ?? "");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);

  // Document upload state
  const [staffDocs, setStaffDocs] = useState(docs);
  const [staffDocType, setStaffDocType] = useState(STAFF_DOC_TYPES[0]);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const docRef = useRef<HTMLInputElement>(null);

  // Status management
  const [staffStatus, setStaffStatus] = useState<string>(details?.employment_status ?? "active");
  const [statusNote, setStatusNote] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);
  const [statusChanged, setStatusChanged] = useState(false);

  const canEdit = isHeadmaster || isSelf;
  const roleStyle = ROLE_STYLE[profile.role] ?? { bg:"#f3f4f6", text:"#374151" };

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploadingPhoto(true);
    setPhotoPreview(URL.createObjectURL(f));
    try {
      const ext = f.name.split(".").pop();
      const path = `staff/${profile.id}-photo-${Date.now()}.${ext}`;
      const publicUrl = await uploadAsset(f, path);
      await supabase.from("profiles").update({ photo_url: publicUrl }).eq("id", profile.id);
      setPhotoPreview(publicUrl);
    } catch { /* keep local preview */ }
    setUploadingPhoto(false);
  }

  async function uploadStaffDoc(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const allowed = ["pdf","doc","docx","jpg","jpeg","xls","xlsx"];
    const validFiles = files.filter(f => allowed.includes(f.name.split(".").pop()?.toLowerCase() ?? ""));
    if (!validFiles.length) { alert("Only PDF, Word, JPG, JPEG, Excel files are allowed."); return; }
    setUploadingDoc(true);
    const newDocs: DocRow[] = [];
    for (const f of validFiles) {
      try {
        const ext = f.name.split(".").pop();
        const path = `staff/${profile.id}/docs/${staffDocType.replace(/\s+/g,"_").toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const publicUrl = await uploadAsset(f, path);
        const res = await fetch("/api/admin/staff-documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            profile_id: profile.id,
            school_id: profile.school_id,
            document_type: staffDocType,
            file_name: f.name,
            file_url: publicUrl,
          }),
        });
        const json = await res.json();
        if (json.data) newDocs.push(json.data as DocRow);
      } catch { /* skip failed file */ }
    }
    if (newDocs.length) setStaffDocs(d => [...newDocs, ...d]);
    setUploadingDoc(false);
    e.target.value = "";
  }

  async function deleteStaffDoc(id: string) {
    await fetch(`/api/admin/staff-documents?id=${id}`, { method: "DELETE" });
    setStaffDocs(d => d.filter(x => x.id !== id));
  }

  async function saveBio() {
    setSavingBio(true);
    await supabase.from("profiles").update({ bio: bioText }).eq("id", profile.id);
    setBio(bioText);
    setEditingBio(false);
    setSavingBio(false);
  }

  async function saveStatus() {
    setSavingStatus(true);
    await fetch("/api/admin/staff-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile_id: profile.id, status: staffStatus, note: statusNote }),
    });
    setSavingStatus(false);
    setStatusChanged(false);
    setStatusNote("");
  }

  function exportPDF() {
    const doc = new jsPDF();
    doc.setFillColor(38, 34, 98);
    doc.rect(0, 0, 210, 32, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18); doc.setFont("helvetica", "bold");
    doc.text("Staff Profile", 14, 14);
    doc.setFontSize(10); doc.setFont("helvetica", "normal");
    doc.text("CompunerdEduSys", 14, 22);
    doc.text(new Date().toLocaleDateString(), 140, 22);

    doc.setTextColor(0, 0, 0);
    let y = 44;
    const add = (label: string, value: string | null | undefined) => {
      if (!value) return;
      doc.setFontSize(9); doc.setFont("helvetica", "bold");
      doc.text(label + ":", 14, y);
      doc.setFont("helvetica", "normal");
      doc.text(String(value), 70, y);
      y += 7;
    };

    doc.setFontSize(14); doc.setFont("helvetica", "bold");
    doc.text(profile.full_name, 14, y); y += 10;
    doc.setFontSize(10); doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(profile.role?.toUpperCase(), 14, y); y += 10;
    doc.setTextColor(0, 0, 0);

    add("Staff ID", details?.staff_id_manual ?? profile.username);
    add("Employee No.", details?.employee_number);
    add("Gender", details?.gender);
    add("Date of Birth", details?.date_of_birth);
    add("Mobile", details?.mobile_number ?? profile.phone);
    add("Email", details?.email);
    add("Address", details?.residential_address);
    add("Employment Type", details?.employment_type?.replace("_"," "));
    add("Date Employed", details?.date_employed);
    add("Department", details?.department);
    add("Qualification", details?.highest_qualification);
    add("Specialization", details?.specialization);
    if (bio) {
      y += 4;
      doc.setFont("helvetica", "bold"); doc.text("About:", 14, y); y += 6;
      doc.setFont("helvetica", "normal");
      const lines = doc.splitTextToSize(bio, 180);
      doc.text(lines, 14, y);
    }

    doc.save(`${profile.username ?? profile.full_name}.pdf`);
  }

  function getInitials(name: string) {
    return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Hero Header ─────────────────────────────────────────── */}
      <div className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, #3a3596 0%, #5e3b9e 50%, #9e3da0 100%)" }}>
        {/* Decorative blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div style={{ position:"absolute", top:-50, right:-30, width:200, height:200, borderRadius:"50%", background:"rgba(255,255,255,0.05)" }} />
          <div style={{ position:"absolute", bottom:-20, left:80, width:140, height:140, borderRadius:"50%", background:"rgba(255,255,255,0.04)" }} />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-4 pb-0">
          <button onClick={() => router.back()}
            className="flex items-center gap-1.5 text-[13px] text-white/60 hover:text-white mb-4 transition-colors">
            <ChevronLeft className="w-4 h-4" /> Back to Staff
          </button>

          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 pb-5">
            {/* Photo */}
            <div className="relative shrink-0">
              <div className="w-24 h-24 rounded-2xl overflow-hidden flex items-center justify-center text-white text-3xl font-black shadow-xl ring-4 ring-white/20"
                style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}>
                {photoPreview
                  ? <img src={photoPreview} alt={profile.full_name} className="w-full h-full object-cover" />
                  : <span>{getInitials(profile.full_name)}</span>
                }
              </div>
              {canEdit && (
                <button onClick={() => photoRef.current?.click()} disabled={uploadingPhoto}
                  className="absolute -bottom-1.5 -right-1.5 bg-white text-[#262262] p-1.5 rounded-full shadow-lg hover:scale-110 transition-transform">
                  {uploadingPhoto
                    ? <span className="w-3.5 h-3.5 border-2 border-[#262262] border-t-transparent rounded-full animate-spin block" />
                    : <Camera className="w-3.5 h-3.5" />}
                </button>
              )}
              <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-[26px] font-black text-white leading-tight">{profile.full_name}</h1>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold capitalize"
                  style={{ background: roleStyle.bg, color: roleStyle.text }}>
                  {profile.role?.replace("_"," ")}
                </span>
                {!profile.is_active && (
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-500/20 text-red-200">Inactive</span>
                )}
              </div>
              <p className="text-[13px] text-white/60 mt-1">@{profile.username}</p>
              <div className="flex flex-wrap gap-3 mt-3">
                {(details?.mobile_number ?? profile.phone) && (
                  <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-xl px-3 py-1.5">
                    <Phone className="w-3.5 h-3.5 text-white/60" />
                    <span className="text-[12px] text-white/80">{details?.mobile_number ?? profile.phone}</span>
                  </div>
                )}
                {details?.department && (
                  <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-xl px-3 py-1.5">
                    <Building2 className="w-3.5 h-3.5 text-white/60" />
                    <span className="text-[12px] text-white/80">{details.department}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-xl px-3 py-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-white/60" />
                  <span className="text-[11px] text-white/60">Classes</span>
                  <span className="text-[13px] font-extrabold text-white ml-0.5">{assignedClasses.length}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-xl px-3 py-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-white/60" />
                  <span className="text-[11px] text-white/60">Subjects</span>
                  <span className="text-[13px] font-extrabold text-white ml-0.5">{assignedSubjects.length}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 shrink-0 pb-0.5">
              <button onClick={exportPDF}
                className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[12px] font-semibold transition-colors backdrop-blur-sm">
                <FileDown className="w-3.5 h-3.5" /> Export PDF
              </button>
              {isHeadmaster && (
                <button onClick={() => router.push(`/staff/${profile.id}/edit`)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white text-[#262262] rounded-xl text-[12px] font-bold hover:bg-white/90 transition-colors shadow-lg">
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 overflow-x-auto scrollbar-hide">
          <div className="flex gap-0 min-w-max">
            {SECTION_TABS.map(t => {
              const Icon = t.icon;
              return (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`flex items-center gap-1.5 px-4 py-3 text-[12px] font-semibold border-b-2 whitespace-nowrap transition-all ${
                    tab === t.id ? "border-white text-white" : "border-transparent text-white/50 hover:text-white/80"
                  }`}>
                  <Icon className="w-3.5 h-3.5" />{t.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-5">
        {/* Left panel */}
        <div className="space-y-4">
          {/* Quick info */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Contact & Info</p>
            {(details?.mobile_number ?? profile.phone) && (
              <div className="flex items-center gap-3 text-sm text-gray-700">
                <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                {details?.mobile_number ?? profile.phone}
              </div>
            )}
            {details?.email && (
              <div className="flex items-center gap-3 text-sm text-gray-700">
                <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                {details.email}
              </div>
            )}
            {details?.residential_address && (
              <div className="flex items-center gap-3 text-sm text-gray-700">
                <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                {details.residential_address}
              </div>
            )}
            {details?.department && (
              <div className="flex items-center gap-3 text-sm text-gray-700">
                <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                {details.department}
              </div>
            )}
            {details?.date_employed && (
              <div className="flex items-center gap-3 text-sm text-gray-700">
                <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                Since {new Date(details.date_employed).toLocaleDateString()}
              </div>
            )}
          </div>

          {/* About / Bio */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-700">About</h3>
              {canEdit && !editingBio && (
                <button onClick={() => { setEditingBio(true); setBioText(bio); }}
                  className="p-1 hover:bg-gray-100 rounded transition-colors">
                  <Pencil className="w-3.5 h-3.5 text-gray-400" />
                </button>
              )}
            </div>
            {editingBio ? (
              <div className="space-y-2">
                <textarea
                  value={bioText}
                  onChange={e => setBioText(e.target.value)}
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#262262]/30 focus:border-[#262262] resize-none"
                  placeholder="Write something about this staff member…"
                />
                <div className="flex gap-2">
                  <button onClick={saveBio} disabled={savingBio}
                    className="flex items-center gap-1 px-3 py-1.5 bg-[#262262] text-white rounded text-xs font-medium hover:bg-[#1a1856]">
                    <Check className="w-3 h-3" /> {savingBio ? "Saving…" : "Save"}
                  </button>
                  <button onClick={() => setEditingBio(false)}
                    className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded text-xs font-medium text-gray-700 hover:bg-gray-50">
                    <X className="w-3 h-3" /> Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-600 leading-relaxed">
                {bio || <span className="text-gray-400 italic">No bio yet.</span>}
              </p>
            )}
          </div>
        </div>

        {/* Right panel — tab content */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="p-5 sm:p-6">
            {/* Overview */}
            {tab === "overview" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InfoCard title="Employment">
                    <InfoRow label="Employment Type" value={details?.employment_type?.replace(/_/g," ")} />
                    <InfoRow label="Staff Category" value={details?.staff_category?.replace("_"," ")} />
                    <InfoRow label="Status" value={details?.employment_status} />
                    <InfoRow label="Date Employed" value={details?.date_employed ? new Date(details.date_employed).toLocaleDateString() : null} />
                  </InfoCard>
                  <InfoCard title="Identification">
                    <InfoRow label="Staff ID" value={details?.staff_id_manual ?? profile.username} />
                    <InfoRow label="Employee No." value={details?.employee_number} />
                    <InfoRow label="ID Type" value={details?.national_id_type} />
                    <InfoRow label="ID Number" value={details?.national_id_number} />
                  </InfoCard>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <StatBox label="Classes Assigned" value={assignedClasses.length} />
                  <StatBox label="Subjects Assigned" value={assignedSubjects.length} />
                  <StatBox label="Documents" value={docs.length} />
                </div>
                {(details?.form_master || details?.house_master) && (
                  <div className="flex gap-3">
                    {details.form_master && (
                      <span className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-sm font-medium">
                        <Shield className="w-4 h-4" /> Form Master
                      </span>
                    )}
                    {details.house_master && (
                      <span className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-full text-sm font-medium">
                        <Shield className="w-4 h-4" /> House Master
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Contact */}
            {tab === "contact" && (
              <div className="space-y-4">
                <InfoCard title="Contact Details">
                  <InfoRow label="Mobile" value={details?.mobile_number ?? profile.phone} />
                  <InfoRow label="Alternative" value={details?.alternative_number} />
                  <InfoRow label="Email" value={details?.email} />
                  <InfoRow label="Address" value={details?.residential_address} />
                  <InfoRow label="Digital Address" value={details?.digital_address} />
                  <InfoRow label="Region" value={details?.region} />
                  <InfoRow label="District" value={details?.district} />
                </InfoCard>
                <InfoCard title="Emergency Contact">
                  <InfoRow label="Name" value={details?.emergency_contact_name} />
                  <InfoRow label="Relationship" value={details?.emergency_contact_relationship} />
                  <InfoRow label="Phone" value={details?.emergency_contact_phone} />
                </InfoCard>
              </div>
            )}

            {/* Employment */}
            {tab === "employment" && (
              <div className="space-y-4">
                <InfoCard title="Employment Details">
                  <InfoRow label="Employment Type" value={details?.employment_type?.replace(/_/g," ")} />
                  <InfoRow label="Staff Category" value={details?.staff_category} />
                  <InfoRow label="Date Employed" value={details?.date_employed} />
                  <InfoRow label="Date Confirmed" value={details?.date_confirmed} />
                  <InfoRow label="Department" value={details?.department} />
                  <InfoRow label="Designation" value={details?.designation} />
                  <InfoRow label="Branch / Campus" value={details?.branch} />
                </InfoCard>

                {/* Status Management — headmaster only */}
                {isHeadmaster && (
                  <div className="border border-gray-100 rounded-xl p-4 space-y-3">
                    <h3 className="text-sm font-semibold text-gray-700 pb-2 border-b border-gray-100">Employment Status</h3>
                    <div className="flex flex-wrap gap-2">
                      {["active","leave","suspension","study_leave","secondment","retired","dismissed","resigned"].map(s => (
                        <button key={s} onClick={() => { setStaffStatus(s); setStatusChanged(true); }}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-colors border ${
                            staffStatus === s
                              ? s === "active" ? "bg-green-100 text-green-700 border-green-300"
                                : s === "suspension" || s === "dismissed" ? "bg-red-100 text-red-700 border-red-300"
                                : "bg-amber-100 text-amber-700 border-amber-300"
                              : "bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300"
                          }`}>
                          {s.replace(/_/g, " ")}
                        </button>
                      ))}
                    </div>
                    {statusChanged && (
                      <>
                        <textarea
                          value={statusNote}
                          onChange={e => setStatusNote(e.target.value)}
                          placeholder="Add a note (reason, duration, reference…)"
                          rows={3}
                          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none focus:border-[#262262] resize-none"
                        />
                        <button onClick={saveStatus} disabled={savingStatus}
                          className="flex items-center gap-2 px-4 py-2 bg-[#262262] text-white rounded-xl text-sm font-semibold hover:bg-[#1a1856] disabled:opacity-50 transition-colors">
                          {savingStatus ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
                          Save Status
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Qualifications */}
            {tab === "qualifications" && (
              <InfoCard title="Professional Qualifications">
                <InfoRow label="Highest Qualification" value={details?.highest_qualification} />
                <InfoRow label="Institution" value={details?.institution_attended} />
                <InfoRow label="Year Completed" value={details?.year_completed} />
                <InfoRow label="Specialization" value={details?.specialization} />
                <InfoRow label="Teaching License" value={details?.teaching_license_number} />
                <InfoRow label="NTC Registration" value={details?.ntc_registration_number} />
                <InfoRow label="Certifications" value={details?.professional_certifications} />
              </InfoCard>
            )}

            {/* Payroll — headmaster only */}
            {tab === "payroll" && (
              isHeadmaster ? (
                <div className="space-y-4">
                  <InfoCard title="Salary">
                    <InfoRow label="Basic Salary" value={details?.basic_salary ? `GHS ${Number(details.basic_salary).toFixed(2)}` : null} />
                    <InfoRow label="Allowances" value={details?.allowances ? `GHS ${Number(details.allowances).toFixed(2)}` : null} />
                    <InfoRow label="SSNIT Number" value={details?.ssnit_number} />
                    <InfoRow label="GRA TIN" value={details?.gra_tin_number} />
                  </InfoCard>
                  <InfoCard title="Bank Details">
                    <InfoRow label="Bank Name" value={details?.bank_name} />
                    <InfoRow label="Bank Branch" value={details?.bank_branch} />
                    <InfoRow label="Account Number" value={details?.account_number} />
                  </InfoCard>
                  <InfoCard title="Mobile Money">
                    <InfoRow label="Network" value={details?.momo_network} />
                    <InfoRow label="MoMo Number" value={details?.momo_number} />
                  </InfoCard>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <Shield className="w-10 h-10 mb-3" />
                  <p className="text-sm">Payroll information is restricted.</p>
                </div>
              )
            )}

            {/* Academic */}
            {tab === "academic" && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Assigned Classes</h3>
                  {assignedClasses.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {assignedClasses.map(c => (
                        <span key={c.id} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-sm font-medium">{c.name}</span>
                      ))}
                    </div>
                  ) : <p className="text-sm text-gray-400">No classes assigned.</p>}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Assigned Subjects</h3>
                  {assignedSubjects.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {assignedSubjects.map(s => (
                        <span key={s.id} className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-full text-sm font-medium">{s.name}</span>
                      ))}
                    </div>
                  ) : <p className="text-sm text-gray-400">No subjects assigned.</p>}
                </div>
              </div>
            )}

            {/* Timeline */}
            {tab === "timeline" && (
              <StaffTimeline profileId={profile.id} schoolId={profile.school_id} />
            )}

            {/* Training */}
            {tab === "training" && (
              <StaffTrainingTab profileId={profile.id} schoolId={profile.school_id} />
            )}

            {/* Documents */}
            {tab === "documents" && (
              <div className="space-y-4">
                {/* Upload controls */}
                {canEdit && (
                  <div className="flex items-end gap-3 flex-wrap">
                    <div className="flex-1 min-w-[160px]">
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Document Type</label>
                      <select value={staffDocType} onChange={e => setStaffDocType(e.target.value)}
                        className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-800 outline-none focus:border-[#262262]">
                        {STAFF_DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <button onClick={() => docRef.current?.click()} disabled={uploadingDoc}
                      className="flex items-center gap-2 px-4 py-2.5 bg-[#262262] text-white rounded-xl text-sm font-semibold hover:bg-[#1a1856] disabled:opacity-50 transition-colors">
                      <Upload className="w-4 h-4" />
                      {uploadingDoc ? "Uploading…" : "Upload Files"}
                    </button>
                    <input ref={docRef} type="file" multiple className="hidden" accept=".pdf,.doc,.docx,.jpg,.jpeg,.xls,.xlsx" onChange={uploadStaffDoc} />
                  </div>
                )}
                {canEdit && (
                  <p className="text-[11px] text-gray-400">Select multiple files at once — each will be saved under the chosen document type.</p>
                )}
                {staffDocs.length > 0 ? (
                  <div className="space-y-2">
                    {staffDocs.map(doc => (
                      <div key={doc.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors group">
                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-9 h-9 bg-indigo-50 rounded-lg flex items-center justify-center shrink-0">
                            <FileText className="w-4 h-4 text-indigo-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">{doc.document_type}</p>
                            <p className="text-xs text-gray-400 truncate">{doc.file_name ?? "Document"} · {new Date(doc.uploaded_at).toLocaleDateString()}</p>
                          </div>
                        </a>
                        <div className="flex items-center gap-3 shrink-0 ml-3">
                          <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-indigo-600 font-semibold hover:text-indigo-800">View</a>
                          {canEdit && (
                            <button onClick={() => deleteStaffDoc(doc.id)}
                              className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                    <FileText className="w-10 h-10 mb-3 opacity-30" />
                    <p className="text-sm">No documents uploaded yet.</p>
                    {canEdit && <p className="text-xs mt-1">Use the upload button above to add files.</p>}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-gray-100 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-100">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2 text-sm">
      <span className="text-gray-500 min-w-[130px] flex-shrink-0">{label}</span>
      <span className="text-gray-800 font-medium capitalize">{value}</span>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-gray-50 rounded-xl p-4 text-center">
      <p className="text-2xl font-bold text-[#262262]">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}

const EVENT_STYLE: Record<string, { bg: string; color: string }> = {
  employed:    { bg: "#F0FDF4", color: "#16A34A" },
  promoted:    { bg: "#EEF2FF", color: "#4338CA" },
  transferred: { bg: "#FDF4FF", color: "#92278F" },
  trained:     { bg: "#F5F3FF", color: "#7C3AED" },
  leave:       { bg: "#FFFBEB", color: "#D97706" },
  exit:        { bg: "#FEF2F2", color: "#DC2626" },
  note:        { bg: "#F9FAFB", color: "#6B7280" },
};

function StaffTimeline({ profileId, schoolId }: { profileId: string; schoolId: string }) {
  const [events, setEvents] = useState<{ id: string; event_type: string; title: string; description?: string; event_date: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/staff/timeline?profileId=${profileId}&schoolId=${schoolId}`)
      .then((r) => r.json())
      .then((j) => { setEvents(j.data ?? []); setLoading(false); });
  }, [profileId, schoolId]);

  if (loading) return <div className="py-12 text-center text-sm text-gray-400">Loading timeline…</div>;
  if (events.length === 0) return (
    <div className="py-16 text-center text-gray-400">
      <Clock className="w-10 h-10 mx-auto mb-3 opacity-20" />
      <p className="text-sm">No timeline events yet. Events are added automatically on promotions, transfers, and exits.</p>
    </div>
  );

  return (
    <div className="relative pl-6 space-y-0">
      <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-gray-100" />
      {events.map((ev) => {
        const s = EVENT_STYLE[ev.event_type] ?? EVENT_STYLE.note;
        return (
          <div key={ev.id} className="relative pb-6">
            <div className="absolute -left-4 top-1 w-3 h-3 rounded-full border-2 border-white" style={{ background: s.color }} />
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[14px] font-bold text-gray-800">{ev.title}</p>
                  {ev.description && <p className="text-[12px] text-gray-500 mt-0.5">{ev.description}</p>}
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold shrink-0" style={{ background: s.bg, color: s.color }}>
                  {ev.event_type}
                </span>
              </div>
              <p className="text-[11px] text-gray-400 mt-2">{new Date(ev.event_date).toLocaleDateString("en-GH", { year: "numeric", month: "long", day: "numeric" })}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StaffTrainingTab({ profileId, schoolId }: { profileId: string; schoolId: string }) {
  const [records, setRecords] = useState<{ id: string; training_type: string; title: string; organizer?: string; start_date: string; end_date?: string; certificate_url?: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/staff/training?profileId=${profileId}&schoolId=${schoolId}`)
      .then((r) => r.json())
      .then((j) => { setRecords(j.data ?? []); setLoading(false); });
  }, [profileId, schoolId]);

  if (loading) return <div className="py-12 text-center text-sm text-gray-400">Loading training records…</div>;
  if (records.length === 0) return (
    <div className="py-16 text-center text-gray-400">
      <Dumbbell className="w-10 h-10 mx-auto mb-3 opacity-20" />
      <p className="text-sm">No training records. Add from{" "}
        <a href="/staff/training" className="text-[#262262] underline">Staff → Training</a>.
      </p>
    </div>
  );

  return (
    <div className="space-y-3">
      {records.map((r) => (
        <div key={r.id} className="flex items-start gap-4 p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
            <Dumbbell className="w-5 h-5 text-purple-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-bold text-gray-800">{r.title}</p>
            <p className="text-[12px] text-gray-500 capitalize">{r.training_type}{r.organizer ? ` · ${r.organizer}` : ""}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{new Date(r.start_date).toLocaleDateString("en-GH")}{r.end_date ? ` – ${new Date(r.end_date).toLocaleDateString("en-GH")}` : ""}</p>
          </div>
          {r.certificate_url && (
            <a href={r.certificate_url} target="_blank" rel="noreferrer"
              className="text-[12px] font-semibold text-[#262262] hover:underline shrink-0">
              Certificate
            </a>
          )}
        </div>
      ))}
    </div>
  );
}
