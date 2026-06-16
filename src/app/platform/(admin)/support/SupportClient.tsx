"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, LifeBuoy } from "lucide-react";
import { SlidePanel } from "@/components/ui/SlidePanel";
import { useToast } from "@/components/ui/Toast";

const STATUS_TABS = ["all", "open", "assigned", "in_progress", "resolved", "closed"];

const priorityBadge: Record<string, string> = {
  low: "bg-slate-50 text-slate-600 border border-slate-100",
  normal: "bg-blue-50 text-blue-700 border border-blue-100",
  high: "bg-orange-50 text-orange-700 border border-orange-100",
  urgent: "bg-red-50 text-red-700 border border-red-100",
};

const statusBadge: Record<string, string> = {
  open: "bg-emerald-50 text-emerald-700 border border-emerald-100",
  assigned: "bg-violet-50 text-violet-700 border border-violet-100",
  in_progress: "bg-blue-50 text-blue-700 border border-blue-100",
  resolved: "bg-slate-50 text-slate-600 border border-slate-100",
  closed: "bg-gray-50 text-gray-500 border border-gray-100",
};

interface Ticket {
  id: string;
  ticket_number: string;
  subject: string;
  description?: string;
  type?: string;
  priority: string;
  status: string;
  created_at: string;
  assigned_to?: string;
  schools?: { name: string; code: string } | null;
}

interface PlatformUser {
  id: string;
  full_name: string;
}

export function SupportClient({ tickets, platformUsers }: { tickets: Ticket[]; platformUsers: PlatformUser[] }) {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [activeTab, setActiveTab] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [updateForm, setUpdateForm] = useState({ status: "", assignedTo: "", resolution: "" });
  const [createForm, setCreateForm] = useState({ subject: "", description: "", priority: "normal", type: "general" });

  const filtered = tickets.filter(t => {
    if (activeTab !== "all" && t.status !== activeTab) return false;
    if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
    return true;
  });

  function openTicket(ticket: Ticket) {
    setSelectedTicket(ticket);
    setUpdateForm({ status: ticket.status, assignedTo: ticket.assigned_to ?? "", resolution: "" });
    setDetailOpen(true);
  }

  async function handleUpdate() {
    if (!selectedTicket) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/platform/support/${selectedTicket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateForm),
      });
      if (!res.ok) throw new Error();
      success("Ticket updated.");
      setDetailOpen(false);
      router.refresh();
    } catch {
      toastError("Failed to update ticket.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCreate() {
    if (!createForm.subject) { toastError("Subject is required."); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/platform/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      if (!res.ok) throw new Error();
      success("Ticket created.");
      setCreateOpen(false);
      router.refresh();
    } catch {
      toastError("Failed to create ticket.");
    } finally {
      setSaving(false);
    }
  }

  const inputClass = "w-full px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-extrabold text-slate-900 leading-tight">Support Tickets</h1>
          <p className="text-slate-500 text-[13px] font-semibold mt-1">{tickets.length} total tickets</p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-[13px] font-bold transition-all shadow-sm"
          style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
        >
          <Plus size={15} />
          Create Ticket
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] overflow-hidden">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 border-b border-[#f0edf8]">
          <div className="flex items-center gap-1 bg-[#f5f3fc] rounded-xl p-1 flex-wrap">
            {STATUS_TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold capitalize whitespace-nowrap transition-all ${
                  activeTab === tab ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {tab.replace("_", " ")}
              </button>
            ))}
          </div>
          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
            className="px-3 h-9 rounded-xl border border-[#e0daf0] text-[12px] font-bold text-slate-600 outline-none focus:border-[#7c3aed] bg-white"
          >
            <option value="all">All Priorities</option>
            {["low", "normal", "high", "urgent"].map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#faf9ff] border-b border-[#f0edf8]">
                {["Ticket #", "School", "Subject", "Type", "Priority", "Status", "Created", "Assigned To", ""].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-extrabold text-slate-400 uppercase tracking-widest whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f5f3fc]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center">
                        <LifeBuoy size={22} className="text-violet-400" />
                      </div>
                      <p className="text-slate-400 font-semibold text-[13px]">No tickets found.</p>
                    </div>
                  </td>
                </tr>
              ) : filtered.map(ticket => (
                <tr
                  key={ticket.id}
                  className="hover:bg-[#faf9ff] transition-colors cursor-pointer"
                  onClick={() => openTicket(ticket)}
                >
                  <td className="px-4 py-3.5 font-mono text-[11px] font-bold text-slate-500">#{ticket.ticket_number}</td>
                  <td className="px-4 py-3.5">
                    <p className="font-bold text-slate-900 text-[12px]">{ticket.schools?.name ?? "—"}</p>
                    {ticket.schools?.code && <p className="text-slate-400 text-[10px] font-mono">{ticket.schools.code}</p>}
                  </td>
                  <td className="px-4 py-3.5 font-semibold text-slate-800 text-[13px] max-w-[200px] truncate">{ticket.subject}</td>
                  <td className="px-4 py-3.5 text-slate-400 font-semibold text-[12px] capitalize">{ticket.type ?? "general"}</td>
                  <td className="px-4 py-3.5">
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${priorityBadge[ticket.priority] ?? "bg-slate-50 text-slate-500"}`}>
                      {ticket.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${statusBadge[ticket.status] ?? "bg-slate-50 text-slate-500"}`}>
                      {ticket.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-slate-400 font-semibold text-[12px] whitespace-nowrap">
                    {new Date(ticket.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3.5 text-slate-500 font-semibold text-[12px]">
                    {platformUsers.find(u => u.id === ticket.assigned_to)?.full_name ?? "Unassigned"}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-[12px] font-bold text-violet-600">View</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ticket Detail Panel */}
      <SlidePanel
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={`Ticket #${selectedTicket?.ticket_number}`}
        subtitle={selectedTicket?.subject}
        width="lg"
      >
        {selectedTicket && (
          <div className="space-y-5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[11px] font-extrabold uppercase px-2.5 py-1 rounded-full ${priorityBadge[selectedTicket.priority]}`}>
                {selectedTicket.priority}
              </span>
              <span className={`text-[11px] font-extrabold uppercase px-2.5 py-1 rounded-full ${statusBadge[selectedTicket.status]}`}>
                {selectedTicket.status.replace("_", " ")}
              </span>
              <span className="text-slate-400 text-[12px] font-semibold ml-auto">{new Date(selectedTicket.created_at).toLocaleString()}</span>
            </div>
            <div className="bg-[#faf9ff] rounded-xl p-4 border border-[#f0edf8]">
              <p className="text-[13px] font-bold text-slate-700 mb-2">Description</p>
              <p className="text-[13px] font-semibold text-slate-600">{selectedTicket.description ?? "No description provided."}</p>
            </div>
            <div>
              <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Update Status</label>
              <select
                value={updateForm.status}
                onChange={e => setUpdateForm(f => ({ ...f, status: e.target.value }))}
                className={inputClass}
              >
                {["open", "assigned", "in_progress", "resolved", "closed"].map(s => (
                  <option key={s} value={s}>{s.replace("_", " ")}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Assign To</label>
              <select
                value={updateForm.assignedTo}
                onChange={e => setUpdateForm(f => ({ ...f, assignedTo: e.target.value }))}
                className={inputClass}
              >
                <option value="">Unassigned</option>
                {platformUsers.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Resolution Notes</label>
              <textarea
                value={updateForm.resolution}
                onChange={e => setUpdateForm(f => ({ ...f, resolution: e.target.value }))}
                placeholder="Describe how this was resolved…"
                rows={4}
                className="w-full px-4 py-3 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all resize-none bg-white"
              />
            </div>
            <button
              onClick={handleUpdate}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold text-[13px] disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
            >
              {saving ? <><Loader2 size={14} className="animate-spin" /> Updating…</> : "Update Ticket"}
            </button>
          </div>
        )}
      </SlidePanel>

      {/* Create Ticket Panel */}
      <SlidePanel open={createOpen} onClose={() => setCreateOpen(false)} title="Create Support Ticket">
        <div className="space-y-4">
          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Subject <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={createForm.subject}
              onChange={e => setCreateForm(f => ({ ...f, subject: e.target.value }))}
              placeholder="Briefly describe the issue"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Description</label>
            <textarea
              value={createForm.description}
              onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Full details of the issue"
              rows={4}
              className="w-full px-4 py-3 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all resize-none bg-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Type</label>
              <select value={createForm.type} onChange={e => setCreateForm(f => ({ ...f, type: e.target.value }))} className={inputClass}>
                {["general", "billing", "technical", "feature_request", "bug"].map(t => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Priority</label>
              <select value={createForm.priority} onChange={e => setCreateForm(f => ({ ...f, priority: e.target.value }))} className={inputClass}>
                {["low", "normal", "high", "urgent"].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <button
            onClick={handleCreate}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold text-[13px] disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
          >
            {saving ? <><Loader2 size={14} className="animate-spin" /> Creating…</> : "Create Ticket"}
          </button>
        </div>
      </SlidePanel>
    </div>
  );
}
