import { Card } from "@/components/ui/Card";
import { FileText, BarChart3, Users, CreditCard } from "lucide-react";
import Link from "next/link";

const reportLinks = [
  { href: "/reports/attendance", label: "Attendance report", desc: "Daily and monthly attendance summary by class", icon: Users },
  { href: "/reports/academic", label: "Academic performance", desc: "Subject averages, class positions, honour rolls", icon: BarChart3 },
  { href: "/reports/finance", label: "Financial statement", desc: "Fee collections, outstanding balances, receipts", icon: CreditCard },
  { href: "/exams/report-card", label: "Generate report cards", desc: "Print or download terminal report cards", icon: FileText },
];

export default function ReportsPage() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-[var(--text-strong)]">Reports</h2>
        <p className="text-sm text-[var(--text-muted)]">Generate and download school reports</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {reportLinks.map(({ href, label, desc, icon: Icon }) => (
          <Link key={href} href={href}>
            <Card className="hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5 transition-all cursor-pointer h-full">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--brand-subtle)] flex items-center justify-center shrink-0">
                  <Icon size={18} className="text-[var(--brand)]" />
                </div>
                <div>
                  <p className="font-semibold text-[var(--text-strong)]">{label}</p>
                  <p className="text-sm text-[var(--text-muted)] mt-0.5">{desc}</p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
