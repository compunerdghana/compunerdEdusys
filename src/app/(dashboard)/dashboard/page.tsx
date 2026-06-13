import { createClient } from "@/lib/supabase/server";
import { StatCard } from "@/components/ui/Card";
import { Users, UserCheck, CreditCard, ClipboardList, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("school_id, full_name")
    .eq("id", user!.id)
    .single();

  const schoolId = profile?.school_id;

  // Parallel data fetch
  const [studentsRes, presentTodayRes, feesRes] = await Promise.all([
    schoolId
      ? supabase.from("students").select("id", { count: "exact" }).eq("school_id", schoolId).eq("status", "active")
      : Promise.resolve({ count: 0 }),
    schoolId
      ? supabase.from("attendance_records").select("id", { count: "exact" })
          .eq("school_id", schoolId)
          .eq("date", new Date().toISOString().slice(0, 10))
          .eq("status", "present")
      : Promise.resolve({ count: 0 }),
    schoolId
      ? supabase.from("fee_payments").select("balance").eq("school_id", schoolId).eq("payment_status", "unpaid")
      : Promise.resolve({ data: [] }),
  ]);

  const totalStudents = studentsRes.count ?? 0;
  const presentToday = presentTodayRes.count ?? 0;
  const outstandingFees = (feesRes.data ?? []).reduce(
    (sum: number, p: { balance: number }) => sum + (p.balance ?? 0),
    0,
  );

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h2 className="text-xl font-bold text-[var(--text-strong)] mb-1">Overview</h2>
        <p className="text-sm text-[var(--text-muted)]">
          {new Intl.DateTimeFormat("en-GH", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date())}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total students"
          value={totalStudents.toLocaleString()}
          icon={<Users size={18} />}
          accent
        />
        <StatCard
          label="Present today"
          value={presentToday.toLocaleString()}
          icon={<UserCheck size={18} />}
        />
        <StatCard
          label="Outstanding fees"
          value={formatCurrency(outstandingFees)}
          icon={<CreditCard size={18} />}
        />
        <StatCard
          label="Pending sync"
          value="—"
          icon={<ClipboardList size={18} />}
        />
      </div>

      {/* Quick actions */}
      <div>
        <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-[0.08em] mb-3">Quick actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { href: "/students/new", label: "Admit student", icon: Users },
            { href: "/attendance", label: "Take attendance", icon: ClipboardList },
            { href: "/finance/record-payment", label: "Record payment", icon: CreditCard },
            { href: "/exams", label: "Enter scores", icon: AlertCircle },
          ].map(({ href, label, icon: Icon }) => (
            <a
              key={href}
              href={href}
              className="flex flex-col items-start gap-3 p-4 bg-white rounded-[14px] border border-[var(--border)] shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5 transition-all"
            >
              <div className="w-9 h-9 rounded-xl bg-[var(--brand-subtle)] flex items-center justify-center">
                <Icon size={16} className="text-[var(--brand)]" />
              </div>
              <span className="text-sm font-semibold text-[var(--text-strong)]">{label}</span>
            </a>
          ))}
        </div>
      </div>

      {!schoolId && (
        <div className="bg-[var(--warning-bg)] border border-[var(--amber-100)] rounded-[14px] p-5 flex gap-3">
          <AlertCircle size={18} className="text-[var(--warning)] shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-[var(--amber-600)]">School setup required</p>
            <p className="text-sm text-[var(--text-body)] mt-0.5">
              Your account isn&apos;t linked to a school yet. Ask the super administrator to complete setup.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
