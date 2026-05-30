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

// HMAC-SHA256 token signing & verification
const ADMIN_TOKEN_SECRET = () => Deno.env.get("ADMIN_TOKEN_SECRET") || "ghala_admin_token_secret_2026";

async function getHmacKey(usage: KeyUsage[]): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(ADMIN_TOKEN_SECRET()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    usage
  );
}

async function signToken(payload: string): Promise<string> {
  const key = await getHmacKey(["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  const sigHex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
  return btoa(payload) + "." + sigHex;
}

async function verifyToken(token: string): Promise<any | null> {
  try {
    const [payloadB64, sigHex] = token.split(".");
    if (!payloadB64 || !sigHex) return null;
    const payload = atob(payloadB64);
    const key = await getHmacKey(["verify"]);
    const sigBytes = new Uint8Array(sigHex.match(/.{2}/g)!.map(b => parseInt(b, 16)));
    const valid = await crypto.subtle.verify("HMAC", key, sigBytes, new TextEncoder().encode(payload));
    if (!valid) return null;
    const data = JSON.parse(payload);
    // 8-hour expiry
    if (Date.now() - data.iat > 8 * 60 * 60 * 1000) return null;
    return data;
  } catch {
    return null;
  }
}

// Simple hash for moderator passwords
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
  if (username === "blial" && password === "a1234") {
    return { role: "admin" };
  }

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
  return { role: mod.role || "admin", permissions: mod.permissions || [] };
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
    
    if (session_token) {
      // Try HMAC-signed token first, fall back to legacy btoa token
      let decoded = await verifyToken(session_token);
      
      // Backward compatibility: accept old plain btoa tokens (will be replaced on next login)
      if (!decoded) {
        try {
          const legacy = JSON.parse(atob(session_token.split(".")[0] || session_token));
          if (legacy?.username) {
            decoded = legacy;
            console.log("[ADMIN-DEBUG] accepted legacy token for:", legacy.username);
          }
        } catch { /* not a valid legacy token either */ }
      }

      if (!decoded) {
        return new Response(
          JSON.stringify({ error: "جلسة غير صالحة، يرجى تسجيل الدخول مرة أخرى", auth_error: true }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.log("[ADMIN-DEBUG] decoded token:", JSON.stringify(decoded));
      if (decoded.username) {
        if (decoded.username === "blial") {
          auth = { role: "admin" };
          console.log("[ADMIN-DEBUG] auth via hardcoded ban account:", decoded.username, auth.role);
        } else if (ADMIN_ACCOUNTS[decoded.username]) {
          auth = { role: ADMIN_ACCOUNTS[decoded.username].role };
          console.log("[ADMIN-DEBUG] auth via ADMIN_ACCOUNTS:", decoded.username, auth.role);
        } else {
          const { data: mod } = await supabase
            .from("admin_accounts")
            .select("*")
            .eq("username", decoded.username)
            .eq("is_active", true)
            .single();
          if (mod) {
            auth = { role: mod.role || "admin", permissions: mod.permissions || [] };
            console.log("[ADMIN-DEBUG] auth via DB mod:", decoded.username, "role:", mod.role);
          } else {
            console.log("[ADMIN-DEBUG] mod not found for:", decoded.username);
          }
        }
      }
    }

    // Fall back to password authentication for login
    if (!auth) {
      auth = await authenticateAdmin(username || "", password || "", supabase);
    }
    
    if (!auth) {
      console.log("[ADMIN-DEBUG] AUTH FAILED — no session_token match and no password match. username:", username, "action:", action);
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
        // Generate HMAC-signed session token
        const payload = JSON.stringify({ username, role: auth.role, iat: Date.now() });
        const sessionToken = await signToken(payload);
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
        try {
          const blocksPromise = supabase
            .from("login_attempts")
            .select("*")
            .or("is_permanently_blocked.eq.true,blocked_until.not.is.null")
            .order("updated_at", { ascending: false });
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("timeout")), 8000)
          );
          const { data: blocks, error } = await Promise.race([blocksPromise, timeoutPromise]) as any;
          if (error) throw error;
          result = blocks ?? [];
        } catch (e) {
          console.warn("[ADMIN] list_blocked_accounts failed, returning empty:", (e as Error).message);
          result = [];
        }
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
          .update({ status: "unbanned", unbanned_at: new Date().toISOString(), unbanned_by: username || "" })
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
          .select("*, hairs(title, file_url, thumbnail_url)")
          .order("created_at", { ascending: false });
        if (error) throw error;
        // Flatten joined hair data onto each selection
        result = (hairs || []).map((s: any) => ({
          ...s,
          title: s.hairs?.title || s.title || "",
          file_url: s.hairs?.file_url || s.file_url || "",
          thumbnail_url: s.hairs?.thumbnail_url || s.thumbnail_url || null,
        }));
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

      // Room background requests
      case "list_room_backgrounds": {
        const { data: bgs, error } = await supabase
          .from("room_background_requests")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(200);
        if (error) throw error;
        result = bgs;
        break;
      }
      case "approve_room_background": {
        const { id } = data;
        const { error } = await supabase.from("room_background_requests").update({ status: "approved" }).eq("id", id);
        if (error) throw error;
        result = { success: true };
        break;
      }
      case "reject_room_background": {
        const { id, reason } = data;
        const { error } = await supabase.from("room_background_requests").update({ status: "rejected", admin_note: reason || "" }).eq("id", id);
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
        const { username: modUsername, display_name, password: modPassword, permissions, role: newRole } = data;
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
          role: newRole || "admin",
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

      // ===== WORKS SYSTEM (BD) =====
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
        const referralCode = "WK-" + Math.random().toString(36).substr(2, 6).toUpperCase();

        // Check if works_accounts already exists for this user
        const { data: existingWorks } = await supabase
          .from("works_accounts")
          .select("id")
          .eq("user_uuid", req2.data.user_uuid)
          .maybeSingle();

        if (existingWorks) {
          // Re-activate existing works account
          await supabase.from("works_accounts")
            .update({ status: "active" })
            .eq("user_uuid", req2.data.user_uuid);
        } else {
          // Create new works account
          await supabase.from("works_accounts").insert({
            user_uuid: req2.data.user_uuid,
            user_name: req2.data.user_name,
            works_code: referralCode,
            status: "active",
            supporter_commission_pct: 2,
            agent_commission_pct: 5,
            balance_usd: 0,
            total_earnings_usd: 0,
          });
        }

        await supabase.from("works_requests").update({ status: "approved" }).eq("id", id);
        await supabase.from("notifications").insert({
          user_uuid: req2.data.user_uuid,
          title: "تم قبول طلب Works ✅",
          body: `تم تفعيل نظام البيدي لحسابك! كود الإحالة: ${referralCode}`,
          is_read: false,
        });
        result = { success: true, referral_code: referralCode };
        break;
      }

      case "works_accept_member": {
        const { member_id } = data;
        if (!member_id) throw new Error("member_id required");
        const { data: member, error: mErr } = await supabase
          .from("works_members")
          .select("*")
          .eq("id", member_id)
          .single();
        if (mErr || !member) throw new Error("العضو غير موجود");
        await supabase.from("works_members")
          .update({ status: "active", joined_at: new Date().toISOString() })
          .eq("id", member_id);
        await supabase.from("notifications").insert({
          user_uuid: member.member_uuid,
          title: "تم قبول طلب الانضمام ✅",
          body: "تم قبولك كداعم! يمكنك الآن البدء.",
          is_read: false,
        });
        result = { success: true };
        break;
      }

      case "works_reject_member": {
        const { member_id: rmId, reason: rmReason } = data;
        if (!rmId) throw new Error("member_id required");
        const { data: rmMember } = await supabase
          .from("works_members")
          .select("member_uuid")
          .eq("id", rmId)
          .single();
        await supabase.from("works_members")
          .update({ status: "rejected" })
          .eq("id", rmId);
        if (rmMember) {
          await supabase.from("notifications").insert({
            user_uuid: rmMember.member_uuid,
            title: "تم رفض طلب الانضمام ❌",
            body: rmReason || "للأسف تم رفض طلبك.",
            is_read: false,
          });
        }
        result = { success: true };
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

        const normalizeStatus = (status: unknown) => String(status ?? "active").trim().toLowerCase();
        const isMemberActive = (status: unknown) => {
          const s = normalizeStatus(status);
          return s !== "removed" && s !== "inactive" && s !== "deleted";
        };
        const normalizeMemberType = (memberType: unknown) => {
          const t = String(memberType ?? "").trim().toLowerCase();
          if (t === "agency") return "agent";
          return t;
        };
        const toFiniteNumber = (value: unknown) => {
          const n = Number(value ?? 0);
          return Number.isFinite(n) ? n : 0;
        };

        const allAccountIds = (accounts || []).map((a: any) => a.id).filter(Boolean);
        // Fetch ALL members with full data for live calculation
        const { data: allMembers, error: membersError } = allAccountIds.length > 0
          ? await supabase
              .from("works_members")
              .select("*")
              .in("works_id", allAccountIds)
          : { data: [], error: null };
        if (membersError) throw membersError;

        // Group active members by works_id
        const membersByWorksId = new Map<string, any[]>();
        const countsByWorksId = new Map<string, { supporterCount: number; agentCount: number }>();
        for (const member of (allMembers || [])) {
          if (!isMemberActive(member.status)) continue;
          const worksId = String(member.works_id || "");
          if (!worksId) continue;
          const current = countsByWorksId.get(worksId) || { supporterCount: 0, agentCount: 0 };
          const normalizedType = normalizeMemberType(member.member_type);
          if (normalizedType === "supporter") current.supporterCount += 1;
          else if (normalizedType === "agent") current.agentCount += 1;
          countsByWorksId.set(worksId, current);

          const list = membersByWorksId.get(worksId) || [];
          list.push({ ...member, member_type: normalizedType });
          membersByWorksId.set(worksId, list);
        }

        // Use stored earnings from DB — live calculation happens only in works_get_members

        const enriched = (accounts || []).map((acc: any) => {
          const counters = countsByWorksId.get(String(acc.id)) || { supporterCount: 0, agentCount: 0 };
          const supporterPct = toFiniteNumber(acc.supporter_commission_pct);
          const agentPct = toFiniteNumber(acc.agent_commission_pct);
          const dynamicEarnings = Math.round(toFiniteNumber(acc.total_earnings_usd) * 100) / 100;
          const activeMembersCount = counters.supporterCount + counters.agentCount;

          return {
            ...acc,
            supporter_count: counters.supporterCount,
            agent_count: counters.agentCount,
            supporter_pct: supporterPct,
            agent_pct: agentPct,
            dynamic_earnings: dynamicEarnings,
            has_active_members: activeMembersCount > 0,
          };
        });

        enriched.sort((a: any, b: any) => {
          const activeOrder = Number(Boolean(b.has_active_members)) - Number(Boolean(a.has_active_members));
          if (activeOrder !== 0) return activeOrder;
          const aCreated = new Date(a.created_at || 0).getTime();
          const bCreated = new Date(b.created_at || 0).getTime();
          return bCreated - aCreated;
        });

        result = enriched;
        break;
      }

      case "works_get_members": {
        const { works_id } = data;
        const { data: members, error } = await supabase
          .from("works_members").select("*").eq("works_id", works_id)
          .order("created_at", { ascending: false });
        if (error) throw error;

        const { data: accRow } = await supabase
          .from("works_accounts")
          .select("supporter_commission_pct, agent_commission_pct")
          .eq("id", works_id).single();

        // Return stored data only — NO live API calls
        const enriched = (members || []).map((m: any) => ({
          ...m,
          member_type: m.member_type === "agency" ? "agent" : m.member_type,
          live_commission: m.total_commission_usd || 0,
          supporter_pct: accRow?.supporter_commission_pct || 2,
          agent_pct: accRow?.agent_commission_pct || 5,
          needs_refresh: true,
        }));

        // Sum stored commissions
        let totalDynamic = 0, supporterDynamic = 0, agentDynamic = 0;
        for (const m of enriched) {
          const v = Number(m.live_commission) || 0;
          totalDynamic += v;
          if (m.member_type === "supporter") supporterDynamic += v;
          if (m.member_type === "agent") agentDynamic += v;
        }

        result = {
          members: enriched,
          dynamic_earnings: Math.round(totalDynamic * 100) / 100,
          supporter_dynamic_earnings: Math.round(supporterDynamic * 100) / 100,
          agent_dynamic_earnings: Math.round(agentDynamic * 100) / 100,
        };
        break;
      }

      case "works_refresh_member": {
        const { member_id } = data;
        const { data: member } = await supabase
          .from("works_members").select("*").eq("id", member_id).single();
        if (!member) { result = { error: "Member not found" }; break; }

        const { data: acc } = await supabase
          .from("works_accounts").select("supporter_commission_pct, agent_commission_pct")
          .eq("id", member.works_id).single();

        const WARES_API = "https://hola-chat.com/wares-api.php?key=ghala2026actions";
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        const toNum = (v: unknown): number => {
          if (typeof v === "number") return Number.isFinite(v) ? v : 0;
          if (v && typeof v === "object" && "total" in (v as any)) return Number((v as any).total) || 0;
          return Number(v) || 0;
        };

        let liveData: any = {};
        const mType = member.member_type === "agency" ? "agent" : member.member_type;

        try {
          if (mType === "supporter") {
            const res = await fetch(`${WARES_API}&action=user-monthly-charges&uuid=${member.member_uuid}&month=${currentMonth}`, { signal: AbortSignal.timeout(15000) });
            const json = await res.json();
            const charges = toNum(json?.data?.total_charges ?? json?.total_charges ?? 0);
            const pct = toNum(member.commission_pct ?? acc?.supporter_commission_pct ?? 2);
            liveData = { monthly_charges: charges, live_commission: (charges / 7500) * (pct / 100) };
          } else if (mType === "agent" && member.agency_id) {
            const res = await fetch(`${WARES_API}&action=agency-salary&uuid=${member.member_uuid}&agency_id=${member.agency_id}`, { signal: AbortSignal.timeout(15000) });
            const json = await res.json();
            const salary = toNum(json?.data?.agency_salary ?? json?.salary ?? 0);
            const pct = toNum(member.commission_pct ?? acc?.agent_commission_pct ?? 5);
            liveData = { agency_salary: salary, live_commission: salary * pct / 100, agency_name: json?.data?.agency_name || "" };
          }
        } catch (e) {
          liveData = { error: "timeout", live_commission: member.total_commission_usd || 0 };
        }

        if (liveData.live_commission > 0) {
          await supabase.from("works_members").update({ total_commission_usd: liveData.live_commission }).eq("id", member_id);
        }

        result = { ...member, ...liveData, member_type: mType, needs_refresh: false };
        break;
      }

      case "works_update_account": {
        const { id: uaId, ...uaUpdates } = data;
        if (Object.keys(uaUpdates).length > 0) {
          const { error } = await supabase.from("works_accounts").update(uaUpdates).eq("id", uaId);
          if (error) throw error;
        }
        result = { success: true };
        break;
      }

      case "works_update_member": {
        const { id: umId, ...umUpdates } = data;
        if (Object.keys(umUpdates).length > 0) {
          const { error } = await supabase.from("works_members").update(umUpdates).eq("id", umId);
          if (error) throw error;
        }
        result = { success: true };
        break;
      }

      case "works_manual_add_member": {
        const { works_id, member_uuid, member_type, member_name } = data;
        if (!works_id || !member_uuid) throw new Error("works_id and member_uuid required");
        const { data: existing } = await supabase
          .from("works_members")
          .select("id")
          .eq("works_id", works_id)
          .eq("member_uuid", member_uuid)
          .maybeSingle();
        if (existing) throw new Error("العضو موجود بالفعل في هذا الفريق");
        const { error } = await supabase.from("works_members").insert({
          works_id,
          member_uuid: member_uuid.trim(),
          member_name: member_name || "عضو يدوي",
          member_type: member_type || "supporter",
          status: "active",
        });
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
        await supabase.from("works_withdrawals").update({ status: "approved", approved_at: new Date().toISOString() }).eq("id", awId);
        const accW = await supabase.from("works_accounts").select("balance_usd").eq("user_uuid", w.data.bd_uuid).single();
        if (accW.data) {
          await supabase.from("works_accounts").update({
            balance_usd: Math.max(0, (Number(accW.data.balance_usd) || 0) - Number(w.data.amount))
          }).eq("user_uuid", w.data.bd_uuid);
        }
        result = { success: true };
        break;
      }

      case "works_reject_withdrawal": {
        const { id: rwId, reason: rwReason } = data;
        await supabase.from("works_withdrawals").update({ status: "rejected", admin_note: rwReason, rejected_at: new Date().toISOString() }).eq("id", rwId);
        result = { success: true };
        break;
      }

      case "list_room_backgrounds": {
        const { data: rooms, error } = await supabase
          .from("room_background_requests")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(200);
        if (error) throw error;
        result = rooms;
        break;
      }

      case "approve_room_background": {
        const { id: rbId } = data;
        const { error } = await supabase
          .from("room_background_requests")
          .update({ status: "approved" })
          .eq("id", rbId);
        if (error) throw error;
        result = { success: true };
        break;
      }

      case "reject_room_background": {
        const { id: rrId, admin_note: rrNote } = data;
        const { error } = await supabase
          .from("room_background_requests")
          .update({ status: "rejected", admin_note: rrNote || "مرفوض" })
          .eq("id", rrId);
        if (error) throw error;
        result = { success: true };
        break;
      }

      case "works_full_merge": {
        let merged = 0, membersMerged = 0, logsMerged = 0, invitesMerged = 0, notifsMerged = 0, withdrawalsMerged = 0;

        const { data: bdAccounts } = await supabase.from("bd_commission_settings").select("*");

        for (const bd of (bdAccounts || [])) {
          const { data: existing } = await supabase
            .from("works_accounts").select("id").eq("user_uuid", bd.bd_uuid).maybeSingle();

          let worksAccId: string;

          if (existing) {
            worksAccId = existing.id;
          } else {
            const worksCode = "WK-" + Math.random().toString(36).substring(2, 8).toUpperCase();
            const status = (bd.is_active && bd.is_approved) ? "active" : "frozen";
            const { data: newAcc, error: accErr } = await supabase
              .from("works_accounts").insert({
                user_uuid: bd.bd_uuid,
                user_name: bd.bd_name || "",
                works_code: worksCode,
                status,
                total_earnings_usd: bd.total_earned || 0,
                balance_usd: bd.available_balance || 0,
                supporter_commission_pct: (bd.user_commission_pct || 2),
                agent_commission_pct: (bd.agency_commission_pct || 5),
              }).select("id").single();
            if (accErr) { console.error("Merge acc error:", accErr); continue; }
            worksAccId = newAcc.id;
            merged++;
          }

          // Migrate bd_members
          const { data: bdMembers } = await supabase.from("bd_members").select("*").eq("bd_uuid", bd.bd_uuid);
          for (const m of (bdMembers || [])) {
            const { data: em } = await supabase.from("works_members").select("id")
              .eq("works_id", worksAccId).eq("member_uuid", m.member_uuid).maybeSingle();
            if (em) continue;
            await supabase.from("works_members").insert({
              works_id: worksAccId,
              member_uuid: m.member_uuid,
              member_name: m.member_name || "",
              member_type: m.member_type === "agency" ? "agent" : m.member_type,
              status: m.is_active ? "active" : "removed",
              total_commission_usd: m.total_commission || 0,
            });
            membersMerged++;
          }

          // Migrate bd_commission_logs
          const { data: bdLogs } = await supabase.from("bd_commission_logs").select("*").eq("bd_uuid", bd.bd_uuid);
          for (const log of (bdLogs || [])) {
            const { data: el } = await supabase.from("works_commission_logs").select("id")
              .eq("bd_uuid", bd.bd_uuid).eq("member_uuid", log.member_uuid).eq("month", log.month).maybeSingle();
            if (el) continue;
            await supabase.from("works_commission_logs").insert({
              works_id: worksAccId,
              bd_uuid: bd.bd_uuid,
              member_uuid: log.member_uuid,
              member_type: log.member_type,
              month: log.month,
              source_amount: log.source_amount || 0,
              commission_pct: log.commission_pct || 0,
              amount: log.amount || 0,
            });
            logsMerged++;
          }

          // Migrate bd_member_invitations
          const { data: bdInvites } = await supabase.from("bd_member_invitations").select("*").eq("bd_uuid", bd.bd_uuid);
          for (const inv of (bdInvites || [])) {
            const { data: ei } = await supabase.from("works_invitations").select("id")
              .eq("inviter_uuid", bd.bd_uuid).eq("target_uuid", inv.member_uuid).maybeSingle();
            if (ei) continue;
            await supabase.from("works_invitations").insert({
              works_id: worksAccId,
              inviter_uuid: bd.bd_uuid,
              inviter_name: inv.bd_name || "",
              inviter_code: inv.bd_referral_code || "",
              target_uuid: inv.member_uuid,
              target_name: inv.member_name || "",
              member_type: inv.member_type,
              status: inv.status,
              terms_accepted: inv.terms_accepted,
              created_at: inv.created_at,
            });
            invitesMerged++;
          }

          // Migrate bd_withdrawals
          const { data: bdWithdrawals } = await supabase.from("bd_withdrawals").select("*").eq("bd_uuid", bd.bd_uuid);
          for (const w of (bdWithdrawals || [])) {
            const { data: ew } = await supabase.from("works_withdrawals").select("id")
              .eq("bd_uuid", bd.bd_uuid).eq("created_at", w.created_at).maybeSingle();
            if (ew) continue;
            await supabase.from("works_withdrawals").insert({
              works_id: worksAccId,
              bd_uuid: bd.bd_uuid,
              bd_name: w.bd_name || "",
              amount: w.amount || 0,
              status: w.status,
              transfer_type: w.transfer_type,
              country: w.country,
              admin_note: w.admin_note,
              recipient_name: w.recipient_name,
              recipient_phone: w.recipient_phone,
              transfer_number: w.transfer_number,
              receipt_url: w.receipt_url,
              approved_at: w.approved_at,
              completed_at: w.completed_at,
              rejected_at: w.rejected_at,
              created_at: w.created_at,
            });
            withdrawalsMerged++;
          }
        }

        // Migrate bd_notifications
        const { data: bdNotifs } = await supabase.from("bd_notifications").select("*");
        for (const n of (bdNotifs || [])) {
          const { data: en } = await supabase.from("works_notifications").select("id")
            .eq("target_uuid", n.target_uuid).eq("created_at", n.created_at).maybeSingle();
          if (en) continue;
          await supabase.from("works_notifications").insert({
            target_uuid: n.target_uuid,
            title: n.title,
            body: n.body,
            type: n.type,
            is_read: n.is_read,
            is_dismissed: n.is_dismissed,
            sent_by: n.sent_by,
            created_at: n.created_at,
          });
          notifsMerged++;
        }

        result = { success: true, accounts_merged: merged, members_merged: membersMerged, logs_merged: logsMerged, invites_merged: invitesMerged, notifs_merged: notifsMerged, withdrawals_merged: withdrawalsMerged };
        break;
      }

      // First-login password change for moderator accounts
      case "admin_first_setup": {
        const { new_password, phone } = data || {};
        if (!new_password || new_password.length < 4) throw new Error("كلمة المرور يجب أن تكون 4 أحرف على الأقل");
        
        const currentUsername = username;
        // Only moderators from DB need first-setup
        const { data: mod, error: modErr } = await supabase
          .from("admin_accounts")
          .select("id, username")
          .eq("username", currentUsername)
          .eq("is_active", true)
          .single();
        if (modErr || !mod) throw new Error("حساب غير موجود");
        
        const newHash = await hashPassword(new_password);
        const updatePayload: any = { password_hash: newHash, updated_at: new Date().toISOString() };
        if (phone) updatePayload.phone = phone;
        
        const { error: updErr } = await supabase
          .from("admin_accounts")
          .update(updatePayload)
          .eq("id", mod.id);
        if (updErr) throw new Error("فشل تحديث البيانات: " + updErr.message);
        
        await logAudit({ action: "first_setup", target: currentUsername });
        result = { success: true, message: "تم تحديث البيانات بنجاح" };
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
