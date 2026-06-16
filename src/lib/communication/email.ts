/**
 * Email sending utility for the CompunerdEduSys Communication Center.
 * Uses SMTP (nodemailer-compatible) or falls back to Supabase Auth email.
 * Settings are read from communication_settings table via caller.
 */

interface EmailMessage {
  to: string;
  to_name?: string;
  subject: string;
  body: string;       // plain text or HTML
  is_html?: boolean;
  reply_to?: string;
}

interface EmailResult {
  success: boolean;
  message_id?: string;
  error?: string;
}

interface SMTPConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  from_name?: string;
  from_email?: string;
  secure?: boolean;
}

/**
 * Send an email via fetch to our own /api/platform/communication/email/send endpoint,
 * which handles the actual SMTP transport server-side using env vars or DB settings.
 */
export async function sendEmail(config: SMTPConfig, msg: EmailMessage): Promise<EmailResult> {
  try {
    const from = `${config.from_name ?? "CompunerdEduSys"} <${config.from_email ?? config.user}>`;

    // nodemailer must be installed separately: npm i nodemailer
    // Inline require so Next.js bundler does not statically analyse it.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    let nodemailer: typeof import("nodemailer") | null = null;
    try { nodemailer = require("nodemailer"); } catch { /* not installed */ }

    if (!nodemailer) {
      return {
        success: false,
        error: "Email transport not available. Run: npm i nodemailer",
      };
    }

    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure ?? config.port === 465,
      auth: { user: config.user, pass: config.password },
    });

    const info = await transporter.sendMail({
      from,
      to: msg.to_name ? `${msg.to_name} <${msg.to}>` : msg.to,
      subject: msg.subject,
      ...(msg.is_html ? { html: msg.body } : { text: msg.body }),
      replyTo: msg.reply_to,
    });

    return { success: true, message_id: info.messageId };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

/**
 * Send email via Resend API (recommended provider).
 */
export async function sendResendEmail(api_key: string, from_email: string, msg: EmailMessage): Promise<EmailResult> {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${api_key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: from_email,
        to: msg.to,
        subject: msg.subject,
        ...(msg.is_html ? { html: msg.body } : { text: msg.body }),
      }),
    });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.message ?? "Resend error" };
    return { success: true, message_id: json.id };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

/**
 * Unified send function — picks provider based on config.
 */
export async function sendPlatformEmail(
  provider: string,
  config: Record<string, string>,
  msg: EmailMessage,
): Promise<EmailResult> {
  switch (provider) {
    case "resend":
      return sendResendEmail(config.api_key, config.from_email ?? "noreply@compunerd.com", msg);
    case "smtp":
    default:
      return sendEmail(
        {
          host: config.host ?? "smtp.gmail.com",
          port: Number(config.port ?? 587),
          user: config.user ?? "",
          password: config.password ?? "",
          from_name: config.from_name ?? "CompunerdEduSys",
          from_email: config.from_email ?? config.user,
        },
        msg,
      );
  }
}
