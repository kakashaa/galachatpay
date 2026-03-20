const API = "https://galachat.site/project-z/api.php";

/**
 * Send a WhatsApp notification to a user via the external API.
 * Fails silently — never blocks the main flow.
 */
export async function sendWhatsAppNotification(phone: string, message: string): Promise<void> {
  if (!phone || !phone.trim()) return;

  try {
    await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "wa_notify",
        admin_key: "ghala2026owner",
        phone: phone.trim(),
        message,
      }),
    });
  } catch {
    // Silent — WhatsApp notification is non-critical
  }
}
