"use client";

import { useState } from "react";
import { Plus, Loader2, UsersRound, X } from "lucide-react";
import { SlidePanel } from "@/components/ui/SlidePanel";
import { useToast } from "@/components/ui/Toast";

interface Group {
  id: string;
  name: string;
  description?: string;
  color?: string;
  member_count?: number;
  members?: Member[];
}

interface Member {
  id: string;
  full_name: string;
  email: string;
  role?: string;
}

interface PlatformUser {
  id: string;
  full_name: string;
  email: string;
  role?: string;
}

interface Props {
  groups: Group[];
  users: PlatformUser[];
}

const GROUP_COLORS = [
  "#6366f1", "#7c3aed", "#2563eb", "#059669", "#d97706", "#dc2626", "#0891b2", "#475569",
];

const inputClass =
  "w-full px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white";

function initials(name: string) {
  return (name ?? "?").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export function GroupsClient({ groups: initialGroups, users }: Props) {
  const { success, error: toastError } = useToast();
  const [groups, setGroups] = useState<Group[]>(initialGroups);
  const [createOpen, setCreateOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(false);
  const [addingMember, setAddingMember] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");

  const [form, setForm] = useState({
    name: "",
    description: "",
    color: "#6366f1",
  });

  function setF(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleCreate() {
    if (!form.name) {
      toastError("Group name is required.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/platform/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create group");
      success("Group created.");
      setGroups((prev) => [{ ...data, member_count: 0, members: [] }, ...prev]);
      setCreateOpen(false);
      setForm({ name: "", description: "", color: "#6366f1" });
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : "Failed to create group");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddMember() {
    if (!selectedGroup || !selectedUserId) return;
    setAddingMember(true);
    try {
      const res = await fetch(`/api/platform/groups/${selectedGroup.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: selectedUserId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to add member");
      const user = users.find((u) => u.id === selectedUserId);
      if (user) {
        setGroups((prev) =>
          prev.map((g) =>
            g.id === selectedGroup.id
              ? {
                  ...g,
                  member_count: (g.member_count ?? 0) + 1,
                  members: [...(g.members ?? []), user],
                }
              : g,
          ),
        );
        setSelectedGroup((sg) =>
          sg
            ? { ...sg, member_count: (sg.member_count ?? 0) + 1, members: [...(sg.members ?? []), user] }
            : sg,
        );
      }
      success("Member added.");
      setSelectedUserId("");
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : "Failed to add member");
    } finally {
      setAddingMember(false);
    }
  }

  async function handleRemoveMember(memberId: string) {
    if (!selectedGroup) return;
    try {
      const res = await fetch(
        `/api/platform/groups/${selectedGroup.id}/members?user_id=${memberId}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error("Failed to remove member");
      setGroups((prev) =>
        prev.map((g) =>
          g.id === selectedGroup.id
            ? {
                ...g,
                member_count: Math.max(0, (g.member_count ?? 1) - 1),
                members: (g.members ?? []).filter((m) => m.id !== memberId),
              }
            : g,
        ),
      );
      setSelectedGroup((sg) =>
        sg
          ? {
              ...sg,
              member_count: Math.max(0, (sg.member_count ?? 1) - 1),
              members: (sg.members ?? []).filter((m) => m.id !== memberId),
            }
          : sg,
      );
      success("Member removed.");
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : "Failed to remove member");
    }
  }

  function openMembers(group: Group) {
    setSelectedGroup(group);
    setMembersOpen(true);
  }

  const nonMembers = users.filter(
    (u) => !(selectedGroup?.members ?? []).some((m) => m.id === u.id),
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-extrabold text-slate-900 leading-tight">User Groups</h1>
          <p className="text-slate-500 text-[14px] font-semibold mt-1">{groups.length} groups</p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-[13px] font-bold transition-all shadow-sm"
          style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
        >
          <Plus size={15} />
          Create Group
        </button>
      </div>

      {/* Groups Grid */}
      {groups.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#e8e4f3] py-20 flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-violet-50 flex items-center justify-center">
            <UsersRound size={26} className="text-violet-400" />
          </div>
          <p className="text-slate-400 font-semibold text-[14px]">No groups yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group) => {
            const members = group.members ?? [];
            const displayMembers = members.slice(0, 5);
            const extras = (group.member_count ?? members.length) - displayMembers.length;

            return (
              <div
                key={group.id}
                className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] p-5"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-[16px] font-extrabold shrink-0"
                    style={{ background: group.color ?? "#6366f1" }}
                  >
                    {(group.name ?? "?")[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[15px] font-extrabold text-slate-900 truncate">{group.name}</h3>
                    {group.description && (
                      <p className="text-[12px] text-slate-400 font-semibold mt-0.5 line-clamp-2">
                        {group.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between mb-4">
                  {/* Stacked avatars */}
                  <div className="flex items-center">
                    {displayMembers.map((m, i) => (
                      <div
                        key={m.id}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[9px] font-extrabold border-2 border-white"
                        style={{
                          background: group.color ?? "#6366f1",
                          marginLeft: i > 0 ? "-8px" : 0,
                          zIndex: displayMembers.length - i,
                        }}
                        title={m.full_name}
                      >
                        {initials(m.full_name)}
                      </div>
                    ))}
                    {extras > 0 && (
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center bg-slate-100 text-slate-500 text-[9px] font-extrabold border-2 border-white"
                        style={{ marginLeft: "-8px" }}
                      >
                        +{extras}
                      </div>
                    )}
                    {(group.member_count ?? 0) === 0 && (
                      <span className="text-slate-300 text-[12px] font-semibold">No members</span>
                    )}
                  </div>
                  <span className="rounded-full text-[11px] font-bold px-2.5 py-0.5 border bg-slate-50 text-slate-600 border-slate-200">
                    {group.member_count ?? members.length} members
                  </span>
                </div>

                <button
                  onClick={() => openMembers(group)}
                  className="w-full py-2 rounded-xl text-[12px] font-bold text-violet-700 bg-violet-50 hover:bg-violet-100 transition-colors"
                >
                  Manage Members
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Group Panel */}
      <SlidePanel
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create User Group"
        subtitle="Organize users into functional groups"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-1.5">
              Group Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setF("name", e.target.value)}
              placeholder="Finance Team"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setF("description", e.target.value)}
              placeholder="Group for finance department staff…"
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white resize-none"
            />
          </div>
          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-2">Group Color</label>
            <div className="flex gap-2 flex-wrap">
              {GROUP_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setF("color", c)}
                  className="w-8 h-8 rounded-full border-2 transition-all"
                  style={{
                    background: c,
                    borderColor: form.color === c ? "#1e1b4b" : "transparent",
                    transform: form.color === c ? "scale(1.2)" : "scale(1)",
                  }}
                />
              ))}
            </div>
          </div>
          <button
            onClick={handleCreate}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold text-[13px] transition-all disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
          >
            {loading ? <><Loader2 size={14} className="animate-spin" /> Creating…</> : "Create Group"}
          </button>
        </div>
      </SlidePanel>

      {/* Manage Members Panel */}
      <SlidePanel
        open={membersOpen}
        onClose={() => setMembersOpen(false)}
        title={`Members — ${selectedGroup?.name ?? ""}`}
        subtitle="Add or remove group members"
      >
        <div className="space-y-4">
          {/* Add member */}
          <div className="bg-[#faf9ff] rounded-xl p-4 border border-[#e8e4f3]">
            <p className="text-[13px] font-bold text-slate-700 mb-3">Add Member</p>
            <div className="flex gap-2">
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className={`${inputClass} flex-1`}
              >
                <option value="">Select a user…</option>
                {nonMembers.map((u) => (
                  <option key={u.id} value={u.id}>{u.full_name} — {u.email}</option>
                ))}
              </select>
              <button
                onClick={handleAddMember}
                disabled={!selectedUserId || addingMember}
                className="px-4 h-10 rounded-xl text-white font-bold text-[12px] shrink-0 disabled:opacity-60 transition-all"
                style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
              >
                {addingMember ? <Loader2 size={14} className="animate-spin" /> : "Add"}
              </button>
            </div>
          </div>

          {/* Members list */}
          <div className="space-y-2">
            <p className="text-[13px] font-bold text-slate-700">
              Current Members ({selectedGroup?.member_count ?? 0})
            </p>
            {(selectedGroup?.members ?? []).length === 0 ? (
              <p className="text-slate-400 font-semibold text-[13px] py-6 text-center">
                No members in this group.
              </p>
            ) : (
              (selectedGroup?.members ?? []).map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-[#faf9ff] border border-[#e8e4f3]"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-extrabold shrink-0"
                    style={{ background: selectedGroup?.color ?? "#6366f1" }}
                  >
                    {initials(m.full_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 text-[13px] truncate">{m.full_name}</p>
                    <p className="text-slate-400 font-semibold text-[11px] truncate">{m.email}</p>
                  </div>
                  <button
                    onClick={() => handleRemoveMember(m.id)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all shrink-0"
                  >
                    <X size={13} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </SlidePanel>
    </div>
  );
}
