"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import {
  MessageSquare, Megaphone, FileText, Smartphone, Inbox,
  AlertTriangle, X, Check, Send, Trash2, Users, User,
  GraduationCap, UserCog, ChevronDown, Share2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Classroom { id: string; name: string; level?: string }

interface Message {
  id: string;
  school_id: string;
  sender_id: string | null;
  title: string;
  body: string;
  type: string;
  target_type: string;
  target_id: string | null;
  sent_at: string;
  created_at: string;
  sender?: { full_name: string } | null;
}

interface Props {
  schoolId: string;
  userId: string;
  userRole: string;
  isAdmin: boolean;
  classes: Classroom[];
}

type TabType = "announcements" | "notices" | "sms_blast" | "inbox";

// ─── Migration SQL ────────────────────────────────────────────────────────────

const MIGRATION_SQL = `-- Run this in your Supabase SQL editor
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT DEFAULT 'announcement',
  target_type TEXT DEFAULT 'all',
  target_id UUID,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "school_members_read_messages" ON messages FOR SELECT
  USING (school_id IN (SELECT school_id FROM profiles WHERE id = auth.uid()));

CREATE TABLE IF NOT EXISTS message_reads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, user_id)
);
ALTER TABLE message_reads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_reads" ON message_reads FOR ALL USING (user_id = auth.uid());`;

function MigrationBanner({ onDismiss }: { onDismiss: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
          <AlertTriangle size={17} className="text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-amber-900 text-[14px]">Database tables not ready</p>
          <p className="text-[13px] text-amber-700 mt-0.5">Run the migration SQL in your Supabase dashboard to enable the communications feature.</p>
        </div>
        <button onClick={onDismiss} className="text-amber-500 hover:text-amber-700 shrink-0"><X size={16} /></button>
      </div>
      <pre className="text-[11px] bg-white border border-amber-200 rounded-xl p-3 overflow-x-auto text-amber-900 leading-relaxed whitespace-pre">{MIGRATION_SQL}</pre>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => { navigator.clipboard.writeText(MIGRATION_SQL); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      >
        {copied ? <><Check size={13} /> Copied!</> : "Copy SQL"}
      </Button>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function typeIcon(type: string) {
  switch (type) {
    case "announcement": return <Megaphone size={15} />;
    case "notice": return <FileText size={15} />;
    case "sms_blast": return <Smartphone size={15} />;
    default: return <MessageSquare size={15} />;
  }
}

function typeColor(type: string): string {
  switch (type) {
    case "announcement": return "bg-blue-100 text-blue-700";
    case "notice": return "bg-violet-100 text-violet-700";
    case "sms_blast": return "bg-emerald-100 text-emerald-700";
    default: return "bg-gray-100 text-gray-600";
  }
}

function targetLabel(msg: Message): string {
  switch (msg.target_type) {
    case "all": return "Everyone";
    case "staff": return "All Staff";
    case "student": return "All Students";
    case "class": return "Specific Class";
    default: return msg.target_type;
  }
}

// ─── Message Card ─────────────────────────────────────────────────────────────

function MessageCard({
  msg, onView, onDelete, canDelete, showWhatsApp,
}: {
  msg: Message;
  onView: (msg: Message) => void;
  onDelete: (id: string) => void;
  canDelete: boolean;
  showWhatsApp?: boolean;
}) {
  function handleWhatsApp(e: React.MouseEvent) {
    e.stopPropagation();
    const text = encodeURIComponent(`${msg.title}\n\n${msg.body}`);
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
  }

  return (
    <div
      className="rounded-xl border border-[var(--border)] bg-white px-4 py-4 flex items-start gap-3 hover:border-[#262262]/20 hover:shadow-sm transition-all cursor-pointer group"
      onClick={() => onView(msg)}
    >
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5", typeColor(msg.type))}>
        {typeIcon(msg.type)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[15px] font-semibold text-[var(--text-strong)] truncate leading-tight">{msg.title}</p>
          <span className="text-[12px] text-[var(--text-muted)] shrink-0 mt-0.5">{timeAgo(msg.sent_at)}</span>
        </div>
        <p className="text-[13px] text-[var(--text-muted)] mt-1 line-clamp-2 leading-relaxed">{msg.body}</p>
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          {msg.sender?.full_name && (
            <span className="text-[12px] text-[var(--text-muted)] flex items-center gap-1">
              <User size={11} />
              {msg.sender.full_name}
            </span>
          )}
          <span className="text-[12px] text-[var(--text-muted)] flex items-center gap-1">
            <Users size={11} />
            {targetLabel(msg)}
          </span>
          {showWhatsApp && (
            <button
              onClick={handleWhatsApp}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] font-semibold text-white transition-all hover:opacity-90 shrink-0"
              style={{ background: "#25D366" }}
            >
              <Share2 size={11} /> Share via WhatsApp
            </button>
          )}
        </div>
      </div>
      {canDelete && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(msg.id); }}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-red-50 hover:text-red-600 transition-all opacity-0 group-hover:opacity-100 shrink-0 mt-0.5"
        >
          <Trash2 size={13} />
        </button>
      )}
    </div>
  );
}

// ─── Compose Panel ────────────────────────────────────────────────────────────

function ComposePanel({
  messageType,
  classes,
  schoolId,
  userId,
  onSent,
  tableNotReady,
}: {
  messageType: string;
  classes: Classroom[];
  schoolId: string;
  userId: string;
  onSent: (msg: Message) => void;
  tableNotReady: boolean;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [targetType, setTargetType] = useState("all");
  const [targetId, setTargetId] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSend() {
    if (!title.trim() || !body.trim()) return;
    setSending(true);
    setError(null);
    const res = await fetch("/api/admin/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        school_id: schoolId,
        sender_id: userId,
        title: title.trim(),
        body: body.trim(),
        type: messageType,
        target_type: targetType,
        target_id: targetType === "class" ? (targetId || null) : null,
      }),
    });
    const json = await res.json();
    setSending(false);
    if (json.error) { setError(json.error); return; }
    if (json.tableNotReady) { setError("Database tables not ready. Run the migration SQL above first."); return; }
    if (json.data) {
      onSent(json.data as Message);
      setTitle("");
      setBody("");
      setTargetType("all");
      setTargetId("");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
    }
  }

  const typeLabel = messageType === "announcement" ? "Announcement"
    : messageType === "notice" ? "Notice"
    : "SMS Blast";

  return (
    <div className="rounded-2xl border-2 border-dashed border-[#262262]/20 p-6 space-y-4 bg-[#262262]/[0.015]">
      <p className="text-[15px] font-semibold text-[var(--text-strong)]">Compose {typeLabel}</p>

      <Input
        label="Title"
        placeholder={`${typeLabel} title…`}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        disabled={tableNotReady}
      />

      <div className="space-y-1.5">
        <label className="block text-[13px] font-medium text-[var(--text-muted)]">Message</label>
        <textarea
          rows={5}
          placeholder="Write your message here…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          disabled={tableNotReady}
          className="w-full rounded-xl border border-[var(--border)] px-4 py-3 text-[14px] text-[var(--text-strong)] placeholder:text-[var(--text-muted)] bg-white resize-none focus:outline-none focus:ring-2 focus:ring-[#262262]/20 focus:border-[#262262]/40 transition disabled:opacity-50"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Select
          label="Send to"
          options={[
            { value: "all", label: "Everyone" },
            { value: "staff", label: "All Staff" },
            { value: "student", label: "All Students" },
            { value: "class", label: "Specific Class" },
          ]}
          value={targetType}
          onChange={(e) => { setTargetType(e.target.value); setTargetId(""); }}
          disabled={tableNotReady}
        />
        {targetType === "class" && (
          <Select
            label="Class"
            placeholder="— Select class —"
            options={classes.map((c) => ({ value: c.id, label: c.name + (c.level ? ` (${c.level})` : "") }))}
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            disabled={tableNotReady}
          />
        )}
      </div>

      {error && (
        <div className="text-[12px] text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
          {error}
        </div>
      )}

      {success && (
        <div className="text-[12px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 flex items-center gap-1.5">
          <Check size={13} /> {typeLabel} sent successfully!
        </div>
      )}

      <Button
        variant="primary"
        size="sm"
        loading={sending}
        disabled={!title.trim() || !body.trim() || tableNotReady}
        onClick={handleSend}
      >
        <Send size={14} /> Send {typeLabel}
      </Button>
    </div>
  );
}

// ─── Message Detail Modal ─────────────────────────────────────────────────────

function MessageModal({ msg, onClose }: { msg: Message; onClose: () => void }) {
  return (
    <Modal open={true} onClose={onClose} title={msg.title} size="md">
      <div className="space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold", typeColor(msg.type))}>
            {typeIcon(msg.type)}
            {msg.type.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
          </span>
          <span className="text-[12px] text-[var(--text-muted)] flex items-center gap-1">
            <Users size={11} /> {targetLabel(msg)}
          </span>
          {msg.sender?.full_name && (
            <span className="text-[12px] text-[var(--text-muted)] flex items-center gap-1">
              <User size={11} /> {msg.sender.full_name}
            </span>
          )}
          <span className="text-[12px] text-[var(--text-muted)] ml-auto">{new Date(msg.sent_at).toLocaleString()}</span>
        </div>
        <div className="prose prose-sm max-w-none">
          <p className="text-[14px] text-[var(--text-body)] leading-relaxed whitespace-pre-wrap">{msg.body}</p>
        </div>
        <div className="pt-2 flex justify-end">
          <Button variant="secondary" size="sm" onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Message List ─────────────────────────────────────────────────────────────

function MessageList({
  messages,
  loading,
  emptyIcon,
  emptyLabel,
  emptyHint,
  onView,
  onDelete,
  canDelete,
  showWhatsApp,
}: {
  messages: Message[];
  loading: boolean;
  emptyIcon: React.ReactNode;
  emptyLabel: string;
  emptyHint: string;
  onView: (msg: Message) => void;
  onDelete: (id: string) => void;
  canDelete: boolean;
  showWhatsApp?: boolean;
}) {
  if (loading) {
    return <div className="text-[14px] text-[var(--text-muted)] py-8 text-center">Loading…</div>;
  }
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
        <div className="w-10 h-10 rounded-2xl bg-[var(--neutral-100)] flex items-center justify-center text-[var(--text-muted)]">
          {emptyIcon}
        </div>
        <p className="font-semibold text-[var(--text-strong)] text-[15px]">{emptyLabel}</p>
        <p className="text-[14px] text-[var(--text-muted)] max-w-xs">{emptyHint}</p>
      </div>
    );
  }
  return (
    <div className="space-y-2.5">
      {messages.map((msg) => (
        <MessageCard key={msg.id} msg={msg} onView={onView} onDelete={onDelete} canDelete={canDelete} showWhatsApp={showWhatsApp} />
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const TABS: { id: TabType; label: string; icon: React.ReactNode; msgType: string }[] = [
  { id: "announcements", label: "Announcements", icon: <Megaphone size={14} />, msgType: "announcement" },
  { id: "notices",       label: "Notices",       icon: <FileText size={14} />,  msgType: "notice" },
  { id: "sms_blast",    label: "SMS Blast",      icon: <Smartphone size={14} />, msgType: "sms_blast" },
  { id: "inbox",        label: "Inbox",           icon: <Inbox size={14} />,     msgType: "all" },
];

export function CommunicationClient({ schoolId, userId, userRole, isAdmin, classes }: Props) {
  const [activeTab, setActiveTab] = useState<TabType>("announcements");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [tableNotReady, setTableNotReady] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [viewingMsg, setViewingMsg] = useState<Message | null>(null);

  const currentTab = TABS.find((t) => t.id === activeTab)!;

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ schoolId });
    if (activeTab !== "inbox") params.set("type", currentTab.msgType);
    const res = await fetch(`/api/admin/messages?${params}`);
    const json = await res.json();
    setLoading(false);
    if (json.tableNotReady) { setTableNotReady(true); return; }
    if (json.data) setMessages(json.data as Message[]);
  }, [schoolId, activeTab, currentTab.msgType]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  function handleSent(msg: Message) {
    setMessages((prev) => [msg, ...prev]);
  }

  async function handleDelete(id: string) {
    await fetch(`/api/admin/messages?id=${id}`, { method: "DELETE" });
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }

  const filteredMessages = activeTab === "inbox"
    ? messages
    : messages.filter((m) => m.type === currentTab.msgType);

  const emptyMeta: Record<TabType, { icon: React.ReactNode; label: string; hint: string }> = {
    announcements: {
      icon: <Megaphone size={20} />,
      label: "No announcements yet",
      hint: isAdmin ? "Write your first announcement above." : "No announcements have been posted yet.",
    },
    notices: {
      icon: <FileText size={20} />,
      label: "No notices yet",
      hint: isAdmin ? "Post a notice using the form above." : "No notices have been posted yet.",
    },
    sms_blast: {
      icon: <Smartphone size={20} />,
      label: "No SMS blasts yet",
      hint: isAdmin ? "Send your first SMS blast above." : "No SMS blasts have been sent yet.",
    },
    inbox: {
      icon: <Inbox size={20} />,
      label: "Inbox is empty",
      hint: "All school messages will appear here.",
    },
  };
  const meta = emptyMeta[activeTab];

  const showTargetIcon = (type: string) => {
    switch (type) {
      case "staff": return <UserCog size={10} />;
      case "student": return <GraduationCap size={10} />;
      default: return <Users size={10} />;
    }
  };
  void showTargetIcon; // used in MessageCard via targetLabel helper

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-[22px] font-extrabold text-[var(--text-strong)]">Communications</h2>
          <p className="text-[14px] text-[var(--text-muted)] mt-0.5">Send announcements, notices, and messages to your school community.</p>
        </div>
        <div className="flex items-center gap-2 text-[12px] text-[var(--text-muted)] bg-white border border-[var(--border)] rounded-xl px-3 py-1.5">
          <span className="capitalize font-medium text-[var(--text-body)]">{userRole.replace("_", " ")}</span>
          <ChevronDown size={11} />
        </div>
      </div>

      {/* Migration banner */}
      {tableNotReady && !bannerDismissed && (
        <MigrationBanner onDismiss={() => setBannerDismissed(true)} />
      )}

      {/* Main card */}
      <div className="bg-white rounded-2xl border border-[var(--border)] shadow-[0_1px_6px_rgba(0,0,0,0.05)]">
        {/* Tab bar */}
        <div className="flex border-b border-[var(--border)] px-5 pt-1 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-3 text-[14px] font-semibold border-b-2 -mb-px transition-colors shrink-0",
                activeTab === tab.id
                  ? "border-[#262262] text-[#262262]"
                  : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-strong)]",
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab body */}
        <div className="p-5 space-y-4">
          {/* Compose panel (not in inbox) */}
          {activeTab !== "inbox" && isAdmin && (
            <ComposePanel
              messageType={currentTab.msgType}
              classes={classes}
              schoolId={schoolId}
              userId={userId}
              onSent={handleSent}
              tableNotReady={tableNotReady}
            />
          )}

          {/* SMS Blast note */}
          {activeTab === "sms_blast" && (
            <div className="flex items-start gap-2.5 rounded-xl bg-emerald-50 border border-emerald-100 px-3.5 py-3 text-[12px] text-emerald-800">
              <Smartphone size={14} className="shrink-0 mt-0.5 text-emerald-600" />
              <span><strong>SMS sending is simulated.</strong> In production, integrate your SMS provider (e.g. Arkesel, Hubtel) to deliver real SMS messages to parents and staff.</span>
            </div>
          )}

          {/* Divider when compose is shown */}
          {activeTab !== "inbox" && isAdmin && (
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-[var(--border)]" />
              <span className="text-[11px] text-[var(--text-muted)] font-medium uppercase tracking-wide">Recent</span>
              <div className="h-px flex-1 bg-[var(--border)]" />
            </div>
          )}

          <MessageList
            messages={filteredMessages}
            loading={loading}
            emptyIcon={meta.icon}
            emptyLabel={meta.label}
            emptyHint={meta.hint}
            onView={setViewingMsg}
            onDelete={handleDelete}
            canDelete={isAdmin}
            showWhatsApp={activeTab === "announcements"}
          />
        </div>
      </div>

      {/* Message detail modal */}
      {viewingMsg && (
        <MessageModal msg={viewingMsg} onClose={() => setViewingMsg(null)} />
      )}
    </div>
  );
}
