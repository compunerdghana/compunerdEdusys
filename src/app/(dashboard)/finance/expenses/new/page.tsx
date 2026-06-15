"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Paperclip, X, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { uploadAsset } from "@/lib/uploadAsset";

const BRAND = "#262262";

const PAYMENT_METHODS = [
  "Cash",
  "Mobile Money",
  "Bank Transfer",
  "Cheque",
];

interface Category {
  id: string;
  name: string;
}

interface AttachedFile {
  file: File;
  uploading: boolean;
  url: string | null;
  error: string | null;
}

export default function NewExpensePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const today = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    expense_date: today,
    category_id: "",
    title: "",
    description: "",
    amount: "",
    supplier: "",
    payment_method: "",
    reference_number: "",
    department: "",
    branch: "",
  });

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lazy-load categories on mount
  useState(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("school_id")
        .eq("id", user.id)
        .single();
      if (!profile?.school_id) return;

      const res = await fetch(
        `/api/admin/finance/categories?schoolId=${profile.school_id}`
      );
      if (res.ok) {
        const json = await res.json();
        setCategories(json.data ?? []);
        setCategoriesLoaded(true);
      }
    })();
  });

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    const allowed = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];
    const newFiles: AttachedFile[] = [];
    for (const file of Array.from(files)) {
      if (!allowed.includes(file.type)) continue;
      newFiles.push({ file, uploading: true, url: null, error: null });
    }
    const startIdx = attachments.length;
    setAttachments((prev) => [...prev, ...newFiles]);

    // Upload each file
    for (let i = 0; i < newFiles.length; i++) {
      const idx = startIdx + i;
      const af = newFiles[i];
      try {
        const ext = af.file.name.split(".").pop();
        const path = `expenses/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const url = await uploadAsset(af.file, path);
        setAttachments((prev) =>
          prev.map((a, j) =>
            j === idx ? { ...a, uploading: false, url } : a
          )
        );
      } catch (e) {
        setAttachments((prev) =>
          prev.map((a, j) =>
            j === idx
              ? {
                  ...a,
                  uploading: false,
                  error: e instanceof Error ? e.message : "Upload failed",
                }
              : a
          )
        );
      }
    }
  }

  function removeAttachment(idx: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.title.trim()) { setError("Title is required."); return; }
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0) {
      setError("Please enter a valid amount.");
      return;
    }

    const uploading = attachments.some((a) => a.uploading);
    if (uploading) { setError("Please wait for all files to finish uploading."); return; }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Not authenticated."); return; }
    const { data: profile } = await supabase
      .from("profiles")
      .select("school_id")
      .eq("id", user.id)
      .single();
    if (!profile?.school_id) { setError("Could not determine school."); return; }

    setSubmitting(true);
    try {
      const payload = {
        school_id: profile.school_id,
        expense_date: form.expense_date,
        category_id: form.category_id || null,
        title: form.title.trim(),
        description: form.description.trim() || null,
        amount: Number(form.amount),
        supplier: form.supplier.trim() || null,
        payment_method: form.payment_method || null,
        reference_number: form.reference_number.trim() || null,
        department: form.department.trim() || null,
        branch: form.branch.trim() || null,
        attachments: attachments
          .filter((a) => a.url)
          .map((a) => a.url as string),
      };

      const res = await fetch("/api/admin/finance/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to submit expense.");

      router.push("/finance/expenses");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/finance/expenses"
          className="flex items-center justify-center w-9 h-9 rounded-xl border border-[var(--border)] hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft size={16} className="text-[var(--text-muted)]" />
        </Link>
        <div>
          <h2 className="text-[20px] font-extrabold text-[var(--text-strong)]">
            New Expense
          </h2>
          <p className="text-[13px] text-[var(--text-muted)] mt-0.5">
            Submit for approval
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl border border-[var(--border)] shadow-[0_1px_6px_rgba(0,0,0,0.05)] p-6 space-y-5"
      >
        {/* Row: Date + Category */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1.5">
              Expense Date *
            </label>
            <input
              type="date"
              value={form.expense_date}
              onChange={(e) => set("expense_date", e.target.value)}
              required
              className="h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-[13px] outline-none focus:border-[#262262]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1.5">
              Category
            </label>
            <select
              value={form.category_id}
              onChange={(e) => set("category_id", e.target.value)}
              className="h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-[13px] outline-none focus:border-[#262262] cursor-pointer"
            >
              <option value="">Select category...</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {!categoriesLoaded && (
              <p className="text-[11px] text-[var(--text-muted)] mt-1">
                Loading categories...
              </p>
            )}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1.5">
            Title *
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            required
            placeholder="e.g. Office supplies purchase"
            className="h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-[13px] outline-none focus:border-[#262262]"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1.5">
            Description
          </label>
          <textarea
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            rows={3}
            placeholder="Provide additional details about this expense..."
            className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-[13px] outline-none focus:border-[#262262] resize-none"
          />
        </div>

        {/* Row: Amount + Supplier */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1.5">
              Amount (GHS) *
            </label>
            <input
              type="number"
              value={form.amount}
              onChange={(e) => set("amount", e.target.value)}
              required
              min="0.01"
              step="0.01"
              placeholder="0.00"
              className="h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-[13px] outline-none focus:border-[#262262]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1.5">
              Supplier / Vendor
            </label>
            <input
              type="text"
              value={form.supplier}
              onChange={(e) => set("supplier", e.target.value)}
              placeholder="e.g. Melcom Ghana"
              className="h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-[13px] outline-none focus:border-[#262262]"
            />
          </div>
        </div>

        {/* Row: Payment Method + Reference Number */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1.5">
              Payment Method
            </label>
            <select
              value={form.payment_method}
              onChange={(e) => set("payment_method", e.target.value)}
              className="h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-[13px] outline-none focus:border-[#262262] cursor-pointer"
            >
              <option value="">Select method...</option>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1.5">
              Reference Number
            </label>
            <input
              type="text"
              value={form.reference_number}
              onChange={(e) => set("reference_number", e.target.value)}
              placeholder="Receipt / cheque no."
              className="h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-[13px] outline-none focus:border-[#262262]"
            />
          </div>
        </div>

        {/* Row: Department + Branch */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1.5">
              Department
            </label>
            <input
              type="text"
              value={form.department}
              onChange={(e) => set("department", e.target.value)}
              placeholder="e.g. Administration"
              className="h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-[13px] outline-none focus:border-[#262262]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1.5">
              Branch
            </label>
            <input
              type="text"
              value={form.branch}
              onChange={(e) => set("branch", e.target.value)}
              placeholder="e.g. Main Campus"
              className="h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-[13px] outline-none focus:border-[#262262]"
            />
          </div>
        </div>

        {/* Attachments */}
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1.5">
            Attachments
          </label>
          <p className="text-[11px] text-[var(--text-muted)] mb-2">
            Supported: PDF, JPG, JPEG, PNG, Word, Excel
          </p>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-[var(--border)] text-[13px] font-semibold text-[var(--text-muted)] hover:border-[#262262] hover:text-[#262262] transition-colors w-full justify-center"
          >
            <Upload size={15} />
            Click to upload files
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />

          {attachments.length > 0 && (
            <ul className="mt-3 space-y-2">
              {attachments.map((a, i) => (
                <li
                  key={i}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl bg-gray-50 border border-[var(--border)]"
                >
                  <Paperclip size={13} className="text-[var(--text-muted)] shrink-0" />
                  <span className="text-[12px] text-[var(--text-strong)] truncate flex-1">
                    {a.file.name}
                  </span>
                  {a.uploading && (
                    <Loader2
                      size={13}
                      className="animate-spin text-[var(--text-muted)] shrink-0"
                    />
                  )}
                  {a.error && (
                    <span className="text-[11px] text-red-500 shrink-0">{a.error}</span>
                  )}
                  {a.url && (
                    <span className="text-[11px] text-green-600 shrink-0 font-semibold">
                      Uploaded
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeAttachment(i)}
                    className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center hover:bg-red-100 text-[var(--text-muted)] hover:text-red-600 transition-colors"
                  >
                    <X size={11} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3">
            <p className="text-[13px] text-red-700 font-semibold">{error}</p>
          </div>
        )}

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <Link
            href="/finance/expenses"
            className="flex-1 h-10 rounded-xl border border-[var(--border)] text-[13px] font-semibold text-[var(--text-muted)] hover:bg-gray-50 transition-colors flex items-center justify-center"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 h-10 rounded-xl text-[13px] font-bold text-white flex items-center justify-center gap-2 disabled:opacity-70 transition-opacity hover:opacity-90"
            style={{ background: `linear-gradient(135deg,${BRAND},#92278F)` }}
          >
            {submitting && <Loader2 size={14} className="animate-spin" />}
            Submit for Approval
          </button>
        </div>
      </form>
    </div>
  );
}
