import { createClient } from "@supabase/supabase-js";

const getAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

interface NotifyOptions {
  school_id: string;
  recipient_id: string;
  title: string;
  body?: string;
  type?: "info" | "success" | "warning" | "danger" | "urgent";
  category?: string;
  link?: string;
  created_by?: string;
}

export async function notify(opts: NotifyOptions) {
  const admin = getAdmin();
  const { error } = await admin.from("notifications").insert({
    school_id: opts.school_id,
    recipient_id: opts.recipient_id,
    title: opts.title,
    body: opts.body ?? null,
    type: opts.type ?? "info",
    category: opts.category ?? "general",
    link: opts.link ?? null,
    created_by: opts.created_by ?? null,
  });
  return error;
}

export async function notifyMany(recipients: string[], opts: Omit<NotifyOptions, "recipient_id">) {
  if (recipients.length === 0) return null;
  const admin = getAdmin();
  const rows = recipients.map((recipient_id) => ({
    school_id: opts.school_id,
    recipient_id,
    title: opts.title,
    body: opts.body ?? null,
    type: opts.type ?? "info",
    category: opts.category ?? "general",
    link: opts.link ?? null,
    created_by: opts.created_by ?? null,
  }));
  const { error } = await admin.from("notifications").insert(rows);
  return error;
}

export async function notifyRole(school_id: string, role: string, opts: Omit<NotifyOptions, "recipient_id" | "school_id">) {
  const admin = getAdmin();
  const { data: profiles } = await admin.from("profiles")
    .select("id").eq("school_id", school_id).eq("role", role).eq("is_active", true);
  if (!profiles?.length) return null;
  return notifyMany(profiles.map((p) => p.id), { school_id, ...opts });
}
