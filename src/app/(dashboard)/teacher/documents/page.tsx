"use client";

import { useState, useEffect } from "react";
import { FileText, Download, Search, Info, Loader2, FileCode, FileSpreadsheet, Image, File } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toast";

interface SchoolDocument {
  id: string;
  title: string;
  file_name: string;
  file_url: string;
  file_size?: number;
  mime_type?: string;
  category: string;
  created_at: string;
}

export default function DocumentCenterView() {
  const { error: toastError } = useToast();
  const [documents, setDocuments] = useState<SchoolDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  useEffect(() => {
    const supabase = createClient();
    async function loadDocuments() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch school_id of active teacher
        const { data: profile } = await supabase
          .from("profiles")
          .select("school_id")
          .eq("id", user.id)
          .single();

        if (profile?.school_id) {
          const { data: docs, error: docErr } = await supabase
            .from("school_documents")
            .select("*")
            .eq("school_id", profile.school_id)
            .order("created_at", { ascending: false });

          if (docErr) throw docErr;
          setDocuments(docs || []);
        }
      } catch (err) {
        console.error(err);
        toastError("Failed to fetch official school documents.");
      } finally {
        setLoading(false);
      }
    }
    loadDocuments();
  }, [toastError]);

  // Helper to format file sizes nicely
  function formatBytes(bytes?: number) {
    if (!bytes) return "N/A";
    const k = 1024;
    const dm = 1;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  }

  // Get matching icon based on file mime type or extension
  function getFileIcon(mime?: string, fileName?: string) {
    const type = (mime || "").toLowerCase();
    const name = (fileName || "").toLowerCase();

    if (type.includes("pdf") || name.endsWith(".pdf")) {
      return { icon: FileText, bg: "bg-red-50 text-red-600 border-red-100" };
    }
    if (type.includes("sheet") || type.includes("excel") || type.includes("csv") || name.endsWith(".xlsx") || name.endsWith(".csv")) {
      return { icon: FileSpreadsheet, bg: "bg-emerald-50 text-emerald-600 border-emerald-100" };
    }
    if (type.includes("word") || type.includes("document") || name.endsWith(".docx") || name.endsWith(".doc")) {
      return { icon: FileText, bg: "bg-blue-50 text-blue-600 border-blue-100" };
    }
    if (type.includes("image") || name.endsWith(".png") || name.endsWith(".jpg") || name.endsWith(".jpeg") || name.endsWith(".svg")) {
      return { icon: Image, bg: "bg-purple-50 text-purple-600 border-purple-100" };
    }
    if (type.includes("json") || type.includes("code") || name.endsWith(".json") || name.endsWith(".xml")) {
      return { icon: FileCode, bg: "bg-amber-50 text-amber-600 border-amber-100" };
    }
    return { icon: File, bg: "bg-slate-50 text-slate-600 border-slate-100" };
  }

  const handleDownload = (doc: SchoolDocument) => {
    if (!doc.file_url) return;
    // Bypasses browser CORS restrictions by opening the storage asset directly in a new viewport
    window.open(doc.file_url, "_blank");
  };

  // Filter Logic
  const filteredDocs = documents.filter((doc) => {
    const matchesSearch =
      (doc.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.file_name || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      activeCategory === "all" ||
      doc.category.toLowerCase() === activeCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  const categories = ["all", ...Array.from(new Set(documents.map((d) => d.category.toLowerCase())))];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white/70 backdrop-blur-md p-6 rounded-2xl border border-[#e8e4f3] shadow-sm">
        <div>
          <h1 className="text-[20px] font-extrabold text-slate-900 leading-tight">Document Hub</h1>
          <p className="text-slate-500 text-[12px] font-semibold mt-0.5">
            Access official guidelines, syllabi, handbooks, and announcements shared by school administration.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-[#e8e4f3] p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:max-w-xs shrink-0">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search document name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 h-10 rounded-xl border border-[#e0daf0] text-[12.5px] font-semibold text-slate-700 outline-none focus:border-[#7c3aed] bg-white transition-all"
          />
        </div>

        {/* Categories Carousel */}
        <div className="flex gap-2 w-full overflow-x-auto pb-1 md:pb-0 scrollbar-none justify-start md:justify-end">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 h-9 rounded-xl font-bold text-[11px] uppercase tracking-wider border transition-all shrink-0 capitalize ${
                activeCategory === cat
                  ? "bg-violet-600 border-violet-600 text-white shadow-sm"
                  : "bg-slate-50/50 border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-100"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Roster list grid */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-24 text-center">
            <Loader2 size={32} className="animate-spin text-violet-600 mx-auto" />
            <p className="text-slate-400 text-[13px] font-semibold mt-3">Fetching document registry...</p>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center text-slate-400 font-semibold text-[13.5px] border border-dashed border-[#e8e4f3] rounded-2xl bg-white shadow-sm">
            <Info size={28} className="text-violet-400 mb-2.5" />
            <span>No documents found matching the criteria.</span>
            <p className="text-[11.5px] text-slate-400 font-medium mt-1">Official materials are managed and uploaded by the School Headmaster or Admin.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredDocs.map((doc) => {
              const fileDetail = getFileIcon(doc.mime_type, doc.file_name);
              const DocIcon = fileDetail.icon;

              return (
                <div
                  key={doc.id}
                  className="bg-white rounded-2xl border border-[#e8e4f3] p-5 shadow-sm hover:shadow-md hover:border-violet-200 transition-all flex flex-col justify-between h-36"
                >
                  <div className="flex gap-3.5 min-w-0">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center border shrink-0 ${fileDetail.bg}`}>
                      <DocIcon size={20} />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[9px] font-extrabold uppercase tracking-widest bg-slate-50 border border-slate-100/50 text-slate-500 px-2 py-0.5 rounded">
                        {doc.category}
                      </span>
                      <h4
                        className="font-extrabold text-slate-900 text-[13px] leading-snug mt-1.5 truncate cursor-pointer hover:text-violet-600"
                        onClick={() => handleDownload(doc)}
                        title={doc.title || doc.file_name}
                      >
                        {doc.title || doc.file_name}
                      </h4>
                      <p className="text-slate-400 font-semibold text-[10px] mt-1 font-mono">
                        {formatBytes(doc.file_size)} · Uploaded: {new Date(doc.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end pt-3 border-t border-[#f5f3fc]">
                    <button
                      onClick={() => handleDownload(doc)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-[11px] font-bold hover:bg-slate-50 transition-all hover:border-violet-200 hover:text-violet-700 shadow-sm"
                    >
                      <Download size={12} />
                      Download
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
