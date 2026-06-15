interface SMSResult {
  success: boolean;
  message_id?: string;
  error?: string;
}

// ── Arkesel ──────────────────────────────────────────────────────────────────

export async function sendArkeselSMS(api_key: string, sender: string, to: string, message: string): Promise<SMSResult> {
  try {
    const params = new URLSearchParams({
      action: "send-sms", api_key, to: normalizeGhanaPhone(to), from: sender, sms: message,
    });
    const res = await fetch(`https://sms.arkesel.com/sms/api?${params}`);
    const json = await res.json();
    if (json.status === "success") return { success: true, message_id: json.data?.id };
    return { success: false, error: json.message ?? "Arkesel error" };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

// ── Hubtel ────────────────────────────────────────────────────────────────────

export async function sendHubtelSMS(api_key: string, sender: string, to: string, message: string): Promise<SMSResult> {
  try {
    const [clientId, clientSecret] = api_key.split(":");
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const res = await fetch("https://smsc.hubtel.com/v1/messages/send", {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
      body: JSON.stringify({ From: sender, To: normalizeGhanaPhone(to), Content: message }),
    });
    const json = await res.json();
    if (json.status === 0) return { success: true, message_id: json.data?.messageId };
    return { success: false, error: json.message ?? "Hubtel error" };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

function normalizeGhanaPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0") && digits.length === 10) return "+233" + digits.slice(1);
  if (!digits.startsWith("233") && digits.length === 9) return "+233" + digits;
  if (digits.startsWith("233")) return "+" + digits;
  return phone;
}

export async function sendSMS(provider: string, api_key: string, sender: string, to: string, message: string): Promise<SMSResult> {
  switch (provider) {
    case "hubtel": return sendHubtelSMS(api_key, sender, to, message);
    case "arkesel":
    default: return sendArkeselSMS(api_key, sender, to, message);
  }
}
