import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
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
  "project-z": "https://galachat.site/project-z/api.php",
  "hola-chat": "https://hola-chat.com/wares-api.php",
  "bd-data": "https://hola-chat.com/bd-data-api.php",
  "aws": "https://18.219.229.240/website/admin-actions.php",
  "gala-api": "https://galalivechat.com/api",
  "db-proxy": "https://hola-chat.com/db-proxy.php",
};

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
  ],
};

// Actions that require admin auth
const ADMIN_ONLY = new Set([
  "admin_give_vip", "admin_change_uuid", "admin_ban_user", "admin_first_setup",
  "salary_charge_manual", "salary_withdraw_approve", "salary_withdraw_reject",
  "ban-user", "ban-user-real", "unban-user", "unban-user-real", "add-diamonds", "set-vip",
  "promo-config", "wa_notify", "agency-accept",
  "set-frame", "set-entry", "set-profile-entry", "set-necklace",
  "update_user_avatar", "upload_custom_gift",
  "gift-deduct", "gift-restore", "deduct-diamonds",
  "gifts-sent", "gifts-received", "charges-by-uuid",
]);

// Owner-only actions
const OWNER_ONLY = new Set([
  "salary_charge_manual", "add-diamonds", "salary_withdraw_approve",
]);

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { target, action, ...params } = body;

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

      try {
        const decoded = JSON.parse(atob(adminToken));
        const decodedUsername = String(decoded?.username || "").trim();
        if (!decodedUsername) throw new Error("invalid");

        const normalizedUsername = decodedUsername.toLowerCase();
        let admin: { username: string; role: string } | null = null;

        // 1) Primary admins from env-backed accounts
        const primaryAdmin = PRIMARY_ADMINS[normalizedUsername];
        if (primaryAdmin && Deno.env.get(primaryAdmin.envKey)) {
          admin = { username: normalizedUsername, role: primaryAdmin.role };
        } else {
          // 2) Moderators/admins from DB
          const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
          const { data: dbAdmin } = await supabase
            .from("admin_accounts")
            .select("username, role")
            .ilike("username", decodedUsername)
            .eq("is_active", true)
            .single();

          admin = dbAdmin;
        }

        if (!admin) return json({ error: "جلسة غير صالحة" }, 401);

        // Owner-only check
        if (OWNER_ONLY.has(action) && admin.role !== "owner") {
          return json({ error: "صلاحية المالك فقط" }, 403);
        }
      } catch {
        return json({ error: "جلسة غير صالحة" }, 401);
      }

      // Remove internal param before forwarding
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
    const timeout = ADMIN_ONLY.has(action) ? 55000 : (target === "db-proxy" || target === "hola-chat") ? 120000 : 30000;
    const res = await fetch(url, { ...fetchOptions, signal: AbortSignal.timeout(timeout) });
    const text = await res.text();

    return new Response(text, {
      status: res.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[gala-proxy] Error:", message);
    return json({ error: message }, 500);
  }
});
