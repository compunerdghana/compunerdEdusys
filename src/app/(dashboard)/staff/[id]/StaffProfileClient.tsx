"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  ChevronLeft, User, Phone, Mail, MapPin, Briefcase, BookOpen,
  GraduationCap, CreditCard, FileText, Camera, Pencil, FileDown,
  Check, X, Building2, Calendar, Shield,
} from "lucide-react";
import jsPDF from "jspdf";

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

  const canEdit = isHeadmaster || isSelf;
  const roleStyle = ROLE_STYLE[profile.role] ?? { bg:"#f3f4f6", text:"#374151" };

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploadingPhoto(true);
    const prev = URL.createObjectURL(f);
    setPhotoPreview(prev);
    const ext = f.name.split(".").pop();
    const path = `staff/${profile.id}-photo.${ext}`;
    const { error } = await supabase.storage.from("school-assets").upload(path, f, { upsert: true });
    if (!error) {
      const { data } = supabase.storage.from("school-assets").getPublicUrl(path);
      await supabase.from("profiles").update({ photo_url: data.publicUrl }).eq("id", profile.id);
      setPhotoPreview(data.publicUrl);
    }
    setUploadingPhoto(false);
  }

  async function saveBio() {
    setSavingBio(true);
    await supabase.from("profiles").update({ bio: bioText }).eq("id", profile.id);
    setBio(bioText);
    setEditingBio(false);
    setSavingBio(false);
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{profile.full_name}</h1>
              <p className="text-sm text-gray-500 capitalize">{profile.role?.replace("_"," ")}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={exportPDF}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <FileDown className="w-4 h-4" /> Export PDF
            </button>
            {isHeadmaster && (
              <button
                onClick={() => router.push(`/staff/${profile.id}/edit`)}
                className="flex items-center gap-2 px-4 py-2 bg-[#262262] text-white rounded-lg text-sm font-medium hover:bg-[#1a1856] transition-colors"
              >
                <Pencil className="w-4 h-4" /> Edit
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6 grid grid-cols-[280px_1fr] gap-6">
        {/* Left panel */}
        <div className="space-y-4">
          {/* Photo + name card */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
            <div className="relative inline-block mb-4">
              <div className="w-24 h-24 rounded-full bg-gray-100 overflow-hidden mx-auto flex items-center justify-center">
                {photoPreview
                  ? <img src={photoPreview} alt={profile.full_name} className="w-full h-full object-cover" />
                  : <User className="w-10 h-10 text-gray-300" />
                }
              </div>
              {canEdit && (
                <button
                  onClick={() => photoRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="absolute bottom-0 right-0 bg-[#262262] text-white p-1.5 rounded-full hover:bg-[#1a1856] transition-colors"
                >
                  <Camera className="w-3 h-3" />
                </button>
              )}
              <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            </div>
            <h2 className="font-semibold text-gray-900">{profile.full_name}</h2>
            <p className="text-sm text-gray-500 mt-0.5">@{profile.username}</p>
            <div className="mt-3 flex justify-center">
              <span className="px-3 py-1 rounded-full text-xs font-medium capitalize"
                style={{ background: roleStyle.bg, color: roleStyle.text }}>
                {profile.role?.replace("_"," ")}
              </span>
            </div>
            {!profile.is_active && (
              <div className="mt-2 px-3 py-1 bg-red-50 rounded-full text-xs font-medium text-red-600">Inactive</div>
            )}
          </div>

          {/* Quick info */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
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

        {/* Right panel with tabs */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-200 overflow-x-auto">
            {SECTION_TABS.map(t => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    tab === t.id
                      ? "border-[#262262] text-[#262262]"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {t.label}
                </button>
              );
            })}
          </div>

          <div className="p-6">
            {/* Overview */}
            {tab === "overview" && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
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
                <div className="grid grid-cols-3 gap-4">
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
              <InfoCard title="Employment Details">
                <InfoRow label="Employment Type" value={details?.employment_type?.replace(/_/g," ")} />
                <InfoRow label="Staff Category" value={details?.staff_category} />
                <InfoRow label="Status" value={details?.employment_status} />
                <InfoRow label="Date Employed" value={details?.date_employed} />
                <InfoRow label="Date Confirmed" value={details?.date_confirmed} />
                <InfoRow label="Department" value={details?.department} />
                <InfoRow label="Designation" value={details?.designation} />
                <InfoRow label="Branch / Campus" value={details?.branch} />
              </InfoCard>
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

            {/* Documents */}
            {tab === "documents" && (
              <div className="space-y-3">
                {docs.length > 0 ? docs.map(doc => (
                  <a
                    key={doc.id}
                    href={doc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-indigo-50 rounded-lg flex items-center justify-center">
                        <FileText className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{doc.document_type}</p>
                        <p className="text-xs text-gray-500">{doc.file_name ?? "Document"} • {new Date(doc.uploaded_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <span className="text-xs text-indigo-600 font-medium">View</span>
                  </a>
                )) : (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                    <FileText className="w-10 h-10 mb-3" />
                    <p className="text-sm">No documents uploaded yet.</p>
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
