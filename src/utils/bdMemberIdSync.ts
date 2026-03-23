import { supabase } from "@/integrations/supabase/client";

/**
 * When a user changes their Gala ID, check if they are a BD member
 * and update their member_uuid + notify the BD owner.
 * Uses works_members exclusively.
 */
export async function syncBdMemberIdChange(oldUuid: string, newUuid: string, userName: string) {
  try {
    const { data: worksMembers, error: wErr } = await supabase
      .from("works_members")
      .select("id, works_id, member_name")
      .eq("member_uuid", oldUuid);

    if (wErr || !worksMembers || worksMembers.length === 0) return;

    for (const member of worksMembers) {
      // Update member_uuid
      await (supabase.from("works_members") as any)
        .update({ member_uuid: newUuid, member_name: userName || member.member_name })
        .eq("id", member.id);

      // Get BD owner uuid from works_accounts
      const { data: acc } = await supabase
        .from("works_accounts")
        .select("user_uuid")
        .eq("id", member.works_id)
        .maybeSingle();

      if (acc?.user_uuid) {
        await supabase.from("notifications").insert({
          user_uuid: acc.user_uuid,
          title: "🔄 تغيير آيدي عضو",
          body: `قام عضوك ${userName || member.member_name} بتغيير آيديه من ${oldUuid} إلى ${newUuid}. تم تحديث السجلات تلقائياً.`,
          target: "user",
        });
      }
    }
  } catch (err) {
    console.error("Failed to sync BD member ID change:", err);
  }
}