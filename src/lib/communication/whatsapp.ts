interface WhatsAppTextMessage {
  phone_id: string;
  token: string;
  to: string;
  message: string;
}

interface WhatsAppTemplateMessage {
  phone_id: string;
  token: string;
  to: string;
  template_name: string;
  language: string;
  components?: object[];
}

interface WhatsAppResult {
  success: boolean;
  message_id?: string;
  error?: string;
}

const META_API = "https://graph.facebook.com/v19.0";

export async function sendWhatsAppText({ phone_id, token, to, message }: WhatsAppTextMessage): Promise<WhatsAppResult> {
  try {
    const res = await fetch(`${META_API}/${phone_id}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: normalizePhone(to),
        type: "text",
        text: { preview_url: false, body: message },
      }),
    });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.error?.message ?? "WhatsApp API error" };
    return { success: true, message_id: json.messages?.[0]?.id };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function sendWhatsAppTemplate({ phone_id, token, to, template_name, language = "en", components }: WhatsAppTemplateMessage): Promise<WhatsAppResult> {
  try {
    const res = await fetch(`${META_API}/${phone_id}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: normalizePhone(to),
        type: "template",
        template: { name: template_name, language: { code: language }, components: components ?? [] },
      }),
    });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.error?.message ?? "WhatsApp API error" };
    return { success: true, message_id: json.messages?.[0]?.id };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0") && digits.length === 10) return "233" + digits.slice(1);
  if (!digits.startsWith("233") && digits.length === 9) return "233" + digits;
  return digits;
}

export function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
}
