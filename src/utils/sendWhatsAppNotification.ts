import { galaApi } from "@/services/galaApi";

/**
 * Send a WhatsApp notification to a user via the proxy API.
 * Fails silently — never blocks the main flow.
 */
export async function sendWhatsAppNotification(phone: string, message: string): Promise<void> {
  if (!phone || !phone.trim()) return;

  try {
    await galaApi.sendWhatsApp(phone.trim(), message);
  } catch {
    // Silent — WhatsApp notification is non-critical
  }
}
