"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export function SetupCopyButton({ sql }: { sql: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold border border-[var(--border)] text-[var(--text-muted)] hover:border-[#262262] hover:text-[#262262] transition-colors"
    >
      {copied ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
      {copied ? "Copied!" : "Copy SQL"}
    </button>
  );
}
