"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  ChevronLeft, ChevronRight, Upload, Check, AlertCircle, User,
  Phone, Briefcase, GraduationCap, CreditCard, BookOpen, FileText, Camera,
} from "lucide-react";

const GHANA_REGIONS = [
  "Ahafo","Ashanti","Bono","Bono East","Central","Eastern","Greater Accra",
  "North East","Northern","Oti","Savannah","Upper East","Upper West","Volta","Western","Western North",
];

const QUALIFICATIONS = [
  "BECE","WASSCE","Diploma","HND","Bachelor's Degree","Postgraduate Diploma",
  "Master's Degree","PhD","Professional Certificate","Other",
];
const ID_TYPES = ["Ghana Card (NIA)","Voter ID","Passport","NHIS Card","Driver's License","Staff ID"];
const MARITAL_STATUSES = ["Single","Married","Divorced","Widowed","Separated"];
const RELIGIONS = ["Christianity","Islam","Traditional","Other","Prefer not to say"];
const EMPLOYMENT_TYPES = [
  { v:"full_time",l:"Full Time" },
  { v:"part_time",l:"Part Time" },
  { v:"national_service",l:"National Service" },
  { v:"volunteer",l:"Volunteer" },
  { v:"contract",l:"Contract" },
];
const STAFF_CATEGORIES = [
  { v:"teaching",l:"Teaching Staff" },
  { v:"non_teaching",l:"Non-Teaching Staff" },
];
const EMPLOYMENT_STATUSES = [
  { v:"active",l:"Active" },
  { v:"on_leave",l:"On Leave" },
  { v:"suspended",l:"Suspended" },
  { v:"terminated",l:"Terminated" },
];
const ROLES = [
  { v:"headmaster",l:"Headmaster / Principal" },
  { v:"teacher",l:"Teacher" },
  { v:"accountant",l:"Accountant" },
  { v:"secretary",l:"Secretary" },
  { v:"librarian",l:"Librarian" },
  { v:"counselor",l:"Counselor" },
  { v:"nurse",l:"School Nurse" },
  { v:"janitor",l:"Janitor / Cleaner" },
  { v:"security",l:"Security" },
  { v:"driver",l:"Driver" },
  { v:"cook",l:"Cook / Caterer" },
  { v:"admin",l:"Administrative Staff" },
];
const DOC_TYPES = [
  "CV / Resume","Appointment Letter","Contract","National ID Copy",
  "Teaching License","Academic Certificates","Passport Photo","Other",
];
const BANKS = [
  "GCB Bank","Absa Bank","Ecobank","Fidelity Bank","First National Bank","GTBank",
  "Prudential Bank","Republic Bank","Stanbic Bank","Standard Chartered","UBA","Zenith Bank","Other",
];
const MOMO_NETWORKS = ["MTN MoMo","Vodafone Cash","AirtelTigo Money"];

const SECTIONS = [
  { id:"personal",    label:"Personal Info",          icon:User },
  { id:"contact",     label:"Contact Info",           icon:Phone },
  { id:"employment",  label:"Employment Info",        icon:Briefcase },
  { id:"qualifications",label:"Qualifications",      icon:GraduationCap },
  { id:"payroll",     label:"Payroll Info",           icon:CreditCard },
  { id:"academic",    label:"Academic Assignment",   icon:BookOpen },
  { id:"documents",   label:"Documents",             icon:FileText },
];

type Props = {
  schoolId: string;
  classes: { id: string; name: string }[];
  subjects: { id: string; name: string }[];
  allStaff: { id: string; full_name: string; role: string }[];
};

type DocFile = { type: string; file: File; preview?: string };

export function AddStaffForm({ schoolId, classes, subjects, allStaff }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [section, setSection] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const photoRef = useRef<HTMLInputElement>(null);

  // ── form state ──────────────────────────────────────────────────────
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");

  // Personal
  const [staffIdManual, setStaffIdManual] = useState("");
  const [employeeNumber, setEmployeeNumber] = useState("");
  const [firstName, setFirstName]   = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName]     = useState("");
  const [gender, setGender]         = useState("");
  const [dob, setDob]               = useState("");
  const [nationality, setNationality] = useState("Ghanaian");
  const [idType, setIdType]         = useState("");
  const [idNumber, setIdNumber]     = useState("");
  const [maritalStatus, setMaritalStatus] = useState("");
  const [religion, setReligion]     = useState("");
  const [role, setRole]             = useState("teacher");

  // Contact
  const [mobile, setMobile]         = useState("");
  const [altNumber, setAltNumber]   = useState("");
  const [email, setEmail]           = useState("");
  const [address, setAddress]       = useState("");
  const [digitalAddress, setDigitalAddress] = useState("");
  const [region, setRegion]         = useState("");
  const [district, setDistrict]     = useState("");
  const [ecName, setEcName]         = useState("");
  const [ecRelationship, setEcRelationship] = useState("");
  const [ecPhone, setEcPhone]       = useState("");

  // Employment
  const [employmentType, setEmploymentType] = useState("full_time");
  const [dateEmployed, setDateEmployed]     = useState("");
  const [dateConfirmed, setDateConfirmed]   = useState("");
  const [department, setDepartment]         = useState("");
  const [designation, setDesignation]       = useState("");
  const [staffCategory, setStaffCategory]   = useState("teaching");
  const [branch, setBranch]                 = useState("");
  const [reportingTo, setReportingTo]       = useState("");
  const [employmentStatus, setEmploymentStatus] = useState("active");

  // Qualifications
  const [qualification, setQualification]   = useState("");
  const [institution, setInstitution]       = useState("");
  const [yearCompleted, setYearCompleted]   = useState("");
  const [licenseNumber, setLicenseNumber]   = useState("");
  const [ntcNumber, setNtcNumber]           = useState("");
  const [certifications, setCertifications] = useState("");
  const [specialization, setSpecialization] = useState("");

  // Payroll
  const [basicSalary, setBasicSalary]   = useState("");
  const [allowances, setAllowances]     = useState("");
  const [ssnitNumber, setSsnitNumber]   = useState("");
  const [graTin, setGraTin]             = useState("");
  const [bankName, setBankName]         = useState("");
  const [bankBranch, setBankBranch]     = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [momoNumber, setMomoNumber]     = useState("");
  const [momoNetwork, setMomoNetwork]   = useState("");

  // Academic
  const [assignedClasses, setAssignedClasses]   = useState<string[]>([]);
  const [assignedSubjects, setAssignedSubjects] = useState<string[]>([]);
  const [formMaster, setFormMaster]             = useState(false);
  const [houseMaster, setHouseMaster]           = useState(false);

  // Documents
  const [docs, setDocs] = useState<DocFile[]>([]);
  const [docType, setDocType] = useState(DOC_TYPES[0]);
  const docRef = useRef<HTMLInputElement>(null);

  function toggleArr(arr: string[], set: (v:string[])=>void, val: string) {
    set(arr.includes(val) ? arr.filter(x=>x!==val) : [...arr, val]);
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setPhoto(f);
    setPhotoPreview(URL.createObjectURL(f));
  }

  function addDoc(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setDocs(prev => [...prev, { type: docType, file: f }]);
    e.target.value = "";
  }

  function removeDoc(i: number) {
    setDocs(prev => prev.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      setError("First name and last name are required."); return;
    }
    if (!mobile.trim()) {
      setError("Mobile number is required."); return;
    }
    setSaving(true);
    setError("");

    try {
      // 1. Create auth user via profiles insert (school already has them via invite flow;
      //    here we just create a profile row with a generated password they can reset)
      const fullName = [firstName, middleName, lastName].filter(Boolean).join(" ");
      const username = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${Date.now().toString().slice(-4)}`;

      // Create Supabase auth user via API route
      const authRes = await fetch("/api/admin/create-staff-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email || `${username}@staff.local`,
          full_name: fullName,
          role,
          school_id: schoolId,
          username,
        }),
      });
      const authData = await authRes.json();
      if (!authData.profile_id) throw new Error(authData.error ?? "Failed to create staff profile");

      const profileId: string = authData.profile_id;

      // 2. Upload photo
      let photoUrl = "";
      if (photo) {
        const ext = photo.name.split(".").pop();
        const path = `staff/${profileId}-photo.${ext}`;
        const { error: upErr } = await supabase.storage.from("school-assets").upload(path, photo, { upsert: true });
        if (!upErr) {
          const { data: urlData } = supabase.storage.from("school-assets").getPublicUrl(path);
          photoUrl = urlData.publicUrl;
          await supabase.from("profiles").update({ photo_url: photoUrl }).eq("id", profileId);
        }
      }

      // 3. Insert staff_details
      await supabase.from("staff_details").upsert({
        profile_id: profileId,
        school_id: schoolId,
        staff_id_manual: staffIdManual || null,
        employee_number: employeeNumber || null,
        first_name: firstName,
        middle_name: middleName || null,
        last_name: lastName,
        gender: gender || null,
        date_of_birth: dob || null,
        nationality,
        national_id_type: idType || null,
        national_id_number: idNumber || null,
        marital_status: maritalStatus || null,
        religion: religion || null,
        mobile_number: mobile,
        alternative_number: altNumber || null,
        email: email || null,
        residential_address: address || null,
        digital_address: digitalAddress || null,
        region: region || null,
        district: district || null,
        emergency_contact_name: ecName || null,
        emergency_contact_relationship: ecRelationship || null,
        emergency_contact_phone: ecPhone || null,
        employment_type: employmentType,
        date_employed: dateEmployed || null,
        date_confirmed: dateConfirmed || null,
        department: department || null,
        designation: designation || null,
        staff_category: staffCategory,
        branch: branch || null,
        reporting_to: reportingTo || null,
        employment_status: employmentStatus,
        highest_qualification: qualification || null,
        institution_attended: institution || null,
        year_completed: yearCompleted || null,
        teaching_license_number: licenseNumber || null,
        ntc_registration_number: ntcNumber || null,
        professional_certifications: certifications || null,
        specialization: specialization || null,
        basic_salary: basicSalary ? parseFloat(basicSalary) : null,
        allowances: allowances ? parseFloat(allowances) : null,
        ssnit_number: ssnitNumber || null,
        gra_tin_number: graTin || null,
        bank_name: bankName || null,
        bank_branch: bankBranch || null,
        account_number: accountNumber || null,
        momo_number: momoNumber || null,
        momo_network: momoNetwork || null,
        form_master: formMaster,
        house_master: houseMaster,
      });

      // 4. Assigned classes
      if (assignedClasses.length > 0) {
        await supabase.from("staff_assigned_classes").insert(
          assignedClasses.map(cid => ({ profile_id: profileId, class_id: cid, school_id: schoolId }))
        );
      }

      // 5. Assigned subjects
      if (assignedSubjects.length > 0) {
        await supabase.from("staff_assigned_subjects").insert(
          assignedSubjects.map(sid => ({ profile_id: profileId, subject_id: sid, school_id: schoolId }))
        );
      }

      // 6. Upload documents
      for (const doc of docs) {
        const ext = doc.file.name.split(".").pop();
        const safeName = doc.type.replace(/\s+/g, "_").toLowerCase();
        const path = `staff/${profileId}/docs/${safeName}-${Date.now()}.${ext}`;
        const { error: docErr } = await supabase.storage.from("school-assets").upload(path, doc.file);
        if (!docErr) {
          const { data: dUrl } = supabase.storage.from("school-assets").getPublicUrl(path);
          await supabase.from("staff_documents").insert({
            profile_id: profileId,
            school_id: schoolId,
            document_type: doc.type,
            file_name: doc.file.name,
            file_url: dUrl.publicUrl,
          });
        }
      }

      router.push(`/staff/${profileId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  }

  const isFirst = section === 0;
  const isLast  = section === SECTIONS.length - 1;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Add New Staff</h1>
          <p className="text-sm text-gray-500">Fill in the staff member&apos;s details</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-5xl mx-auto p-6 grid grid-cols-[240px_1fr] gap-6">
        {/* Sidebar navigation */}
        <div className="space-y-1 sticky top-6 h-fit">
          {SECTIONS.map((s, i) => {
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSection(i)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  section === i
                    ? "bg-[#262262] text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{s.label}</span>
                {section > i && <Check className="w-4 h-4 ml-auto text-green-400" />}
              </button>
            );
          })}
        </div>

        {/* Form panels */}
        <div className="bg-white rounded-2xl border border-gray-200 p-8 space-y-6">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* ── PERSONAL ─────────────────────────────────────────── */}
          {section === 0 && (
            <>
              <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-100 pb-3">Personal Information</h2>

              {/* Photo upload */}
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center">
                    {photoPreview
                      ? <img src={photoPreview} alt="Photo" className="w-full h-full object-cover" />
                      : <User className="w-10 h-10 text-gray-300" />
                    }
                  </div>
                  <button
                    type="button"
                    onClick={() => photoRef.current?.click()}
                    className="absolute bottom-0 right-0 bg-[#262262] text-white p-1.5 rounded-full hover:bg-[#1a1856] transition-colors"
                  >
                    <Camera className="w-3 h-3" />
                  </button>
                  <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Passport Photo</p>
                  <p className="text-xs text-gray-500 mt-1">Click to upload a passport-size photo</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Staff ID" value={staffIdManual} onChange={setStaffIdManual} placeholder="e.g. STF-001" />
                <Field label="Employee Number" value={employeeNumber} onChange={setEmployeeNumber} placeholder="GES/MOE number" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Field label="First Name *" value={firstName} onChange={setFirstName} required />
                <Field label="Middle Name" value={middleName} onChange={setMiddleName} />
                <Field label="Last Name *" value={lastName} onChange={setLastName} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Select label="Role *" value={role} onChange={setRole} required options={ROLES} />
                <Select label="Gender *" value={gender} onChange={setGender} required
                  options={[{v:"male",l:"Male"},{v:"female",l:"Female"},{v:"other",l:"Other"}]} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Date of Birth" value={dob} onChange={setDob} type="date" />
                <Field label="Nationality" value={nationality} onChange={setNationality} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Select label="National ID Type" value={idType} onChange={setIdType}
                  options={ID_TYPES.map(t=>({v:t,l:t}))} placeholder="Select ID type" />
                <Field label="National ID Number" value={idNumber} onChange={setIdNumber} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Select label="Marital Status" value={maritalStatus} onChange={setMaritalStatus}
                  options={MARITAL_STATUSES.map(s=>({v:s,l:s}))} placeholder="Select status" />
                <Select label="Religion (optional)" value={religion} onChange={setReligion}
                  options={RELIGIONS.map(r=>({v:r,l:r}))} placeholder="Select religion" />
              </div>
            </>
          )}

          {/* ── CONTACT ──────────────────────────────────────────── */}
          {section === 1 && (
            <>
              <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-100 pb-3">Contact Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Mobile Number *" value={mobile} onChange={setMobile} type="tel" required />
                <Field label="Alternative Number" value={altNumber} onChange={setAltNumber} type="tel" />
              </div>
              <Field label="Email Address" value={email} onChange={setEmail} type="email" />
              <Field label="Residential Address" value={address} onChange={setAddress} />
              <Field label="Digital Address (GPS)" value={digitalAddress} onChange={setDigitalAddress} placeholder="e.g. GA-123-4567" />
              <div className="grid grid-cols-2 gap-4">
                <Select label="Region" value={region} onChange={setRegion}
                  options={GHANA_REGIONS.map(r=>({v:r,l:r}))} placeholder="Select region" />
                <Field label="District" value={district} onChange={setDistrict} placeholder="e.g. Kumasi Metropolitan" />
              </div>

              <div className="border-t border-gray-100 pt-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Emergency Contact</h3>
                <div className="grid grid-cols-3 gap-4">
                  <Field label="Full Name" value={ecName} onChange={setEcName} />
                  <Field label="Relationship" value={ecRelationship} onChange={setEcRelationship} placeholder="e.g. Spouse" />
                  <Field label="Phone Number" value={ecPhone} onChange={setEcPhone} type="tel" />
                </div>
              </div>
            </>
          )}

          {/* ── EMPLOYMENT ───────────────────────────────────────── */}
          {section === 2 && (
            <>
              <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-100 pb-3">Employment Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <Select label="Employment Type *" value={employmentType} onChange={setEmploymentType}
                  options={EMPLOYMENT_TYPES} required />
                <Select label="Staff Category *" value={staffCategory} onChange={setStaffCategory}
                  options={STAFF_CATEGORIES} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Date Employed" value={dateEmployed} onChange={setDateEmployed} type="date" />
                <Field label="Date Confirmed" value={dateConfirmed} onChange={setDateConfirmed} type="date" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Department" value={department} onChange={setDepartment} placeholder="e.g. Science Dept." />
                <Field label="Designation" value={designation} onChange={setDesignation} placeholder="e.g. Head of Dept." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Branch / Campus" value={branch} onChange={setBranch} />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reporting To</label>
                  <select
                    value={reportingTo}
                    onChange={e => setReportingTo(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#262262]/30 focus:border-[#262262]"
                  >
                    <option value="">Select supervisor</option>
                    {allStaff.map(s => (
                      <option key={s.id} value={s.id}>{s.full_name} ({s.role})</option>
                    ))}
                  </select>
                </div>
              </div>
              <Select label="Employment Status" value={employmentStatus} onChange={setEmploymentStatus}
                options={EMPLOYMENT_STATUSES} />
            </>
          )}

          {/* ── QUALIFICATIONS ───────────────────────────────────── */}
          {section === 3 && (
            <>
              <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-100 pb-3">Professional Qualifications</h2>
              <div className="grid grid-cols-2 gap-4">
                <Select label="Highest Qualification" value={qualification} onChange={setQualification}
                  options={QUALIFICATIONS.map(q=>({v:q,l:q}))} placeholder="Select qualification" />
                <Field label="Specialization / Subject Area" value={specialization} onChange={setSpecialization} placeholder="e.g. Mathematics" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Institution Attended" value={institution} onChange={setInstitution} placeholder="e.g. UG, KNUST" />
                <Field label="Year Completed" value={yearCompleted} onChange={setYearCompleted} placeholder="e.g. 2018" maxLength={4} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Teaching License Number" value={licenseNumber} onChange={setLicenseNumber} />
                <Field label="NTC Registration Number" value={ntcNumber} onChange={setNtcNumber} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Professional Certifications</label>
                <textarea
                  value={certifications}
                  onChange={e => setCertifications(e.target.value)}
                  rows={3}
                  placeholder="List any other professional certifications or training…"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#262262]/30 focus:border-[#262262]"
                />
              </div>
            </>
          )}

          {/* ── PAYROLL ──────────────────────────────────────────── */}
          {section === 4 && (
            <>
              <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-100 pb-3">Payroll Information</h2>
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                This information is confidential. Only admin and headmaster can view it.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Basic Salary (GHS)" value={basicSalary} onChange={setBasicSalary} type="number" min="0" step="0.01" />
                <Field label="Allowances (GHS)" value={allowances} onChange={setAllowances} type="number" min="0" step="0.01" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="SSNIT Number" value={ssnitNumber} onChange={setSsnitNumber} />
                <Field label="GRA TIN Number" value={graTin} onChange={setGraTin} />
              </div>

              <div className="border-t border-gray-100 pt-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Bank Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <Select label="Bank Name" value={bankName} onChange={setBankName}
                    options={BANKS.map(b=>({v:b,l:b}))} placeholder="Select bank" />
                  <Field label="Bank Branch" value={bankBranch} onChange={setBankBranch} />
                </div>
                <div className="mt-4">
                  <Field label="Account Number" value={accountNumber} onChange={setAccountNumber} />
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Mobile Money</h3>
                <div className="grid grid-cols-2 gap-4">
                  <Select label="Network" value={momoNetwork} onChange={setMomoNetwork}
                    options={MOMO_NETWORKS.map(n=>({v:n,l:n}))} placeholder="Select network" />
                  <Field label="MoMo Number" value={momoNumber} onChange={setMomoNumber} type="tel" />
                </div>
              </div>
            </>
          )}

          {/* ── ACADEMIC ASSIGNMENT ──────────────────────────────── */}
          {section === 5 && (
            <>
              <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-100 pb-3">Academic Assignment</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Assigned Classes</label>
                <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
                  {classes.map(c => (
                    <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={assignedClasses.includes(c.id)}
                        onChange={() => toggleArr(assignedClasses, setAssignedClasses, c.id)}
                        className="rounded border-gray-300 text-[#262262]"
                      />
                      {c.name}
                    </label>
                  ))}
                  {classes.length === 0 && <p className="text-sm text-gray-400 col-span-3">No classes found. Add classes first.</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Assigned Subjects</label>
                <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
                  {subjects.map(s => (
                    <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={assignedSubjects.includes(s.id)}
                        onChange={() => toggleArr(assignedSubjects, setAssignedSubjects, s.id)}
                        className="rounded border-gray-300 text-[#262262]"
                      />
                      {s.name}
                    </label>
                  ))}
                  {subjects.length === 0 && <p className="text-sm text-gray-400 col-span-3">No subjects found. Add subjects first.</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <Toggle label="Form Master / Mistress" checked={formMaster} onChange={setFormMaster}
                  description="Assigned as the form master for a class" />
                <Toggle label="House Master / Mistress" checked={houseMaster} onChange={setHouseMaster}
                  description="Assigned as the house master for a boarding house" />
              </div>
            </>
          )}

          {/* ── DOCUMENTS ────────────────────────────────────────── */}
          {section === 6 && (
            <>
              <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-100 pb-3">Documents</h2>
              <p className="text-sm text-gray-500">Upload supporting documents for this staff member. These are stored securely.</p>

              <div className="flex gap-3">
                <div className="flex-1">
                  <Select label="Document Type" value={docType} onChange={setDocType}
                    options={DOC_TYPES.map(d=>({v:d,l:d}))} />
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => docRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2 bg-[#262262] text-white rounded-lg text-sm hover:bg-[#1a1856] transition-colors"
                  >
                    <Upload className="w-4 h-4" /> Add File
                  </button>
                  <input ref={docRef} type="file" className="hidden" onChange={addDoc} />
                </div>
              </div>

              {docs.length > 0 ? (
                <div className="space-y-2">
                  {docs.map((doc, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{doc.file.name}</p>
                        <p className="text-xs text-gray-500">{doc.type} • {(doc.file.size/1024).toFixed(1)} KB</p>
                      </div>
                      <button type="button" onClick={() => removeDoc(i)}
                        className="text-red-400 hover:text-red-600 text-sm px-2 py-1">Remove</button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center">
                  <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No documents added yet</p>
                </div>
              )}
            </>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setSection(s => s - 1)}
              disabled={isFirst}
              className="flex items-center gap-2 px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>

            {isLast ? (
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#262262] text-white rounded-lg text-sm font-semibold hover:bg-[#1a1856] disabled:opacity-50 transition-colors"
              >
                {saving ? "Saving…" : "Save Staff Member"}
                {!saving && <Check className="w-4 h-4" />}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setSection(s => s + 1)}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#262262] text-white rounded-lg text-sm font-medium hover:bg-[#1a1856] transition-colors"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}

// ── Mini components ─────────────────────────────────────────────────

function Field({
  label, value, onChange, type="text", required=false,
  placeholder="", min, step, maxLength,
}: {
  label: string; value: string; onChange: (v:string)=>void;
  type?: string; required?: boolean; placeholder?: string;
  min?: string; step?: string; maxLength?: number;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        min={min}
        step={step}
        maxLength={maxLength}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#262262]/30 focus:border-[#262262]"
      />
    </div>
  );
}

function Select({
  label, value, onChange, options, required=false, placeholder="",
}: {
  label: string; value: string; onChange: (v:string)=>void;
  options: { v:string; l:string }[]; required?: boolean; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        required={required}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#262262]/30 focus:border-[#262262] bg-white"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </div>
  );
}

function Toggle({ label, checked, onChange, description }: {
  label: string; checked: boolean; onChange: (v:boolean)=>void; description?: string;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
      <div
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 mt-0.5 ${checked ? "bg-[#262262]" : "bg-gray-300"}`}
      >
        <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? "translate-x-5" : ""}`} />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-800">{label}</p>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
    </label>
  );
}
