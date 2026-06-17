"use client";

import { useState } from "react";
import { BookOpen, Upload, Download, Trash2, Loader2, FileText } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface Resource {
  id: string;
  name: string;
  type: string;
  size: string;
  uploadedAt: string;
}

export default function TeachingResourcesView() {
  const { success } = useToast();
  const [resources, setResources] = useState<Resource[]>([
    { id: "1", name: "Grade 8 Mathematics Syllabus Guide.pdf", type: "PDF Document", size: "2.1 MB", uploadedAt: "2026-06-10" },
    { id: "2", name: "Biology Photosynthesis Slides.pptx", type: "Presentation Slide", size: "4.5 MB", uploadedAt: "2026-06-12" },
  ]);
  const [uploading, setUploading] = useState(false);

  function handleUpload() {
    setUploading(true);
    setTimeout(() => {
      const newRes: Resource = {
        id: String(Date.now()),
        name: "Offline Lesson Worksheets.docx",
        type: "Word Document",
        size: "1.1 MB",
        uploadedAt: new Date().toISOString().split("T")[0]
      };
      setResources(prev => [newRes, ...prev]);
      setUploading(false);
      success("Teaching resource file uploaded successfully to storage!");
    }, 1000);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-extrabold text-slate-900 leading-tight">Teaching Resources</h1>
          <p className="text-slate-500 text-[12px] font-semibold mt-0.5">Upload syllabus references, PDF textbooks, slides, and worksheets to student dashboards.</p>
        </div>
        
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-[12px] font-bold transition-all shadow-sm shrink-0"
          style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
        >
          {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
          Upload File
        </button>
      </div>

      {/* Grid of files */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {resources.map((res) => (
          <div key={res.id} className="bg-white rounded-2xl border border-[#e8e4f3] p-5 shadow-sm flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
                <FileText size={18} />
              </div>
              <div className="min-w-0">
                <h4 className="font-extrabold text-slate-900 text-[13.5px] leading-tight truncate">{res.name}</h4>
                <p className="text-slate-400 font-medium text-[11px] mt-0.5">{res.type} · {res.size}</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button className="p-2 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-colors">
                <Download size={14} />
              </button>
              <button className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
