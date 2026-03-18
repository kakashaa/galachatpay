import { supabase } from "@/integrations/supabase/client";

export async function sendUserNotification(
  userUuid: string,
  title: string,
  body: string,
  type?: string
) {
  try {
    await supabase.from("notifications").insert({
      user_uuid: userUuid,
      title,
      body,
      target: "user",
      is_read: false,
    } as any);
  } catch (error) {
    console.error("Failed to send notification:", error);
  }
}
