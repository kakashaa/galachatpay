import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Admin accounts with roles
const ADMIN_ACCOUNTS: Record<string, { envKey: string; role: "super_admin" | "admin" }> = {
  naz: { envKey: "ADMIN_NAZ_PASSWORD", role: "super_admin" },
  blnawah: { envKey: "ADMIN_BLNAWAH_PASSWORD", role: "admin" },
};

function authenticateAdmin(username: string, password: string): { role: "super_admin" | "admin" } | null {
  const account = ADMIN_ACCOUNTS[username];
  if (!account) return null;
  const expectedPassword = Deno.env.get(account.envKey);
  if (!expectedPassword || password !== expectedPassword) return null;
  return { role: account.role };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { username, password, action, data, session_token } = await req.json();

    // For actions after login, validate session token instead of password
    let auth: { role: "super_admin" | "admin" } | null = null;
    
    if (session_token && action !== "auth_check") {
      // Validate existing session token
      try {
        const decoded = JSON.parse(atob(session_token));
        if (decoded.username && ADMIN_ACCOUNTS[decoded.username]) {
          auth = { role: ADMIN_ACCOUNTS[decoded.username].role };
        }
      } catch (e) {
        console.error("Invalid session token:", e);
      }
    }

    // Fall back to password authentication for login
    if (!auth) {
      auth = authenticateAdmin(username || "", password || "");
    }
    
    if (!auth) {
      return new Response(
        JSON.stringify({ error: "بيانات الدخول غير صحيحة" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let result;

    // Audit log helper
    const logAudit = async (details: Record<string, unknown> = {}) => {
      try {
        await supabase.from("admin_audit_log").insert({
          admin_username: username || "",
          admin_role: auth.role,
          action,
          details,
        });
      } catch (e) {
        console.error("Audit log failed:", e);
      }
    };

    switch (action) {
      // Auth check - returns role info and a session token
      case "auth_check": {
        // Generate a session token (in production, use signed JWTs)
        const sessionToken = btoa(JSON.stringify({ username, role: auth.role, iat: Date.now() }));
        result = { role: auth.role, username, session_token: sessionToken };
        await logAudit({ action: "login", success: true });
        break;
      }

      // Audit log (super_admin only)
      case "list_audit_log": {
        if (auth.role !== "super_admin") throw new Error("غير مصرح لك");
        const { data: logs, error } = await supabase
          .from("admin_audit_log")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(300);
        if (error) throw error;
        result = logs;
        break;
      }

      // Video tutorials CRUD
      case "list_videos": {
        const { data: videos, error } = await supabase
          .from("video_tutorials")
          .select("*")
          .eq("is_deleted", false)
          .order("display_order", { ascending: true });
        if (error) throw error;
        result = videos;
        break;
      }
      case "add_video": {
        const { error } = await supabase.from("video_tutorials").insert(data);
        if (error) throw error;
        result = { success: true };
        break;
      }
      case "update_video": {
        const { id, ...updateData } = data;
        const { error } = await supabase
          .from("video_tutorials")
          .update(updateData)
          .eq("id", id);
        if (error) throw error;
        result = { success: true };
        break;
      }
      case "delete_video": {
        // Soft delete
        const { error } = await supabase
          .from("video_tutorials")
          .update({ is_deleted: true, deleted_at: new Date().toISOString() })
          .eq("id", data.id);
        if (error) throw error;
        result = { success: true };
        break;
      }

      // Salary requests management
      case "list_salary_requests": {
        const { data: requests, error } = await supabase
          .from("salary_requests")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        result = requests;
        break;
      }
      case "update_salary_request": {
        const { id, ...updateData } = data;
        const { error } = await supabase
          .from("salary_requests")
          .update(updateData)
          .eq("id", id);
        if (error) throw error;
        result = { success: true };
        break;
      }

      // Login blocks management
      case "list_blocked_accounts": {
        const { data: blocks, error } = await supabase
          .from("login_attempts")
          .select("*")
          .or("is_permanently_blocked.eq.true,blocked_until.not.is.null")
          .order("updated_at", { ascending: false });
        if (error) throw error;
        result = blocks;
        break;
      }
      case "unblock_account": {
        const { error } = await supabase
          .from("login_attempts")
          .update({
            is_permanently_blocked: false,
            blocked_until: null,
            failed_attempts: 0,
            block_count: 0,
            admin_unblocked_at: new Date().toISOString(),
          })
          .eq("target_uuid", data.target_uuid);
        if (error) throw error;
        result = { success: true };
        break;
      }

      // Entry gifts management
      case "list_entry_gifts": {
        const { data: entryGifts, error } = await supabase
          .from("entry_gifts")
          .select("*")
          .eq("is_deleted", false)
          .order("display_order", { ascending: true });
        if (error) throw error;
        result = entryGifts;
        break;
      }
      case "add_entry_gift": {
        const { error } = await supabase.from("entry_gifts").insert(data);
        if (error) throw error;
        result = { success: true };
        break;
      }
      case "update_entry_gift": {
        const { id, ...updateData } = data;
        const { error } = await supabase
          .from("entry_gifts")
          .update(updateData)
          .eq("id", id);
        if (error) throw error;
        result = { success: true };
        break;
      }
      case "delete_entry_gift": {
        // Soft delete
        const { error } = await supabase
          .from("entry_gifts")
          .update({ is_deleted: true, deleted_at: new Date().toISOString() })
          .eq("id", data.id);
        if (error) throw error;
        result = { success: true };
        break;
      }

      // Frames management
      case "list_frames": {
        const { data: frames, error } = await supabase
          .from("frames")
          .select("*")
          .eq("is_deleted", false)
          .order("display_order", { ascending: true });
        if (error) throw error;
        result = frames;
        break;
      }
      case "add_frame": {
        const { error } = await supabase.from("frames").insert(data);
        if (error) throw error;
        result = { success: true };
        break;
      }
      case "update_frame": {
        const { id, ...updateData } = data;
        const { error } = await supabase
          .from("frames")
          .update(updateData)
          .eq("id", id);
        if (error) throw error;
        result = { success: true };
        break;
      }
      case "delete_frame": {
        // Soft delete
        const { error } = await supabase
          .from("frames")
          .update({ is_deleted: true, deleted_at: new Date().toISOString() })
          .eq("id", data.id);
        if (error) throw error;
        result = { success: true };
        break;
      }

      // Ban reports management
      case "list_ban_reports": {
        const { data: reports, error } = await supabase
          .from("ban_reports")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        result = reports;
        break;
      }
      case "update_ban_report": {
        const { id, ...updateData } = data;
        const { error } = await supabase
          .from("ban_reports")
          .update(updateData)
          .eq("id", id);
        if (error) throw error;
        result = { success: true };
        break;
      }

      // Custom gifts management
      case "list_custom_gifts": {
        const { data: customGifts, error } = await supabase
          .from("custom_gifts")
          .select("*")
          .eq("is_deleted", false)
          .order("created_at", { ascending: false });
        if (error) throw error;
        result = customGifts;
        break;
      }
      case "update_custom_gift": {
        const { id, ...updateData } = data;
        const { error } = await supabase
          .from("custom_gifts")
          .update(updateData)
          .eq("id", id);
        if (error) throw error;
        result = { success: true };
        break;
      }
      case "delete_custom_gift": {
        // Soft delete
        const { error } = await supabase
          .from("custom_gifts")
          .update({ is_deleted: true, deleted_at: new Date().toISOString() })
          .eq("id", data.id);
        if (error) throw error;
        result = { success: true };
        break;
      }

      // Entry gift claims
      case "list_entry_claims": {
        const { data: claims, error } = await supabase
          .from("entry_gift_claims")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        result = claims;
        break;
      }

      // Star gift logs
      case "list_star_gifts": {
        const { data: gifts, error } = await supabase
          .from("star_gift_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(200);
        if (error) throw error;
        result = gifts;
        break;
      }

      // Frame claims
      case "list_frame_claims": {
        const { data: claims, error } = await supabase
          .from("frame_claims")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        result = claims;
        break;
      }

      // Animated photo requests management
      case "list_animated_photos": {
        const { data: photos, error } = await supabase
          .from("animated_photo_requests")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        result = photos;
        break;
      }
      case "update_animated_photo": {
        const { id, ...updateData } = data;
        const { error } = await supabase
          .from("animated_photo_requests")
          .update(updateData)
          .eq("id", id);
        if (error) throw error;
        result = { success: true };
        break;
      }

      // ========== SUPPORT TICKETS MANAGEMENT ==========
      case "list_support_tickets": {
        const { data: tickets, error } = await supabase
          .from("support_tickets")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        result = tickets;
        break;
      }
      case "reply_ticket": {
        const { ticket_id, admin_reply } = data;
        if (!ticket_id || !admin_reply) throw new Error("معرف التكت والرد مطلوبان");
        
        const { error } = await supabase
          .from("support_tickets")
          .update({
            admin_reply,
            status: "replied",
            admin_username: username,
            replied_at: new Date().toISOString(),
          })
          .eq("id", ticket_id);
        if (error) throw error;

        // Also insert into ticket_replies for conversation thread
        await supabase.from("ticket_replies").insert({
          ticket_id,
          sender_type: "admin",
          sender_name: username,
          message: admin_reply,
        });
        
        // Get ticket to get user_uuid and notify them
        const { data: ticket } = await supabase
          .from("support_tickets")
          .select("user_uuid, subject")
          .eq("id", ticket_id)
          .single();
        
        if (ticket?.user_uuid) {
          await supabase.from("notifications").insert({
            user_uuid: ticket.user_uuid,
            title: "✅ تم الرد على تكتك",
            body: `تم الرد على تكتك: ${ticket.subject}`,
            target: "personal",
          });
        }
        
        result = { success: true };
        break;
      }
      case "close_ticket": {
        const { ticket_id } = data;
        if (!ticket_id) throw new Error("معرف التكت مطلوب");
        
        const { error } = await supabase
          .from("support_tickets")
          .update({ status: "closed" })
          .eq("id", ticket_id);
        if (error) throw error;
        result = { success: true };
        break;
      }

      // ========== SUPPORT CHAT MANAGEMENT ==========
      case "list_vip_chat_sessions": {
        const { data: sessions, error } = await supabase
          .from("support_chat_sessions")
          .select("*")
          .eq("status", "waiting")
          .order("created_at", { ascending: true });
        if (error) throw error;
        result = sessions;
        break;
      }
      case "accept_vip_chat": {
        const { session_id } = data;
        if (!session_id) throw new Error("معرف الجلسة مطلوب");
        
        const { error } = await supabase
          .from("support_chat_sessions")
          .update({
            status: "active",
            admin_username: username,
          })
          .eq("id", session_id);
        if (error) throw error;
        
        // Notify user that admin accepted
        const { data: session } = await supabase
          .from("support_chat_sessions")
          .select("user_uuid, user_name")
          .eq("id", session_id)
          .single();
        
        if (session?.user_uuid) {
          await supabase.from("notifications").insert({
            user_uuid: session.user_uuid,
            title: "👨‍💼 تم قبول طلبك",
            body: `تم قبول طلب الدعم السريع، ${username} سيساعدك الآن.`,
            target: "personal",
          });
        }
        
        result = { success: true };
        break;
      }
      case "close_vip_chat": {
        const { session_id } = data;
        if (!session_id) throw new Error("معرف الجلسة مطلوب");
        
        const { error } = await supabase
          .from("support_chat_sessions")
          .update({ status: "closed" })
          .eq("id", session_id);
        if (error) throw error;
        result = { success: true };
        break;
      }
      case "send_chat_message": {
        const { session_id, message } = data;
        if (!session_id || !message) throw new Error("معرف الجلسة والرسالة مطلوبان");
        
        const { error } = await supabase
          .from("support_chat_messages")
          .insert({
            chat_id: session_id,
            sender_uuid: "admin",
            sender_name: username,
            sender_type: "admin",
            message,
          });
        if (error) throw error;
        result = { success: true };
        break;
      }

      // Admin send stars
      case "admin_send_stars": {
        const { target_uuid, amount } = data;
        if (!target_uuid || !amount || amount <= 0) throw new Error("UUID وعدد النجوم مطلوبان");
        
        const currentMonth = new Date().toISOString().slice(0, 7);
        
        const { data: existing } = await supabase
          .from("user_star_balance")
          .select("*")
          .eq("user_uuid", target_uuid)
          .single();
        
        if (existing) {
          const { error } = await supabase
            .from("user_star_balance")
            .update({
              total_stars: existing.total_stars + amount,
              monthly_stars: existing.monthly_stars + amount,
            })
            .eq("user_uuid", target_uuid);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("user_star_balance")
            .insert({
              user_uuid: target_uuid,
              current_month: currentMonth,
              total_stars: amount,
              monthly_stars: amount,
              carryover_stars: 0,
              last_level: 0,
            });
          if (error) throw error;
        }
        
        await supabase.from("star_gift_logs").insert({
          sender_uuid: "admin",
          sender_name: "الإدارة",
          recipient_uuid: target_uuid,
          amount,
        });
        
        await supabase.from("notifications").insert({
          user_uuid: target_uuid,
          title: "⭐ تم منحك نجوم",
          body: `تم إضافة ${amount} نجمة إلى رصيدك من قبل الإدارة.`,
          target: "personal",
        });
        
        result = { success: true };
        break;
      }

      // ========== TRASH MANAGEMENT (super_admin only) ==========
      case "list_trash": {
        if (auth.role !== "super_admin") throw new Error("غير مصرح لك بالوصول للمحذوفات");
        
        const [videos, entries, frames, customs] = await Promise.all([
          supabase.from("video_tutorials").select("*").eq("is_deleted", true).order("deleted_at", { ascending: false }),
          supabase.from("entry_gifts").select("*").eq("is_deleted", true).order("deleted_at", { ascending: false }),
          supabase.from("frames").select("*").eq("is_deleted", true).order("deleted_at", { ascending: false }),
          supabase.from("custom_gifts").select("*").eq("is_deleted", true).order("deleted_at", { ascending: false }),
        ]);
        
        result = {
          videos: videos.data || [],
          entries: entries.data || [],
          frames: frames.data || [],
          customs: customs.data || [],
        };
        break;
      }
      
      case "restore_item": {
        if (auth.role !== "super_admin") throw new Error("غير مصرح لك");
        const { table, id } = data;
        const allowedTables = ["video_tutorials", "entry_gifts", "frames", "custom_gifts"];
        if (!allowedTables.includes(table)) throw new Error("جدول غير مسموح");
        
        const { error } = await supabase
          .from(table)
          .update({ is_deleted: false, deleted_at: null })
          .eq("id", id);
        if (error) throw error;
        result = { success: true };
        break;
      }
      
      case "permanent_delete": {
        if (auth.role !== "super_admin") throw new Error("غير مصرح لك");
        const { table: delTable, id: delId } = data;
        const allowedDelTables = ["video_tutorials", "entry_gifts", "frames", "custom_gifts"];
        if (!allowedDelTables.includes(delTable)) throw new Error("جدول غير مسموح");
        
        const { error } = await supabase
          .from(delTable)
          .delete()
          .eq("id", delId);
        if (error) throw error;
        result = { success: true };
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: "إجراء غير معروف" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    // Auto-log all mutation actions (skip list/read actions)
    if (!action.startsWith("list_") && action !== "auth_check") {
      await logAudit(data || {});
    }

    return new Response(JSON.stringify({ data: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
