import { Card } from "@/components/ui/Card";
import { Calendar } from "lucide-react";

export default function TimetablePage() {
  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold text-[var(--text-strong)]">Timetable</h2>
        <p className="text-sm text-[var(--text-muted)]">Class schedules and periods</p>
      </div>
      <Card>
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <div className="w-12 h-12 rounded-2xl bg-[var(--brand-subtle)] flex items-center justify-center">
            <Calendar size={22} className="text-[var(--brand)]" />
          </div>
          <p className="font-semibold text-[var(--text-strong)]">Timetable management</p>
          <p className="text-sm text-[var(--text-muted)] max-w-xs">
            Timetable builder is coming soon. You will be able to create and manage weekly timetables for each class.
          </p>
        </div>
      </Card>
    </div>
  );
}
