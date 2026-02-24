import { supabase } from "@/integrations/supabase/client";

/**
 * When a user changes their Gala ID, check if they are a BD member
 * and update their member_uuid + notify the BD owner.
 */
export async function syncBdMemberIdChange(oldUuid: string, newUuid: string, userName: string) {
  try {
    // Check if this user is a member in any BD
    const { data: members, error } = await supabase
      .from("bd_members")
      .select("id, bd_uuid, member_name")
      .eq("member_uuid", oldUuid);

    if (error || !members || members.length === 0) return;

    for (const member of members) {
      // Update member_uuid
      await supabase
        .from("bd_members")
        .update({ member_uuid: newUuid, member_name: userName || member.member_name })
        .eq("id", member.id);

      // Notify the BD owner
      await supabase.from("notifications").insert({
        user_uuid: member.bd_uuid,
        title: "🔄 تغيير آيدي عضو",
        body: `قام عضوك ${userName || member.member_name} بتغيير آيديه من ${oldUuid} إلى ${newUuid}. تم تحديث السجلات تلقائياً.`,
        target: "user",
      });
    }
  } catch (err) {
    console.error("Failed to sync BD member ID change:", err);
  }
}
