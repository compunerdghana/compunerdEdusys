"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { SlidePanel } from "@/components/ui/SlidePanel";
import { useToast } from "@/components/ui/Toast";

const PLATFORM_GRADIENT = "linear-gradient(135deg, #1a0533, #2d1b69, #6b1f8a)";
const STATUS_TABS = ["all", "open", "assigned", "in_progress", "resolved", "closed"];

const priorityBadge: Record<string, string> = {
  low: "bg-slate-100 text-slate-600",
  normal: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

const statusBadge: Record<string, string> = {
  open: "bg-emerald-100 text-emerald-700",
  assigned: "bg-purple-100 text-purple-700",
  in_progress: "bg-blue-100 text-blue-700",
  resolved: "bg-slate-100 text-slate-600",
  closed: "bg-gray-100 text-gray-500",
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

  return (
    <div className="space-y-6">
      <div className="rounded-2xl px-8 py-6 text-white flex items-center justify-between" style={{ background: PLATFORM_GRADIENT }}>
        <div>
          <h1 className="text-2xl font-extrabold">Support Tickets</h1>
          <p className="text-white/60 font-semibold mt-1">{tickets.length} total tickets</p>
        </div>
        <button onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-sm transition-all border border-white/20">
          <Plus size={16} />
          Create Ticket
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 overflow-x-auto flex-wrap">
            {STATUS_TABS.map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold capitalize whitespace-nowrap transition-all ${
                  activeTab === tab ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}>
                {tab.replace("_", " ")}
              </button>
            ))}
          </div>
          <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 outline-none focus:border-purple-400 bg-white">
            <option value="all">All Priorities</option>
            {["low", "normal", "high", "urgent"].map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50">
                {["Ticket #", "School", "Subject", "Type", "Priority", "Status", "Created", "Assigned To", ""].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-extrabold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-12 text-slate-400 font-semibold">No tickets found.</td></tr>
              ) : filtered.map(ticket => (
                <tr key={ticket.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => openTicket(ticket)}>
                  <td className="px-4 py-3 font-mono text-xs font-bold text-slate-600">#{ticket.ticket_number}</td>
                  <td className="px-4 py-3">
                    <p className="font-bold text-slate-900 text-xs">{ticket.schools?.name ?? "—"}</p>
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-800 max-w-[200px] truncate">{ticket.subject}</td>
                  <td className="px-4 py-3 text-slate-500 font-semibold text-xs capitalize">{ticket.type ?? "general"}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${priorityBadge[ticket.priority] ?? "bg-slate-100 text-slate-500"}`}>
                      {ticket.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${statusBadge[ticket.status] ?? "bg-slate-100 text-slate-500"}`}>
                      {ticket.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 font-semibold text-xs whitespace-nowrap">
                    {new Date(ticket.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-slate-500 font-semibold text-xs">
                    {platformUsers.find(u => u.id === ticket.assigned_to)?.full_name ?? "Unassigned"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-bold text-purple-700">View</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ticket Detail Panel */}
      <SlidePanel open={detailOpen} onClose={() => setDetailOpen(false)} title={`Ticket #${selectedTicket?.ticket_number}`} subtitle={selectedTicket?.subject} width="lg">
        {selectedTicket && (
          <div className="space-y-5">
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-sm font-bold text-slate-700 mb-2">Description</p>
              <p className="text-sm font-semibold text-slate-600">{selectedTicket.description ?? "No description provided."}</p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className={`text-[11px] font-extrabold uppercase px-2.5 py-1 rounded-full ${priorityBadge[selectedTicket.priority]}`}>{selectedTicket.priority}</span>
              <span className="text-slate-400 text-xs font-semibold">{new Date(selectedTicket.created_at).toLocaleString()}</span>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Update Status</label>
              <select value={updateForm.status} onChange={e => setUpdateForm(f => ({ ...f, status: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold outline-none focus:border-purple-400 bg-white">
                {["open", "assigned", "in_progress", "resolved", "closed"].map(s => (
                  <option key={s} value={s}>{s.replace("_", " ")}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Assign To</label>
              <select value={updateForm.assignedTo} onChange={e => setUpdateForm(f => ({ ...f, assignedTo: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold outline-none focus:border-purple-400 bg-white">
                <option value="">Unassigned</option>
                {platformUsers.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Resolution Notes</label>
              <textarea value={updateForm.resolution} onChange={e => setUpdateForm(f => ({ ...f, resolution: e.target.value }))}
                placeholder="Describe how this was resolved…" rows={4}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold outline-none focus:border-purple-400 resize-none transition-colors" />
            </div>
            <button onClick={handleUpdate} disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold text-sm disabled:opacity-60"
              style={{ background: PLATFORM_GRADIENT }}>
              {saving ? <><Loader2 size={15} className="animate-spin" /> Updating…</> : "Update Ticket"}
            </button>
          </div>
        )}
      </SlidePanel>

      {/* Create Ticket Panel */}
      <SlidePanel open={createOpen} onClose={() => setCreateOpen(false)} title="Create Support Ticket">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Subject <span className="text-red-500">*</span></label>
            <input type="text" value={createForm.subject} onChange={e => setCreateForm(f => ({ ...f, subject: e.target.value }))}
              placeholder="Briefly describe the issue"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold outline-none focus:border-purple-400 transition-colors" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Description</label>
            <textarea value={createForm.description} onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Full details of the issue" rows={4}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold outline-none focus:border-purple-400 resize-none transition-colors" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Type</label>
              <select value={createForm.type} onChange={e => setCreateForm(f => ({ ...f, type: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold outline-none focus:border-purple-400 bg-white">
                {["general", "billing", "technical", "feature_request", "bug"].map(t => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Priority</label>
              <select value={createForm.priority} onChange={e => setCreateForm(f => ({ ...f, priority: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold outline-none focus:border-purple-400 bg-white">
                {["low", "normal", "high", "urgent"].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <button onClick={handleCreate} disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold text-sm disabled:opacity-60"
            style={{ background: PLATFORM_GRADIENT }}>
            {saving ? <><Loader2 size={15} className="animate-spin" /> Creating…</> : "Create Ticket"}
          </button>
        </div>
      </SlidePanel>
    </div>
  );
}
