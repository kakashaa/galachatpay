import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// API Keys — server-side only
const KEYS = {
  actions: Deno.env.get("GALA_ACTIONS_KEY") || "ghala2026actions",
  owner: Deno.env.get("GALA_OWNER_KEY") || "ghala2026owner",
  proxy: Deno.env.get("GALA_PROXY_KEY") || "ghala2026proxy",
};

// URLs — server-side only
const URLS: Record<string, string> = {
  "project-z": "https://hola-chat.com/project-z/api.php",
  "hola-chat": "https://hola-chat.com/wares-api.php",
  "bd-data": "https://hola-chat.com/bd-data-api.php",
  "aws": "https://hola-chat.com/admin-actions.php",
  "gala-api": "https://galalivechat.com/api",
  "db-proxy": "https://hola-chat.com/db-proxy.php",
};

// HMAC-SHA256 admin token verification
async function verifyAdminToken(token: string): Promise<{ username: string; role: string } | null> {
  try {
    const [payloadB64, sigHex] = token.split(".");
    if (!payloadB64 || !sigHex) return null;
    const payload = atob(payloadB64);
    const secret = Deno.env.get("ADMIN_TOKEN_SECRET") || "ghala_admin_token_secret_2026";
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
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

// Primary admin accounts (same auth model used in admin-manage)
const PRIMARY_ADMINS: Record<string, { role: "owner" | "super_admin" | "admin"; envKey: string }> = {
  naz: { role: "owner", envKey: "ADMIN_NAZ_PASSWORD" },
  blnawah: { role: "admin", envKey: "ADMIN_BLNAWAH_PASSWORD" },
};

// Allowed actions per target
const ALLOWED: Record<string, string[]> = {
  "project-z": [
    "admin_user_info", "admin_give_vip", "admin_change_uuid", "admin_ban_user",
    "admin_first_setup", "admin_login",
    "salary_check", "salary_withdraw", "salary_charge_manual", "salary_report",
    "salary_withdraw_approve", "salary_withdraw_reject", "salary_withdraw_list",
    "salary_charge_list", "salary_check_all", "my_salary_requests",
    "agent_login", "agent_dashboard", "agent_charge", "agent_history", "agent_stats",
    "agent_transactions", "agent_lookup_user", "agent_change_password",
    "agency_list", "agency_create", "agency_add_balance", "agency_salary_check",
    "agency_toggle", "agency_update",
    "admin_chat_list", "admin_chat_messages", "admin_chat_send",
    "support_open", "support_send", "support_messages", "support_close",
    "admin_action_log", "admin_online", "admin_heartbeat",
    "wa_notify", "wa_queue",
    "user_transfers", "get_avatar", "get_avatars",
    "update_user_avatar", "upload_custom_gift",
    "admin_charges_report", "admin_gift_logs",
    "otp_send", "otp_verify",
  ],
  "hola-chat": [
    "check-supporter", "check-agency",
    "promo-alerts", "promo-config", "monitor-query", "monitor-alerts",
    "agency-members", "agency-accept", "agency-requests",
    "approve", "reject", "submit-request", "list-requests", "my-requests",
    "ban-user", "ban-user-real", "unban-user-real",
    "user-monthly-charges", "agency-salary",
    "upload-room-background", "list-room-bg-requests",
    "approve-room-bg", "reject-room-bg",
    "wa-queue",
    "gift-sent-total", "gift-received-total",
    "user-full",
  ],
  "bd-data": [
    "user-monthly-charges", "user-profile", "user-info",
  ],
  "aws": [
    "user-info", "set-frame", "set-entry", "set-profile-entry", "set-necklace",
    "remove-frame", "remove-entry", "assign-ware", "user-wares",
    "change-uuid", "set-vip", "ban-user", "unban-user", "add-diamonds",
    "list-wares", "list-vips", "list-agencies", "agency-detail",
  ],
  "db-proxy": [
    "activity-feed", "user-diamonds", "withdraw-status", "withdraw-agency", "transfer",
    "salary-check", "salary-audit", "daily-summary",
    "gift-lookup", "gift-impact", "gift-deduct", "gift-restore", "deduct-diamonds",
    "top-senders", "top-receivers",
    "gifts-sent", "gifts-received", "charges-by-uuid",
    "reset-cash-used",
  ],
};

// Actions that require admin auth
const ADMIN_ONLY = new Set([
  "admin_give_vip", "admin_change_uuid", "admin_ban_user", "admin_first_setup",
  "salary_charge_manual", "salary_withdraw_approve", "salary_withdraw_reject",
  "ban-user", "ban-user-real", "unban-user", "unban-user-real", "add-diamonds", "set-vip",
  "promo-config", "agency-accept",
  "set-frame", "set-entry", "set-profile-entry", "set-necklace",
  "update_user_avatar", "upload_custom_gift",
  "gift-deduct", "gift-restore", "deduct-diamonds",
  "gifts-sent", "gifts-received", "charges-by-uuid",
  "reset-cash-used",
]);

// Owner-only actions
const OWNER_ONLY = new Set([
  "salary_charge_manual", "add-diamonds", "salary_withdraw_approve",
  "reset-cash-used",
]);

// Actions where upstream timeout should not crash UI
const TIMEOUT_TOLERANT_ACTIONS = new Set([
  "user-monthly-charges",
  "agency-salary",
  "salary_check_all",
  "activity-feed",
  "withdraw-status",
  "salary-check",
  "salary-audit",
  "daily-summary",
]);

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let currentAction = "";

  try {
    const body = await req.json();
    const { target, action, ...params } = body;
    currentAction = typeof action === "string" ? action : "";

    // 1. Validate target + action
    if (!target || !action) {
      return json({ error: "target و action مطلوبين" }, 400);
    }

    const allowed = ALLOWED[target as string];
    if (!allowed || !allowed.includes(action)) {
      console.error(`[gala-proxy] Blocked: target=${target} action=${action}`);
      return json({ error: "غير مسموح" }, 403);
    }

    // 2. Admin auth check for sensitive operations
    if (ADMIN_ONLY.has(action)) {
      const adminToken = params._admin_token;
      if (!adminToken) {
        return json({ error: "مطلوب تسجيل دخول أدمن" }, 401);
      }

      // Verify HMAC-signed token, with legacy fallback
      let tokenData = await verifyAdminToken(adminToken);
      
      // Backward compatibility: accept old plain btoa tokens
      if (!tokenData) {
        try {
          const legacy = JSON.parse(atob(adminToken.split(".")[0] || adminToken));
          if (legacy?.username) {
            tokenData = { username: legacy.username, role: legacy.role || "admin" };
            console.log("[gala-proxy] accepted legacy token for:", legacy.username);
          }
        } catch { /* not valid */ }
      }

      if (!tokenData) {
        return json({ error: "جلسة غير صالحة", auth_error: true }, 401);
      }

      const normalizedUsername = String(tokenData.username).trim().toLowerCase();
      let admin: { username: string; role: string } | null = null;

      const primaryAdmin = PRIMARY_ADMINS[normalizedUsername];
      if (primaryAdmin && Deno.env.get(primaryAdmin.envKey)) {
        admin = { username: normalizedUsername, role: primaryAdmin.role };
      } else {
        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
        const { data: dbAdmin } = await supabase
          .from("admin_accounts")
          .select("username, role")
          .ilike("username", tokenData.username)
          .eq("is_active", true)
          .single();
        admin = dbAdmin;
      }

      if (!admin) return json({ error: "جلسة غير صالحة" }, 401);

      // Owner-only check
      if (OWNER_ONLY.has(action) && admin.role !== "owner") {
        return json({ error: "صلاحية المالك فقط" }, 403);
      }

      delete params._admin_token;
    }

    // Always strip _admin_token even for non-admin actions (prevent leaking to upstream)
    if (params._admin_token) delete params._admin_token;

    // 3. Build the request
    const baseUrl = URLS[target as string];
    if (!baseUrl) return json({ error: "target غير معروف" }, 400);

    const key = target === "project-z" ? KEYS.owner :
                target === "bd-data" ? KEYS.actions : KEYS.actions;

    let url: string;
    let fetchOptions: RequestInit;

    if (target === "aws") {
      // AWS uses GET params for simple, POST for complex
      if (Object.keys(params).length > 2 || params._method === "POST") {
        fetchOptions = {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...params, key }),
        };
        url = `${baseUrl}?key=${key}&action=${action}`;
      } else {
        const queryParams = new URLSearchParams({ key, action, ...params });
        url = `${baseUrl}?${queryParams}`;
        fetchOptions = { method: "GET" };
      }
      delete (params as any)._method;
    } else if (target === "hola-chat" || target === "bd-data" || target === "db-proxy") {
      // db-proxy uses the proxy key; hola-chat/bd-data use actions key
      const targetKey = target === "db-proxy" ? KEYS.proxy : key;
      url = `${baseUrl}?key=${targetKey}&action=${action}`;
      // Append simple params as query string
      const simpleParams: Record<string, string> = {};
      const complexParams: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(params)) {
        if (typeof v === "string" || typeof v === "number") {
          simpleParams[k] = String(v);
        } else {
          complexParams[k] = v;
        }
      }
      // Add simple params to URL
      for (const [k, v] of Object.entries(simpleParams)) {
        url += `&${encodeURIComponent(k)}=${encodeURIComponent(v)}`;
      }

      if (Object.keys(complexParams).length > 0) {
        fetchOptions = {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...simpleParams, ...complexParams }),
        };
      } else if (params._post_body) {
        // Support raw POST body (e.g., transfer action)
        fetchOptions = {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: String(params._post_body),
        };
      } else if (Object.keys(params).length > 0 && req.method === "POST") {
        // POST with form data
        fetchOptions = {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
        };
      } else {
        fetchOptions = { method: "GET" };
      }
    } else if (target === "project-z") {
      // project-z uses JSON POST
      url = baseUrl;
      fetchOptions = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, admin_key: key, ...params }),
      };
    } else {
      return json({ error: "target غير مدعوم" }, 400);
    }

    // 4. Execute the request
    const timeout = 55000;
    const res = await fetch(url, { ...fetchOptions, signal: AbortSignal.timeout(timeout) });
    const text = await res.text();

    // Normalize upstream 4xx/5xx to 200 with error payload to prevent
    // the client from treating upstream errors as "edge function not found"
    if (res.status >= 400) {
      let parsed: unknown;
      try { parsed = JSON.parse(text); } catch { parsed = null; }
      return json({
        success: false,
        upstream_status: res.status,
        error: (parsed as any)?.error || (parsed as any)?.message || `Upstream returned ${res.status}`,
        data: parsed,
      }, 200);
    }

    return new Response(text, {
      status: res.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";

    const isTimeout =
      message.includes("Signal timed out") ||
      message.toLowerCase().includes("timed out") ||
      message.includes("aborted");

    const isNetworkDisconnect =
      message.toLowerCase().includes("connection error") ||
      message.toLowerCase().includes("sendrequest") ||
      message.toLowerCase().includes("unexpected-eof") ||
      message.toLowerCase().includes("peer closed connection") ||
      message.toLowerCase().includes("tls close_notify");

    if ((isTimeout || isNetworkDisconnect) && TIMEOUT_TOLERANT_ACTIONS.has(currentAction)) {
      console.warn(`[gala-proxy] transient upstream error tolerated for action=${currentAction}`);

      const safeData = currentAction === "activity-feed"
        ? { activities: [], summary: { danger_count: 0 } }
        : currentAction === "withdraw-status"
        ? { ok: true, host_salary: { current_month: 0, expected: 0, is_valid: true, total_unpaid: 0, total_cut: 0, available: 0, cash_used_this_month: false }, withdrawal_options: {} }
        : null;

      return json({
        success: false,
        timeout: isTimeout,
        transient_error: true,
        action: currentAction,
        data: safeData,
        message: isTimeout ? "Upstream timeout" : "Upstream connection dropped",
      }, 200);
    }

    console.error("[gala-proxy] Error:", message);
    return json({ error: message }, 500);
  }
});
