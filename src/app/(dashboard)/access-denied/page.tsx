import Link from "next/link";
import { ShieldAlert, ArrowLeft } from "lucide-react";

export default function AccessDeniedPage() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center space-y-5">
      <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center shadow-inner">
        <ShieldAlert size={32} />
      </div>
      <div className="space-y-2 max-w-md">
        <h1 className="text-2xl font-extrabold text-slate-900">Access Denied</h1>
        <p className="text-slate-500 text-[14px] font-semibold">
          Your account does not possess the permissions or matching feature mappings required to view this module.
        </p>
      </div>
      <Link
        href="/dashboard"
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-[13px] font-bold shadow-md transition-all"
        style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
      >
        <ArrowLeft size={14} />
        Back to Dashboard
      </Link>
    </div>
  );
}
