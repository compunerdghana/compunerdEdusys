"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  CalendarDays, Upload, Trash2, FileText, BookOpen, ClipboardList,
  FolderOpen, Plus, Download, Eye, X, CheckCircle2, ChevronLeft, ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

interface Term {
  id: string; name: string; start_date: string; end_date: string;
  is_current: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  academic_years: Record<string, any> | null;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SchoolDoc = Record<string, any>;

interface Props {
  terms: Term[];
  documents: SchoolDoc[];
  schoolId: string;
  isHeadmaster: boolean;
  role: string;
}

const DOC_CATEGORIES = [
  { value: "academic_calendar", label: "Academic Calendar", icon: CalendarDays, color: "#262262" },
  { value: "curriculum",        label: "Curriculum",        icon: BookOpen,     color: "#92278F" },
  { value: "timetable",         label: "Timetable",         icon: ClipboardList, color: "#0369A1" },
  { value: "policy",            label: "School Policy",     icon: FileText,     color: "#D97706" },
  { value: "circular",          label: "Circular / Notice", icon: FolderOpen,   color: "#16A34A" },
  { value: "other",             label: "Other",             icon: FileText,     color: "#6B7280" },
];

const BRAND  = "#262262";
const ACCENT = "#92278F";
const TODAY  = new Date();

function MiniCalendar({ terms }: { terms: Term[] }) {
  const [cur, setCur] = useState(new Date(TODAY.getFullYear(), TODAY.getMonth(), 1));
  const year = cur.getFullYear(); const month = cur.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const monthName = cur.toLocaleString("en-GH", { month: "long", year: "numeric" });

  const markedDays = new Map<number, { name: string; color: string }>();
  terms.forEach((t, i) => {
    const colors = [BRAND, ACCENT, "#16A34A", "#D97706", "#0369A1"];
    const col = colors[i % colors.length];
    [t.start_date, t.end_date].forEach(d => {
      const dt = new Date(d);
      if (dt.getFullYear() === year && dt.getMonth() === month)
        markedDays.set(dt.getDate(), { name: t.name, color: col });
    });
  });

  const offset = (firstDay === 0 ? 6 : firstDay - 1);
  const cells: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="text-[15px] font-bold text-[var(--text-strong)]">{monthName}</span>
        <div className="flex gap-1">
          <button onClick={() => setCur(new Date(year, month - 1, 1))}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--neutral-100)] transition-colors">
            <ChevronLeft size={15} className="text-[var(--text-muted)]" />
          </button>
          <button onClick={() => setCur(new Date(year, month + 1, 1))}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--neutral-100)] transition-colors">
            <ChevronRight size={15} className="text-[var(--text-muted)]" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 mb-2">
        {DAYS.map(d => (
          <div key={d} className="text-center text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const isToday = day === TODAY.getDate() && month === TODAY.getMonth() && year === TODAY.getFullYear();
          const marked = markedDays.get(day);
          const isWeekend = (i % 7) >= 5;
          return (
            <div key={i} className="flex flex-col items-center py-0.5" title={marked?.name}>
              <span className={`w-8 h-8 flex items-center justify-center rounded-full text-[12px] font-medium transition-colors
                ${isToday ? "text-white font-bold shadow-sm" : isWeekend ? "text-[var(--text-muted)]" : "text-[var(--text-body)] hover:bg-[var(--neutral-100)]"}`}
                style={isToday ? { background: BRAND } : {}}>
                {day}
              </span>
              {marked && <span className="w-1.5 h-1.5 rounded-full mt-0.5" style={{ background: marked.color }} />}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      {terms.length > 0 && (
        <div className="mt-4 pt-4 border-t border-[var(--border)] space-y-1.5">
          {terms.map((t, i) => {
            const colors = [BRAND, ACCENT, "#16A34A", "#D97706", "#0369A1"];
            const col = colors[i % colors.length];
            const isNow = new Date(t.start_date) <= TODAY && TODAY <= new Date(t.end_date);
            return (
              <div key={t.id} className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: col }} />
                <span className="text-[11px] text-[var(--text-body)] flex-1 truncate">{t.name}</span>
                {isNow && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">NOW</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function AcademicCalendarClient({ terms, documents: initialDocs, schoolId, isHeadmaster }: Props) {
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [docs, setDocs]           = useState<SchoolDoc[]>(initialDocs);
  const [category, setCategory]   = useState("academic_calendar");
  const [docTitle, setDocTitle]   = useState("");
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting]   = useState<string | null>(null);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const [filterCat, setFilterCat] = useState("all");
  const [showUpload, setShowUpload] = useState(false);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true); setUploadErr(null);

    for (const file of files) {
      if (file.size > 20 * 1024 * 1024) { setUploadErr(`${file.name} exceeds 20 MB limit.`); continue; }
      const ext = file.name.split(".").pop();
      const path = `school-docs/${schoolId}/${category}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("school-assets").upload(path, file, { upsert: false });
      if (upErr) { setUploadErr("Upload failed: " + upErr.message); continue; }
      const { data: { publicUrl } } = supabase.storage.from("school-assets").getPublicUrl(path);

      const { data: row } = await supabase.from("school_documents").insert({
        school_id: schoolId,
        category,
        title: docTitle.trim() || file.name.replace(/\.[^.]+$/, ""),
        file_name: file.name,
        file_url: publicUrl,
        file_size: file.size,
        mime_type: file.type,
      }).select("*").single();

      if (row) setDocs(prev => [row, ...prev]);
    }

    setUploading(false);
    setDocTitle("");
    setShowUpload(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleDelete(doc: SchoolDoc) {
    setDeleting(doc.id);
    await supabase.from("school_documents").delete().eq("id", doc.id);
    setDocs(prev => prev.filter(d => d.id !== doc.id));
    setDeleting(null);
  }

  const filtered = filterCat === "all" ? docs : docs.filter(d => d.category === filterCat);

  function fileIcon(mime: string | null) {
    if (!mime) return "📄";
    if (mime.includes("pdf")) return "📕";
    if (mime.includes("word") || mime.includes("doc")) return "📝";
    if (mime.includes("sheet") || mime.includes("excel") || mime.includes("csv")) return "📊";
    if (mime.includes("image")) return "🖼️";
    return "📄";
  }

  function fileSize(bytes: number | null) {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-[20px] font-extrabold text-[var(--text-strong)]">Academic Calendar</h2>
          <p className="text-[13px] text-[var(--text-muted)] mt-0.5">
            Term dates, curriculum, circulars and school documents
          </p>
        </div>
        <div className="flex gap-2">
          {isHeadmaster && (
            <Link href="/settings/academic-year"
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-[var(--border)] bg-white text-[13px] font-semibold text-[var(--text-muted)] hover:bg-[var(--neutral-50)]">
              <Plus size={14} /> Manage Terms
            </Link>
          )}
          {isHeadmaster && (
            <button onClick={() => setShowUpload(v => !v)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[13px] font-bold text-white hover:opacity-90"
              style={{ background: BRAND }}>
              <Upload size={14} /> Upload Document
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Left: Calendar + term list */}
        <div className="space-y-4">
          {/* Mini calendar */}
          <div className="bg-white rounded-2xl border border-[var(--border)] p-5 shadow-[0_1px_6px_rgba(0,0,0,0.05)]">
            <MiniCalendar terms={terms} />
          </div>

          {/* Term list */}
          <div className="bg-white rounded-2xl border border-[var(--border)] shadow-[0_1px_6px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="px-5 py-3 border-b border-[var(--border)] flex items-center justify-between">
              <h3 className="text-[13px] font-bold text-[var(--text-strong)]">Terms</h3>
              {isHeadmaster && (
                <Link href="/settings/academic-year" className="text-[11px] font-semibold" style={{ color: BRAND }}>
                  Edit →
                </Link>
              )}
            </div>
            {terms.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <CalendarDays size={24} className="text-[var(--text-muted)] opacity-30 mx-auto mb-2" />
                <p className="text-[12px] text-[var(--text-muted)]">No terms set up yet.</p>
                {isHeadmaster && (
                  <Link href="/settings/academic-year" className="text-[12px] font-semibold mt-1 inline-block" style={{ color: BRAND }}>
                    Set up academic year →
                  </Link>
                )}
              </div>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {terms.map((t) => {
                  const start = new Date(t.start_date);
                  const end = new Date(t.end_date);
                  const isNow = start <= TODAY && TODAY <= end;
                  const isPast = end < TODAY;
                  return (
                    <div key={t.id} className={`px-5 py-3 ${isNow ? "bg-green-50" : ""}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-[var(--text-strong)] flex items-center gap-2">
                            {t.name}
                            {isNow && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">ONGOING</span>}
                            {isPast && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">ENDED</span>}
                          </p>
                          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                            {formatDate(t.start_date)} — {formatDate(t.end_date)}
                          </p>
                          {t.academic_years?.name && (
                            <p className="text-[10px] text-[var(--text-muted)]">{t.academic_years.name}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Documents */}
        <div className="lg:col-span-2 space-y-4">

          {/* Upload panel */}
          {isHeadmaster && showUpload && (
            <div className="bg-white rounded-2xl border border-[var(--border)] p-5 shadow-[0_1px_6px_rgba(0,0,0,0.05)]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[14px] font-bold text-[var(--text-strong)]">Upload Document(s)</h3>
                <button onClick={() => setShowUpload(false)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--neutral-100)]">
                  <X size={14} className="text-[var(--text-muted)]" />
                </button>
              </div>
              <div className="space-y-4">
                {/* Category */}
                <div>
                  <label className="text-[13px] font-semibold text-[var(--text-strong)] block mb-2">Category</label>
                  <div className="flex flex-wrap gap-2">
                    {DOC_CATEGORIES.map(c => (
                      <button key={c.value} type="button" onClick={() => setCategory(c.value)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[12px] font-medium transition-all ${
                          category === c.value ? "text-white border-transparent" : "border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--ring)]"
                        }`}
                        style={category === c.value ? { background: c.color } : {}}>
                        <c.icon size={12} />{c.label}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Title */}
                <div>
                  <label className="text-[13px] font-semibold text-[var(--text-strong)] block mb-1.5">Title (optional — defaults to filename)</label>
                  <input value={docTitle} onChange={e => setDocTitle(e.target.value)}
                    placeholder="e.g. 2025/2026 Academic Calendar"
                    className="h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-[13px] outline-none focus:border-[var(--ring)]" />
                </div>
                {uploadErr && <p className="text-[12px] text-red-600 bg-red-50 px-3 py-2 rounded-lg">{uploadErr}</p>}
                <div
                  onClick={() => fileRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-3 px-6 py-10 border-2 border-dashed border-[var(--border)] rounded-xl cursor-pointer hover:border-[#262262] hover:bg-[#EEF2FF] transition-colors group">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform" style={{ background: "#EEF2FF" }}>
                    {uploading ? (
                      <div className="w-5 h-5 border-2 border-[#262262] border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Upload size={20} style={{ color: BRAND }} />
                    )}
                  </div>
                  <div className="text-center">
                    <p className="text-[13px] font-semibold text-[var(--text-strong)]">
                      {uploading ? "Uploading…" : "Click to select files"}
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">PDF, Word, Excel, images · Multiple files allowed · Max 20 MB each</p>
                  </div>
                </div>
                <input ref={fileRef} type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.ppt,.pptx" className="hidden" onChange={handleUpload} />
              </div>
            </div>
          )}

          {/* Category filter */}
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setFilterCat("all")}
              className={`px-3 py-1.5 rounded-xl border text-[12px] font-semibold transition-all ${filterCat === "all" ? "text-white border-transparent" : "border-[var(--border)] text-[var(--text-muted)]"}`}
              style={filterCat === "all" ? { background: BRAND } : {}}>
              All ({docs.length})
            </button>
            {DOC_CATEGORIES.map(c => {
              const count = docs.filter(d => d.category === c.value).length;
              if (count === 0) return null;
              return (
                <button key={c.value} onClick={() => setFilterCat(c.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[12px] font-medium transition-all ${
                    filterCat === c.value ? "text-white border-transparent" : "border-[var(--border)] text-[var(--text-muted)]"
                  }`}
                  style={filterCat === c.value ? { background: c.color } : {}}>
                  <c.icon size={11} />{c.label} ({count})
                </button>
              );
            })}
          </div>

          {/* Documents list */}
          <div className="bg-white rounded-2xl border border-[var(--border)] shadow-[0_1px_6px_rgba(0,0,0,0.05)] overflow-hidden">
            {filtered.length === 0 ? (
              <div className="px-5 py-16 text-center">
                <FolderOpen size={32} className="text-[var(--text-muted)] opacity-25 mx-auto mb-3" />
                <p className="text-[14px] font-semibold text-[var(--text-strong)]">No documents yet</p>
                <p className="text-[12px] text-[var(--text-muted)] mt-1">
                  {isHeadmaster ? "Upload the academic calendar, curriculum or circulars above." : "The school head hasn't uploaded any documents yet."}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {filtered.map(doc => {
                  const cat = DOC_CATEGORIES.find(c => c.value === doc.category);
                  return (
                    <div key={doc.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-[var(--neutral-50)] transition-colors group">
                      <div className="text-[24px] shrink-0">{fileIcon(doc.mime_type)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-[var(--text-strong)] truncate">{doc.title ?? doc.file_name}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {cat && (
                            <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                              style={{ background: `${cat.color}15`, color: cat.color }}>
                              <cat.icon size={9} />{cat.label}
                            </span>
                          )}
                          <span className="text-[11px] text-[var(--text-muted)]">{doc.file_name}</span>
                          {doc.file_size && <span className="text-[11px] text-[var(--text-muted)]">· {fileSize(doc.file_size)}</span>}
                          <span className="text-[11px] text-[var(--text-muted)]">· {formatDate(doc.created_at)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <a href={doc.file_url} target="_blank" rel="noreferrer"
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--neutral-100)] text-[var(--text-muted)] transition-colors"
                          title="Preview">
                          <Eye size={14} />
                        </a>
                        <a href={doc.file_url} download={doc.file_name}
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--neutral-100)] text-[var(--text-muted)] transition-colors"
                          title="Download">
                          <Download size={14} />
                        </a>
                        {isHeadmaster && (
                          <button onClick={() => handleDelete(doc)} disabled={deleting === doc.id}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors disabled:opacity-50"
                            title="Delete">
                            {deleting === doc.id
                              ? <div className="w-3.5 h-3.5 border border-red-400 border-t-transparent rounded-full animate-spin" />
                              : <Trash2 size={13} />}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {filtered.length > 0 && (
            <p className="text-[11px] text-[var(--text-muted)] text-right">
              <CheckCircle2 size={11} className="inline mr-1 text-green-500" />
              {filtered.length} document{filtered.length !== 1 ? "s" : ""} · visible to all staff
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
