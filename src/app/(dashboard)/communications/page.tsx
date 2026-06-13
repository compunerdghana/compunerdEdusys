import { Card } from "@/components/ui/Card";
import { MessageSquare } from "lucide-react";

export default function CommunicationsPage() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-[var(--text-strong)]">Communications</h2>
        <p className="text-sm text-[var(--text-muted)]">SMS and WhatsApp messaging to parents</p>
      </div>
      <Card>
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <div className="w-12 h-12 rounded-2xl bg-[var(--brand-subtle)] flex items-center justify-center">
            <MessageSquare size={22} className="text-[var(--brand)]" />
          </div>
          <p className="font-semibold text-[var(--text-strong)]">SMS & WhatsApp messaging</p>
          <p className="text-sm text-[var(--text-muted)] max-w-xs">
            Bulk messaging to parents — fee reminders, attendance alerts, announcements — is coming soon.
          </p>
        </div>
      </Card>
    </div>
  );
}
