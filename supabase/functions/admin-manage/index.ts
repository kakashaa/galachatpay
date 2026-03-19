import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getGalaHeaders } from "../_shared/hmac.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Primary admin accounts with roles (hardcoded)
const ADMIN_ACCOUNTS: Record<string, { envKey: string; role: "owner" | "super_admin" | "admin" }> = {
  naz: { envKey: "ADMIN_NAZ_PASSWORD", role: "owner" },
  blnawah: { envKey: "ADMIN_BLNAWAH_PASSWORD", role: "admin" },
};

// Simple hash for moderator passwords (not crypto-grade but sufficient for this use case)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "gala_salt_2024");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

async function authenticateAdmin(
  username: string,
  password: string,
  supabaseClient?: any
): Promise<{ role: "owner" | "super_admin" | "admin" | "moderator"; permissions?: string[] } | null> {
  // Check primary accounts first
  const account = ADMIN_ACCOUNTS[username];
  if (account) {
    const expectedPassword = Deno.env.get(account.envKey);
    if (!expectedPassword || password !== expectedPassword) return null;
    return { role: account.role };
  }

  // Check moderator accounts from database
  if (!supabaseClient) return null;
  const passwordHash = await hashPassword(password);
  const { data: mod } = await supabaseClient
    .from("admin_accounts")
    .select("*")
    .eq("username", username)
    .eq("password_hash", passwordHash)
    .eq("is_active", true)
    .single();

  if (!mod) return null;
  return { role: "moderator", permissions: mod.permissions || [] };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { username, password, action, data, session_token } = await req.json();

    console.log("[ADMIN-DEBUG] action:", action, "username:", username, "has_token:", !!session_token, "token_len:", session_token?.length);

    // auto_ban_report action removed — bans now require admin approval

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // For actions after login, validate session token instead of password
    let auth: { role: "owner" | "super_admin" | "admin" | "moderator"; permissions?: string[] } | null = null;
    
    if (session_token && action !== "auth_check") {
      // Validate existing session token
      try {
        let decoded: any;
        try {
          decoded = JSON.parse(atob(session_token));
        } catch {
          // Token is not valid base64-JSON — reject it
          return new Response(
            JSON.stringify({ error: "جلسة غير صالحة، يرجى تسجيل الدخول مرة أخرى", auth_error: true }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (decoded.username) {
          if (ADMIN_ACCOUNTS[decoded.username]) {
            auth = { role: ADMIN_ACCOUNTS[decoded.username].role };
          } else {
            // Check moderator from DB
            const { data: mod } = await supabase
              .from("admin_accounts")
              .select("*")
              .eq("username", decoded.username)
              .eq("is_active", true)
              .single();
            if (mod) {
              auth = { role: "moderator", permissions: mod.permissions || [] };
            }
          }
        }
      } catch (e) {
        console.error("Invalid session token:", e);
      }
    }

    // Fall back to password authentication for login
    if (!auth) {
      auth = await authenticateAdmin(username || "", password || "", supabase);
    }
    
    if (!auth) {
      return new Response(
        JSON.stringify({ error: "بيانات الدخول غير صحيحة" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // supabase client already created above

    let result;
    const isSuperAdmin = auth.role === "owner" || auth.role === "super_admin";

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
        // Generate a session token
        const sessionToken = btoa(JSON.stringify({ username, role: auth.role, iat: Date.now() }));
        result = { role: auth.role, username, session_token: sessionToken, permissions: auth.permissions || null };
        await logAudit({ action: "login", success: true });
        break;
      }

      // Audit log (super_admin only)
      case "list_audit_log": {
        if (!isSuperAdmin) throw new Error("غير مصرح لك");
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

      // Manual bans management
      case "list_manual_bans": {
        const { data: bans, error } = await supabase
          .from("manual_bans")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        result = bans;
        break;
      }
      case "manual_ban_user": {
        const { target_uuid, ban_type, duration_hours, reason, banned_elements } = data;
        if (!target_uuid) throw new Error("UUID المستخدم مطلوب");

        const insertData: any = {
          target_uuid: String(target_uuid),
          ban_type: ban_type || "full",
          duration_hours: duration_hours || 24,
          reason: reason || "",
          banned_by: username || "",
        };
        if (ban_type === "elements" && Array.isArray(banned_elements) && banned_elements.length > 0) {
          insertData.banned_elements = banned_elements;
        }

        const { error: insertErr } = await supabase.from("manual_bans").insert(insertData);
        if (insertErr) throw new Error("فشل حفظ الحظر: " + insertErr.message);

        const elementLabels: Record<string, string> = { entries: "دخوليات", frames: "إطارات", gifts: "هدايا مخصصة", animated_photos: "صور متحركة", change_id: "تغيير آيدي", hairs: "تسريحات", vip: "VIP", salary: "رواتب" };
        const banDesc = ban_type === "elements" && Array.isArray(banned_elements)
          ? `تم حظرك من: ${banned_elements.map((e: string) => elementLabels[e] || e).join("، ")}`
          : "تم حظرك من استخدام جميع عناصر التطبيق";

        await supabase.from("notifications").insert({
          user_uuid: String(target_uuid),
          title: "🚫 تم حظرك",
          body: `${banDesc}. السبب: ${reason || "مخالفة"}. المدة: ${duration_hours === 999999 ? "أبدي" : (duration_hours || 24) + " ساعة"}`,
          target: "personal",
        });

        await logAudit({ target_uuid, ban_type, duration_hours, reason, banned_elements });
        result = { success: true };
        break;
      }
      case "unban_manual": {
        const { ban_id } = data;
        if (!ban_id) throw new Error("معرف الحظر مطلوب");

        const { error } = await supabase
          .from("manual_bans")
          .update({ status: "unbanned", unbanned_at: new Date().toISOString(), unbanned_by: auth.username })
          .eq("id", ban_id);
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

        // If admin approved (verified) the report, execute internal ban and notify reporter
        if (updateData.is_verified === true) {
          // Fetch the full report to get details
          const { data: report } = await supabase
            .from("ban_reports")
            .select("*")
            .eq("id", id)
            .single();

          if (report) {
            // Internal app ban - save to manual_bans table
            const banDuration = report.ban_type === "promotion" ? 999999 : 24;
            await supabase.from("manual_bans").insert({
              target_uuid: report.reported_user_id,
              ban_type: report.ban_type || "normal",
              duration_hours: banDuration,
              reason: report.description || "مخالفة - بلاغ مُوثق",
              banned_by: username || "admin",
            });

            // Notify the reporter
            await supabase.from("notifications").insert({
              user_uuid: report.reporter_gala_id,
              title: "✅ تمت الموافقة على بلاغك",
              body: `تمت الموافقة على بلاغك ضد ${report.reported_user_id} وتم تنفيذ الحظر. شكراً لمساهمتك في حماية المجتمع!`,
              target: "personal",
            });
          }
        }

        result = { success: true };
        await logAudit({ report_id: id, ...updateData });
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

      // Entry gift claims / entry requests
      case "list_entry_claims":
      case "list_entry_requests": {
        const { data: claims, error } = await supabase
          .from("entry_gift_claims")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;

        // Enrich with product info from entry_gifts
        const giftIds = [...new Set((claims || []).map((c: any) => c.gift_id).filter(Boolean))];
        let giftsMap: Record<string, any> = {};
        if (giftIds.length) {
          const { data: gifts } = await supabase
            .from("entry_gifts")
            .select("id, title, video_url, thumbnail_url, star_level")
            .in("id", giftIds);
          if (gifts) gifts.forEach((g: any) => giftsMap[g.id] = g);
        }

        result = (claims || []).map((c: any) => ({
          ...c,
          title: c.title || giftsMap[c.gift_id]?.title || "دخولية",
          file_url: c.file_url || giftsMap[c.gift_id]?.video_url,
          thumbnail_url: c.thumbnail_url || giftsMap[c.gift_id]?.thumbnail_url,
        }));
        break;
      }

      // Hair selections
      case "list_hair_selections": {
        const { data: hairs, error } = await supabase
          .from("hair_selections")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        result = hairs;
        break;
      }

      // Approve/reject entry requests
      case "approve_entry_request": {
        const { id } = data;
        const { error } = await supabase.from("entry_gift_claims").update({ status: "approved", approved_at: new Date().toISOString() }).eq("id", id);
        if (error) throw error;
        result = { success: true };
        break;
      }
      case "reject_entry_request": {
        const { id, reason } = data;
        const { error } = await supabase.from("entry_gift_claims").update({ status: "rejected", admin_note: reason || "" }).eq("id", id);
        if (error) throw error;
        result = { success: true };
        break;
      }

      // Approve/reject frame claims
      case "approve_frame_claim": {
        const { id } = data;
        const { error } = await supabase.from("frame_claims").update({ status: "approved", approved_at: new Date().toISOString() }).eq("id", id);
        if (error) throw error;
        result = { success: true };
        break;
      }
      case "reject_frame_claim": {
        const { id, reason } = data;
        const { error } = await supabase.from("frame_claims").update({ status: "rejected", admin_note: reason || "" }).eq("id", id);
        if (error) throw error;
        result = { success: true };
        break;
      }

      // Approve/reject hair selections
      case "approve_hair_selection": {
        const { id } = data;
        const { error } = await supabase.from("hair_selections").update({ status: "approved" }).eq("id", id);
        if (error) throw error;
        result = { success: true };
        break;
      }
      case "reject_hair_selection": {
        const { id } = data;
        const { error } = await supabase.from("hair_selections").update({ status: "rejected" }).eq("id", id);
        if (error) throw error;
        result = { success: true };
        break;
      }

      // Approve/reject animated photos
      case "approve_animated_photo": {
        const { id } = data;
        const { error } = await supabase.from("animated_photo_requests").update({ status: "approved" }).eq("id", id);
        if (error) throw error;
        result = { success: true };
        break;
      }
      case "reject_animated_photo": {
        const { id } = data;
        const { error } = await supabase.from("animated_photo_requests").update({ status: "rejected" }).eq("id", id);
        if (error) throw error;
        result = { success: true };
        break;
      }

      // Approve/reject custom gifts
      case "approve_custom_gift": {
        const { id } = data;
        const { error } = await supabase.from("custom_gifts").update({ status: "approved" }).eq("id", id);
        if (error) throw error;
        result = { success: true };
        break;
      }
      case "reject_custom_gift": {
        const { id } = data;
        const { error } = await supabase.from("custom_gifts").update({ status: "rejected" }).eq("id", id);
        if (error) throw error;
        result = { success: true };
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

        // Enrich with product info from frames
        const frameIds = [...new Set((claims || []).map((c: any) => c.frame_id).filter(Boolean))];
        let framesMap: Record<string, any> = {};
        if (frameIds.length) {
          const { data: frames } = await supabase
            .from("frames")
            .select("id, title, file_url, thumbnail_url, star_level")
            .in("id", frameIds);
          if (frames) frames.forEach((f: any) => framesMap[f.id] = f);
        }

        result = (claims || []).map((c: any) => ({
          ...c,
          title: c.title || framesMap[c.frame_id]?.title || "إطار",
          file_url: c.file_url || framesMap[c.frame_id]?.file_url,
          thumbnail_url: c.thumbnail_url || framesMap[c.frame_id]?.thumbnail_url,
        }));
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
        
        // Use current_month filter to avoid .single() error when multiple months exist
        const { data: existing } = await supabase
          .from("user_star_balance")
          .select("*")
          .eq("user_uuid", target_uuid)
          .eq("current_month", currentMonth)
          .maybeSingle();
        
        if (existing) {
          const { error } = await supabase
            .from("user_star_balance")
            .update({
              total_stars: existing.total_stars + amount,
              monthly_stars: existing.monthly_stars + amount,
            })
            .eq("user_uuid", target_uuid)
            .eq("current_month", currentMonth);
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
        if (!isSuperAdmin) throw new Error("غير مصرح لك بالوصول للمحذوفات");
        
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
        if (!isSuperAdmin) throw new Error("غير مصرح لك");
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
        if (!isSuperAdmin) throw new Error("غير مصرح لك");
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

      case "update_bd_cache": {
        const { id: bdId, status: bdStatus, admin_note: bdNote, user_uuid: bdUserUuid, user_name: bdUserName, request_type: bdReqType, details: bdDetails } = data;
        if (!bdId) throw new Error("معرف الطلب مطلوب");
        const { error: bdErr } = await supabase
          .from("bd_requests_cache")
          .upsert({
            id: String(bdId),
            user_uuid: bdUserUuid || "",
            user_name: bdUserName || "",
            request_type: bdReqType || "bd_verify",
            status: bdStatus,
            admin_note: bdNote || null,
            details: bdDetails || {},
            updated_at: new Date().toISOString(),
          }, { onConflict: "id" });
        if (bdErr) throw bdErr;
        result = { success: true };
        break;
      }

      // ========== BAN USER VIA EXTERNAL API ==========
      case "ban_user": {
        const { uuid, reason, ban_type, duration } = data;
        if (!uuid) throw new Error("UUID مطلوب");

        const BASE_URL2 = Deno.env.get("GALA_API_BASE_URL") || "https://hola-chat.com/api/newWebsite";
        const banEndpoint2 = "ban-user";
        const banFullUrl2 = `${BASE_URL2}/${banEndpoint2}`;
        const banSignPath2 = `api/newWebsite/${banEndpoint2}`;
        const banHeaders2 = await getGalaHeaders("POST", banSignPath2);

        const banResponse = await fetch(banFullUrl2, {
          method: "POST",
          headers: banHeaders2,
          body: JSON.stringify({ uuid: String(uuid), reason, ban_type, duration }),
        });

        const banText = await banResponse.text();
        console.log("ban_user API response:", banResponse.status, banText.substring(0, 500));
        let banData;
        try {
          banData = JSON.parse(banText);
        } catch {
          throw new Error("استجابة API غير صالحة: " + banText.substring(0, 200));
        }

        if (!banResponse.ok && !banData?.ok) {
          throw new Error(banData?.error || banData?.message || "فشل الحظر من API");
        }

        result = { success: true, ban_result: banData };
        break;
      }

      // ========== MODERATOR MANAGEMENT (super_admin/admin only) ==========
      case "list_moderators": {
        if (!isSuperAdmin && auth.role !== "admin") throw new Error("غير مصرح لك");
        const { data: mods, error } = await supabase
          .from("admin_accounts")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        // Don't return password hashes
        result = (mods || []).map(({ password_hash, ...rest }: any) => rest);
        break;
      }

      case "add_moderator": {
        if (!isSuperAdmin && auth.role !== "admin") throw new Error("غير مصرح لك");
        const { username: modUsername, display_name, password: modPassword, permissions } = data;
        if (!modUsername || !modPassword) throw new Error("اسم المستخدم وكلمة المرور مطلوبان");
        
        // Check if username already exists (including primary admins)
        if (ADMIN_ACCOUNTS[modUsername]) throw new Error("اسم المستخدم محجوز");
        const { data: existing } = await supabase
          .from("admin_accounts")
          .select("id")
          .eq("username", modUsername)
          .single();
        if (existing) throw new Error("اسم المستخدم موجود مسبقاً");

        const pwHash = await hashPassword(modPassword);
        const { error } = await supabase.from("admin_accounts").insert({
          username: modUsername,
          display_name: display_name || modUsername,
          password_hash: pwHash,
          role: "moderator",
          permissions: permissions || [],
          created_by: username || "",
        });
        if (error) throw error;
        result = { success: true };
        break;
      }

      case "update_moderator": {
        if (!isSuperAdmin && auth.role !== "admin") throw new Error("غير مصرح لك");
        const { id: modId, permissions: modPerms, display_name: modName, password: newModPw } = data;
        if (!modId) throw new Error("معرف المسؤول مطلوب");
        
        const updateData: any = {};
        if (modPerms !== undefined) updateData.permissions = modPerms;
        if (modName) updateData.display_name = modName;
        if (newModPw) updateData.password_hash = await hashPassword(newModPw);

        const { error } = await supabase
          .from("admin_accounts")
          .update(updateData)
          .eq("id", modId);
        if (error) throw error;
        result = { success: true };
        break;
      }

      case "toggle_moderator": {
        if (!isSuperAdmin && auth.role !== "admin") throw new Error("غير مصرح لك");
        const { id: toggleId, is_active } = data;
        if (!toggleId) throw new Error("معرف المسؤول مطلوب");
        const { error } = await supabase
          .from("admin_accounts")
          .update({ is_active })
          .eq("id", toggleId);
        if (error) throw error;
        result = { success: true };
        break;
      }

      case "delete_moderator": {
        if (!isSuperAdmin && auth.role !== "admin") throw new Error("غير مصرح لك");
        const { id: delModId } = data;
        if (!delModId) throw new Error("معرف المسؤول مطلوب");
        const { error } = await supabase
          .from("admin_accounts")
          .delete()
          .eq("id", delModId);
        if (error) throw error;
        result = { success: true };
        break;
      }

      // ===== WORKS SYSTEM =====
      case "works_list_requests": {
        const { data: reqs, error } = await supabase
          .from("works_requests").select("*").order("created_at", { ascending: false });
        if (error) throw error;
        result = reqs;
        break;
      }

      case "works_approve_request": {
        const { id } = data;
        const req2 = await supabase.from("works_requests").select("*").eq("id", id).single();
        if (!req2.data) throw new Error("Request not found");
        const code = "WK-" + Math.random().toString(36).substr(2, 6).toUpperCase();
        await supabase.from("works_accounts").insert({
          user_uuid: req2.data.user_uuid, user_name: req2.data.user_name,
          works_code: code, status: "active",
        });
        await supabase.from("works_requests").update({ status: "approved" }).eq("id", id);
        await supabase.from("notifications").insert({
          user_uuid: req2.data.user_uuid,
          title: "تم قبول طلب Works ✅",
          body: `تم تفعيل نظام Works لحسابك! كود Works الخاص بك: ${code}`,
          is_read: false,
        });
        result = { success: true, works_code: code };
        break;
      }

      case "works_reject_request": {
        const { id, reason } = data;
        await supabase.from("works_requests").update({ status: "rejected", admin_note: reason }).eq("id", id);
        const reqR = await supabase.from("works_requests").select("user_uuid").eq("id", id).single();
        if (reqR.data) {
          await supabase.from("notifications").insert({
            user_uuid: reqR.data.user_uuid,
            title: "تم رفض طلب Works ❌",
            body: reason || "للأسف تم رفض طلبك. تواصل مع الدعم لمزيد من المعلومات.",
            is_read: false,
          });
        }
        result = { success: true };
        break;
      }

      case "works_list_accounts": {
        const { data: accounts, error } = await supabase
          .from("works_accounts").select("*").order("created_at", { ascending: false });
        if (error) throw error;
        for (const acc of (accounts || [])) {
          const { count: supporters } = await supabase
            .from("works_members").select("*", { count: "exact", head: true })
            .eq("works_id", acc.id).eq("member_type", "supporter").eq("status", "active");
          const { count: agents } = await supabase
            .from("works_members").select("*", { count: "exact", head: true })
            .eq("works_id", acc.id).eq("member_type", "agent").eq("status", "active");
          (acc as any).supporter_count = supporters || 0;
          (acc as any).agent_count = agents || 0;
        }
        result = accounts;
        break;
      }

      case "works_get_members": {
        const { works_id } = data;
        const { data: members, error } = await supabase
          .from("works_members").select("*").eq("works_id", works_id).order("created_at", { ascending: false });
        if (error) throw error;
        result = members;
        break;
      }

      case "works_update_account": {
        const { id: uaId, ...uaUpdates } = data;
        const { error } = await supabase.from("works_accounts").update(uaUpdates).eq("id", uaId);
        if (error) throw error;
        result = { success: true };
        break;
      }

      case "works_update_member": {
        const { id: umId, ...umUpdates } = data;
        const { error } = await supabase.from("works_members").update(umUpdates).eq("id", umId);
        if (error) throw error;
        result = { success: true };
        break;
      }

      case "works_list_withdrawals": {
        const { data: withdrawals, error } = await supabase
          .from("works_withdrawals").select("*").order("created_at", { ascending: false });
        if (error) throw error;
        result = withdrawals;
        break;
      }

      case "works_approve_withdrawal": {
        const { id: awId } = data;
        const w = await supabase.from("works_withdrawals").select("*").eq("id", awId).single();
        if (!w.data) throw new Error("Not found");
        await supabase.from("works_withdrawals").update({ status: "approved" }).eq("id", awId);
        const accW = await supabase.from("works_accounts").select("balance_usd").eq("id", w.data.works_id).single();
        if (accW.data) {
          await supabase.from("works_accounts").update({
            balance_usd: Math.max(0, (Number(accW.data.balance_usd) || 0) - Number(w.data.amount_usd))
          }).eq("id", w.data.works_id);
        }
        result = { success: true };
        break;
      }

      case "works_reject_withdrawal": {
        const { id: rwId, reason: rwReason } = data;
        await supabase.from("works_withdrawals").update({ status: "rejected", admin_note: rwReason }).eq("id", rwId);
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
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
