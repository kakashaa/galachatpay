import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GALA_API = "https://hola-chat.com/project-z/api.php";
const ADMIN_KEY = Deno.env.get("ADMIN_KEY") || "ghala2026owner";

// Get current Saudi time (UTC+3)
function getSaudiTime(): { hours: number; minutes: number; timeStr: string } {
  const now = new Date();
  const saudi = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  const hours = saudi.getUTCHours();
  const minutes = saudi.getUTCMinutes();
  return { hours, minutes, timeStr: `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}` };
}

// Check if current time is within a shift (handles midnight crossing)
function isInShift(currentHours: number, currentMinutes: number, startStr: string, endStr: string): boolean {
  const [sh, sm] = startStr.split(":").map(Number);
  const [eh, em] = endStr.split(":").map(Number);
  const current = currentHours * 60 + currentMinutes;
  const start = sh * 60 + sm;
  const end = eh * 60 + em;

  if (start < end) {
    return current >= start && current < end;
  } else {
    // Crosses midnight (e.g., 21:00-00:00 or 17:00-01:00)
    return current >= start || current < end;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, ...params } = body;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { hours, minutes } = getSaudiTime();
    let result: unknown;

    switch (action) {
      // Get current on-duty admin for a given role type
      case "get_on_duty": {
        const { role_type } = params; // 'admin' or 'super_admin'
        const { data: shifts } = await supabase
          .from("admin_shifts")
          .select("*")
          .eq("role_type", role_type || "admin")
          .eq("is_active", true);

        const onDuty = (shifts || []).find((s: any) =>
          isInShift(hours, minutes, s.shift_start, s.shift_end)
        );
        result = onDuty || null;
        break;
      }

      // Start a support session
      case "start_session": {
        const { user_uuid, user_name, support_level, request_type, notes, file_url, file_type } = params;
        if (!user_uuid) throw new Error("user_uuid required");

        // Find the right admin based on support level
        const roleType = (support_level || 1) === 2 ? "super_admin" : "admin";
        const { data: shifts } = await supabase
          .from("admin_shifts")
          .select("*")
          .eq("role_type", roleType)
          .eq("is_active", true);

        const onDuty = (shifts || []).find((s: any) =>
          isInShift(hours, minutes, s.shift_start, s.shift_end)
        );

        const { data: session, error } = await supabase
          .from("support_sessions")
          .insert({
            user_uuid,
            user_name: user_name || "",
            support_level: support_level || 1,
            request_type: request_type || null,
            assigned_admin: onDuty?.admin_username || null,
            assigned_admin_name: onDuty?.admin_display_name || null,
            status: "waiting",
            notes: notes || null,
            file_url: file_url || null,
            file_type: file_type || null,
          })
          .select()
          .single();

        if (error) throw error;

        // Add assigned admin as participant
        if (onDuty) {
          await supabase.from("support_session_participants").insert({
            session_id: session.id,
            admin_username: onDuty.admin_username,
            admin_display_name: onDuty.admin_display_name,
            role_type: onDuty.role_type,
          });
        }

        // System welcome message
        const welcomeMsg = support_level === 2
          ? `🆘 دعم سريع — تم توجيهك لـ ${onDuty?.admin_display_name || "المسؤول المناوب"}`
          : support_level === 3
          ? `📋 طلب جديد — ${request_type || "طلب"}`
          : `مرحباً ${user_name || ""}! تم توجيهك لـ ${onDuty?.admin_display_name || "فريق الدعم"}. انتظر قليلاً...`;

        await supabase.from("support_session_messages").insert({
          session_id: session.id,
          sender_uuid: "system",
          sender_name: "النظام",
          sender_type: "system",
          message: welcomeMsg,
        });

        // Send WhatsApp alert to on-duty admin
        if (onDuty?.phone_number) {
          const levelLabel = support_level === 2 ? "🆘 دعم سريع" : support_level === 3 ? "📋 طلب مضيفة" : "💬 محادثة دعم";
          try {
            await fetch(GALA_API, {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: new URLSearchParams({
                action: "send_whatsapp",
                admin_key: ADMIN_KEY,
                phone: onDuty.phone_number,
                message: `${levelLabel}\nالمستخدم: ${user_name || user_uuid}\nالرجاء الرد فوراً!`,
              }),
            });
          } catch { /* silent */ }
        }

        result = session;
        break;
      }

      // Send a message in a session
      case "send_message": {
        const { session_id, sender_uuid, sender_name, sender_type, message, attachment_url } = params;
        if (!session_id || !message) throw new Error("session_id and message required");

        const { error } = await supabase.from("support_session_messages").insert({
          session_id,
          sender_uuid: sender_uuid || "unknown",
          sender_name: sender_name || "",
          sender_type: sender_type || "user",
          message,
          attachment_url: attachment_url || null,
        });
        if (error) throw error;

        // Update session last_message_at and status
        await supabase.from("support_sessions").update({
          last_message_at: new Date().toISOString(),
          status: "active",
          updated_at: new Date().toISOString(),
        }).eq("id", session_id);

        result = { success: true };
        break;
      }

      // Get messages for a session
      case "get_messages": {
        const { session_id } = params;
        const { data, error } = await supabase
          .from("support_session_messages")
          .select("*")
          .eq("session_id", session_id)
          .order("created_at", { ascending: true });
        if (error) throw error;
        result = data;
        break;
      }

      // List sessions (for admin)
      case "list_sessions": {
        const { admin_username, status, support_level } = params;
        let query = supabase
          .from("support_sessions")
          .select("*, support_session_participants(*)")
          .order("created_at", { ascending: false })
          .limit(100);

        if (status) query = query.eq("status", status);
        if (support_level) query = query.eq("support_level", support_level);
        if (admin_username) {
          // Show sessions assigned to this admin OR where they are a participant
          query = query.or(`assigned_admin.eq.${admin_username}`);
        }

        const { data, error } = await query;
        if (error) throw error;
        result = data;
        break;
      }

      // Escalate a session
      case "escalate": {
        const { session_id, escalation_level } = params;
        const { data: session } = await supabase
          .from("support_sessions")
          .select("*")
          .eq("id", session_id)
          .single();

        if (!session) throw new Error("Session not found");

        const newLevel = escalation_level || (session.escalation_level + 1);

        // Find who to escalate to
        let targetRoleType = "super_admin";
        if (newLevel >= 3) targetRoleType = "owner";
        else if (newLevel >= 2) targetRoleType = "moderator";

        // Get on-duty for that role
        let escalationTargets: any[] = [];
        if (newLevel >= 2) {
          // Get all moderators
          const { data: mods } = await supabase
            .from("admin_accounts")
            .select("username, display_name")
            .eq("is_active", true)
            .in("role", ["super_admin", "admin"]);
          escalationTargets = mods || [];
        } else {
          const { data: shifts } = await supabase
            .from("admin_shifts")
            .select("*")
            .eq("role_type", "super_admin")
            .eq("is_active", true);
          const onDuty = (shifts || []).find((s: any) =>
            isInShift(hours, minutes, s.shift_start, s.shift_end)
          );
          if (onDuty) escalationTargets = [onDuty];
        }

        // Update session
        await supabase.from("support_sessions").update({
          escalation_level: newLevel,
          status: "escalated",
          updated_at: new Date().toISOString(),
        }).eq("id", session_id);

        // Add participants and send WhatsApp
        for (const target of escalationTargets) {
          const username = target.admin_username || target.username;
          const displayName = target.admin_display_name || target.display_name || username;
          
          await supabase.from("support_session_participants").upsert({
            session_id,
            admin_username: username,
            admin_display_name: displayName,
            role_type: targetRoleType,
          }, { onConflict: "session_id,admin_username" });

          if (target.phone_number) {
            try {
              await fetch(GALA_API, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({
                  action: "send_whatsapp",
                  admin_key: ADMIN_KEY,
                  phone: target.phone_number,
                  message: `⚠️ تصعيد دعم!\nالمستخدم: ${session.user_name} (${session.user_uuid})\n${session.room_name ? `الغرفة: ${session.room_name}\n` : ""}الرجاء الدخول فوراً!`,
                }),
              });
            } catch { /* silent */ }
          }
        }

        // System message
        await supabase.from("support_session_messages").insert({
          session_id,
          sender_uuid: "system",
          sender_name: "النظام",
          sender_type: "system",
          message: `⚠️ تم التصعيد — المستوى ${newLevel}`,
        });

        result = { success: true, escalation_level: newLevel };
        break;
      }

      // Add participant to session
      case "add_participant": {
        const { session_id, admin_username, admin_display_name, role_type } = params;
        const { error } = await supabase.from("support_session_participants").upsert({
          session_id,
          admin_username,
          admin_display_name: admin_display_name || admin_username,
          role_type: role_type || "admin",
        }, { onConflict: "session_id,admin_username" });
        if (error) throw error;

        await supabase.from("support_session_messages").insert({
          session_id,
          sender_uuid: "system",
          sender_name: "النظام",
          sender_type: "system",
          message: `انضم ${admin_display_name || admin_username} للمحادثة`,
        });

        result = { success: true };
        break;
      }

      // Resolve/close session
      case "resolve_session": {
        const { session_id, admin_note } = params;
        await supabase.from("support_sessions").update({
          status: "resolved",
          admin_note: admin_note || null,
          resolved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("id", session_id);

        await supabase.from("support_session_messages").insert({
          session_id,
          sender_uuid: "system",
          sender_name: "النظام",
          sender_type: "system",
          message: "✅ تم إغلاق المحادثة",
        });

        result = { success: true };
        break;
      }

      // Update room name (for SOS escalation)
      case "update_room_name": {
        const { session_id, room_name } = params;
        await supabase.from("support_sessions").update({
          room_name,
          updated_at: new Date().toISOString(),
        }).eq("id", session_id);
        result = { success: true };
        break;
      }

      // Submit rating
      case "submit_rating": {
        const { session_id, ticket_id, user_uuid, admin_username, rating, comment } = params;
        const { error } = await supabase.from("support_ratings").insert({
          session_id: session_id || null,
          ticket_id: ticket_id || null,
          user_uuid,
          admin_username,
          rating,
          comment: comment || null,
        });
        if (error) throw error;
        result = { success: true };
        break;
      }

      // Get all shifts
      case "list_shifts": {
        const { data, error } = await supabase
          .from("admin_shifts")
          .select("*")
          .order("shift_start", { ascending: true });
        if (error) throw error;
        result = data;
        break;
      }

      // Update shift
      case "update_shift": {
        const { id, ...updateData } = params;
        const { error } = await supabase
          .from("admin_shifts")
          .update({ ...updateData, updated_at: new Date().toISOString() })
          .eq("id", id);
        if (error) throw error;
        result = { success: true };
        break;
      }

      // Get unread count for admin
      case "get_unread_count": {
        const { admin_username } = params;
        // Count sessions with unread messages for this admin
        const { data: sessions } = await supabase
          .from("support_sessions")
          .select("id")
          .or(`assigned_admin.eq.${admin_username}`)
          .in("status", ["waiting", "active", "escalated"]);

        let unread = 0;
        if (sessions && sessions.length > 0) {
          const ids = sessions.map((s: any) => s.id);
          const { count } = await supabase
            .from("support_session_messages")
            .select("*", { count: "exact", head: true })
            .in("session_id", ids)
            .eq("is_read", false)
            .neq("sender_type", "admin")
            .neq("sender_type", "super_admin")
            .neq("sender_type", "moderator")
            .neq("sender_type", "owner");
          unread = count || 0;
        }
        result = { unread, sessions_count: sessions?.length || 0 };
        break;
      }

      // Mark messages as read
      case "mark_read": {
        const { session_id } = params;
        await supabase
          .from("support_session_messages")
          .update({ is_read: true })
          .eq("session_id", session_id)
          .eq("is_read", false);
        result = { success: true };
        break;
      }

      // Check for auto-escalation (called periodically)
      case "check_escalation": {
        const { data: waitingSessions } = await supabase
          .from("support_sessions")
          .select("*")
          .in("status", ["waiting"])
          .order("created_at", { ascending: true });

        const now = Date.now();
        const escalated: string[] = [];

        for (const session of (waitingSessions || [])) {
          const waitMs = now - new Date(session.created_at).getTime();
          const waitMins = waitMs / 60000;

          if (session.support_level === 2) {
            // SOS: escalate after 1 min to moderators, 3 min to all
            if (waitMins >= 3 && session.escalation_level < 3) {
              // Escalate to all + request room name
              await supabase.from("support_sessions").update({
                escalation_level: 3,
                status: "escalated",
              }).eq("id", session.id);
              escalated.push(session.id);
            } else if (waitMins >= 1 && session.escalation_level < 2) {
              // Escalate to moderators
              await supabase.from("support_sessions").update({
                escalation_level: 2,
                status: "escalated",
              }).eq("id", session.id);
              escalated.push(session.id);
            }
          } else if (session.support_level === 1) {
            // Regular: WhatsApp after 2 min
            if (waitMins >= 2 && session.escalation_level < 1) {
              await supabase.from("support_sessions").update({
                escalation_level: 1,
              }).eq("id", session.id);

              // WhatsApp alert
              const { data: shifts } = await supabase
                .from("admin_shifts")
                .select("*")
                .eq("admin_username", session.assigned_admin)
                .single();

              if (shifts?.phone_number) {
                try {
                  await fetch(GALA_API, {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body: new URLSearchParams({
                      action: "send_whatsapp",
                      admin_key: ADMIN_KEY,
                      phone: shifts.phone_number,
                      message: `⏰ تنبيه! محادثة دعم بدون رد من دقيقتين!\nالمستخدم: ${session.user_name}\nالرجاء الرد فوراً!`,
                    }),
                  });
                } catch { /* silent */ }
              }
              escalated.push(session.id);
            }
          }
        }

        result = { escalated };
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: "Unknown action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    return new Response(JSON.stringify({ data: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
