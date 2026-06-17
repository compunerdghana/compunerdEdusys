"use client";

import { useState, useEffect } from "react";
import { Plus, UserCog, Loader2, Trash2, RefreshCw, Save } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { SlidePanel } from "@/components/ui/SlidePanel";

interface GroupMember {
  user_id: string;
  profile: { id: string; full_name: string; email: string; role: string };
}

interface Group {
  id: string;
  name: string;
  description: string;
  created_at: string;
  user_group_members: GroupMember[];
}

interface ProfileUser {
  id: string;
  full_name: string;
  role: string;
}

export default function UserGroupsBoard() {
  const { success, error: toastError } = useToast();
  const [groups, setGroups] = useState<Group[]>([]);
  const [profiles, setProfiles] = useState<ProfileUser[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  async function loadData() {
    setLoading(true);
    try {
      const [groupsRes, usersRes] = await Promise.all([
        fetch("/api/school/user-management/groups").then(r => r.json()),
        fetch("/api/school/user-management/users").then(r => r.json())
      ]);

      const groupsList = groupsRes.groups || [];
      setGroups(groupsList);
      setProfiles(usersRes.users || []);

      if (groupsList.length > 0 && !selectedGroup) {
        handleSelectGroup(groupsList[0]);
      }
    } catch {
      toastError("Failed to load user groups.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  function handleSelectGroup(g: Group) {
    setSelectedGroup(g);
    setSelectedUserIds((g.user_group_members || []).map(m => m.user_id));
  }

  async function handleCreateGroup() {
    if (!form.name) {
      toastError("Group name is required.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/school/user-management/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      success(`Group '${form.name}' created successfully.`);
      setShowCreate(false);
      setForm({ name: "", description: "" });
      loadData();
    } catch (err: any) {
      toastError(err.message || "Failed to create group.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveMembers() {
    if (!selectedGroup) return;
    setSaving(true);
    try {
      const res = await fetch("/api/school/user-management/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedGroup.id,
          name: selectedGroup.name,
          description: selectedGroup.description,
          user_ids: selectedUserIds
        })
      });
      if (!res.ok) throw new Error();
      success("Group membership updated successfully.");
      loadData();
    } catch {
      toastError("Failed to update group members.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteGroup(id: string) {
    if (!confirm("Are you sure you want to delete this group?")) return;
    try {
      const res = await fetch(`/api/school/user-management/groups?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      success("Group deleted successfully.");
      setSelectedGroup(null);
      loadData();
    } catch {
      toastError("Failed to delete group.");
    }
  }

  function toggleUserSelection(userId: string) {
    setSelectedUserIds(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  }

  const inputClass = "w-full px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-extrabold text-slate-900 leading-tight">User Groups Board</h1>
          <p className="text-slate-500 text-[12px] font-semibold mt-0.5">Organize school accounts into custom groups for messaging, payroll bands, or roles.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-[13px] font-bold transition-all shadow-sm shadow-[#7c3aed]/20"
          style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
        >
          <Plus size={15} />
          Create Custom Group
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Side: Groups List */}
        <div className="lg:w-80 shrink-0 space-y-4">
          <div className="bg-white rounded-2xl border border-[#e8e4f3] shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Available Groups</p>
              <button onClick={loadData} className="p-1 text-slate-400 hover:text-slate-600 transition-colors">
                <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
              </button>
            </div>

            <div className="space-y-1">
              {groups.map((g) => (
                <div
                  key={g.id}
                  onClick={() => handleSelectGroup(g)}
                  className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center justify-between cursor-pointer ${
                    selectedGroup?.id === g.id
                      ? "bg-violet-50 border border-violet-100 text-violet-700 font-bold"
                      : "hover:bg-slate-50 text-slate-700 font-semibold"
                  }`}
                >
                  <div>
                    <span className="text-[13px]">{g.name}</span>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">{g.user_group_members?.length || 0} members</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteGroup(g.id); }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
              {groups.length === 0 && (
                <p className="text-slate-400 text-center py-6 text-[12px] font-semibold">No custom groups created.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Group Members Assignment */}
        <div className="flex-1 bg-white rounded-2xl border border-[#e8e4f3] shadow-sm overflow-hidden">
          {selectedGroup ? (
            <>
              <div className="px-6 py-4 border-b border-[#f0edf8] flex items-center justify-between bg-[#faf9ff]">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-[14px]">
                    Manage Membership — {selectedGroup.name}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
                    {selectedGroup.description || "No description provided for this group."}
                  </p>
                </div>

                <button
                  onClick={handleSaveMembers}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-[12px] font-bold transition-all disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
                >
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                  Save group list
                </button>
              </div>

              <div className="p-6">
                <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">Add / Remove School Users</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto pr-2 scrollbar-hide">
                  {profiles.map((u) => {
                    const isChecked = selectedUserIds.includes(u.id);
                    return (
                      <div
                        key={u.id}
                        onClick={() => toggleUserSelection(u.id)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                          isChecked ? "bg-violet-50/55 border-violet-200" : "bg-white border-slate-100 hover:border-slate-300"
                        }`}
                      >
                        <div>
                          <p className="text-[12.5px] font-bold text-slate-800">{u.full_name}</p>
                          <p className="text-[10px] text-slate-400 font-semibold capitalize">{u.role.replace("_", " ")}</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // toggles on parent div click
                          className="rounded border-[#e0daf0] text-[#7c3aed] focus:ring-[#7c3aed]"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="py-20 text-center text-slate-400 font-semibold text-[13px]">
              Select a group from the left panel to configure its members.
            </div>
          )}
        </div>
      </div>

      {/* Create SlidePanel */}
      <SlidePanel
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create Custom Group"
        subtitle="Add a new group segment to the user management catalog"
      >
        <div className="space-y-4 pt-2">
          <div>
            <label className="block text-[12px] font-bold text-slate-700 mb-1.5">Group Name</label>
            <input
              type="text"
              placeholder="e.g. Class Teachers Committee"
              value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-[12px] font-bold text-slate-700 mb-1.5">Description (Optional)</label>
            <textarea
              placeholder="Provide a description..."
              value={form.description}
              onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 text-[12px] border border-[#e0daf0] rounded-xl outline-none focus:border-[#7c3aed] resize-none"
            />
          </div>
          <button
            onClick={handleCreateGroup}
            disabled={saving || !form.name}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold text-[13px] transition-all disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : null}
            Create Group
          </button>
        </div>
      </SlidePanel>
    </div>
  );
}
