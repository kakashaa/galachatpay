import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, getGalaHeaders } from "../_shared/hmac.ts";

// AES-GCM encryption for session tokens (password never stored in plaintext on client)
async function deriveAesKey(secret: string): Promise<CryptoKey> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", hash, "AES-GCM", false, ["encrypt", "decrypt"]);
}

async function encryptForToken(password: string, uuid: string): Promise<string> {
  const secret = Deno.env.get("GALA_API_SECRET") || "fallback_secret_key_2024";
  const key = await deriveAesKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const payload = JSON.stringify({ p: password, u: uuid, t: Date.now() });
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(payload));
  const combined = new Uint8Array(iv.length + new Uint8Array(encrypted).length);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  return btoa(String.fromCharCode(...combined));
}

async function decryptFromToken(token: string): Promise<{ p: string; u: string; t: number } | null> {
  try {
    const secret = Deno.env.get("GALA_API_SECRET") || "fallback_secret_key_2024";
    const key = await deriveAesKey(secret);
    const combined = Uint8Array.from(atob(token), c => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
    return JSON.parse(new TextDecoder().decode(decrypted));
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    let { uuid, password } = body;
    const { session_token } = body;

    // If session_token provided, decrypt to get password (for refresh/verify)
    if (session_token && !password) {
      const decoded = await decryptFromToken(session_token);
      if (!decoded) {
        return new Response(
          JSON.stringify({ success: false, error: "جلسة غير صالحة", session_expired: true }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      // Check 8-hour expiry
      if (Date.now() - decoded.t > 8 * 60 * 60 * 1000) {
        return new Response(
          JSON.stringify({ success: false, error: "انتهت الجلسة، سجّل دخولك مرة أخرى", session_expired: true }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      password = decoded.p;
      if (!uuid) uuid = decoded.u;
    }

    if (!uuid || !password) {
      return new Response(
        JSON.stringify({ success: false, error: "uuid and password are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase for login attempts tracking
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check if this UUID is blocked
    const { data: attempt } = await supabase
      .from("login_attempts")
      .select("*")
      .eq("target_uuid", uuid.trim())
      .maybeSingle();

    if (attempt) {
      // Check permanent block
      if (attempt.is_permanently_blocked) {
        return new Response(
          JSON.stringify({
            success: false,
            blocked: true,
            permanent: true,
            error: "تم حظر هذا الحساب نهائياً بسبب محاولات دخول متكررة خاطئة. تواصل مع الإدارة لفك الحظر.",
            block_count: attempt.block_count,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check temporary block
      if (attempt.blocked_until) {
        const blockedUntil = new Date(attempt.blocked_until);
        const now = new Date();
        if (now < blockedUntil) {
          const remainingMs = blockedUntil.getTime() - now.getTime();
          const remainingMinutes = Math.ceil(remainingMs / 60000);
          const hours = Math.floor(remainingMinutes / 60);
          const mins = remainingMinutes % 60;
          const timeStr = hours > 0 ? `${hours} ساعة و ${mins} دقيقة` : `${mins} دقيقة`;

          return new Response(
            JSON.stringify({
              success: false,
              blocked: true,
              permanent: false,
              error: `تم حظر هذا الحساب مؤقتاً بسبب محاولات دخول خاطئة متكررة. يُفك الحظر بعد ${timeStr}.`,
              blocked_until: attempt.blocked_until,
              block_count: attempt.block_count,
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // Proceed with actual login
    const BASE_URL = Deno.env.get("GALA_API_BASE_URL");
    if (!BASE_URL) throw new Error("GALA_API_BASE_URL is not configured");

    const endpoint = "auth/login/uuid";
    const signPath = "api/newWebsite/" + endpoint;
    const headers = await getGalaHeaders("POST", signPath);

    const url = BASE_URL.replace(/\/+$/, "") + "/" + endpoint;
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ uuid: uuid.trim(), password }),
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.error("Non-JSON response:", text.substring(0, 200));
      return new Response(
        JSON.stringify({ success: false, error: "API returned invalid response. Check BASE_URL." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!response.ok || !data.success) {
      // Login failed — increment failed attempts
      const currentAttempts = attempt?.failed_attempts || 0;
      const currentBlockCount = attempt?.block_count || 0;
      const newAttempts = currentAttempts + 1;

      let blocked_until: string | null = null;
      let is_permanently_blocked = false;
      let newBlockCount = currentBlockCount;
      let warningMsg = "";

      if (newAttempts >= 5) {
        newBlockCount = currentBlockCount + 1;

        if (newBlockCount === 1) {
          // First block: 3 hours
          const dt = new Date();
          dt.setHours(dt.getHours() + 3);
          blocked_until = dt.toISOString();
          warningMsg = "⚠️ تحذير أول: تم حظر الحساب لمدة 3 ساعات بسبب 5 محاولات دخول خاطئة.";
        } else if (newBlockCount === 2) {
          // Second block: 10 hours
          const dt = new Date();
          dt.setHours(dt.getHours() + 10);
          blocked_until = dt.toISOString();
          warningMsg = "⚠️ تحذير ثاني: تم حظر الحساب لمدة 10 ساعات. المحاولة القادمة ستؤدي لحظر دائم!";
        } else {
          // Third+ block: permanent
          is_permanently_blocked = true;
          warningMsg = "🚫 تم حظر الحساب نهائياً. تواصل مع الإدارة لفك الحظر.";
        }

        // Upsert with reset attempts to 0 and new block
        await supabase.from("login_attempts").upsert({
          target_uuid: uuid.trim(),
          failed_attempts: 0,
          block_count: newBlockCount,
          blocked_until,
          is_permanently_blocked,
        }, { onConflict: "target_uuid" });

        return new Response(
          JSON.stringify({
            success: false,
            blocked: true,
            permanent: is_permanently_blocked,
            error: warningMsg,
            blocked_until,
            block_count: newBlockCount,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Not yet 5 attempts, just increment
      const remaining = 5 - newAttempts;
      await supabase.from("login_attempts").upsert({
        target_uuid: uuid.trim(),
        failed_attempts: newAttempts,
        block_count: currentBlockCount,
        blocked_until: attempt?.blocked_until || null,
        is_permanently_blocked: false,
      }, { onConflict: "target_uuid" });

      return new Response(
        JSON.stringify({
          success: false,
          error: data.message || data.error || "Login failed",
          api_status: response.status,
          remaining_attempts: remaining,
          warning: remaining <= 2 ? `⚠️ تبقى لك ${remaining} محاولة فقط قبل حظر الحساب!` : null,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Login succeeded — reset attempts
    if (attempt) {
      await supabase.from("login_attempts").update({
        failed_attempts: 0,
        blocked_until: null,
      }).eq("target_uuid", uuid.trim());
    }

    // Derive storage base URL from API base URL
    const storageBase = BASE_URL.replace(/\/api\/newWebsite\/?$/, "").replace(/\/+$/, "") + "/storage/";

    const fullUrl = (path: string | null | undefined): string => {
      if (!path) return "";
      if (path.startsWith("http")) return path;
      return storageBase + path;
    };

    if (data.data) {
      const d = data.data;
      console.log(`[LOGIN-DEBUG] my_store raw:`, JSON.stringify(d.my_store));
      // Debug: log agency-related fields from login response
      const agencyKeys = Object.keys(d).filter(k => k.toLowerCase().includes('agenc') || k.toLowerCase().includes('salary') || k.toLowerCase().includes('host'));
      console.log(`[LOGIN-DEBUG] agency-related keys:`, agencyKeys, `agency:`, JSON.stringify(d.agency)?.substring(0, 500));
      // type resolution handled client-side via resolveUserType
      if (d.profile?.image) d.profile.image = fullUrl(d.profile.image);
      if (d.profile?.cover) d.profile.cover = fullUrl(d.profile.cover);
      if (d.level?.receiver_img) d.level.receiver_img = fullUrl(d.level.receiver_img);
      if (d.level?.sender_img) d.level.sender_img = fullUrl(d.level.sender_img);
      if (d.level?.charger_img) d.level.charger_img = fullUrl(d.level.charger_img);
      if (d.country?.flag) d.country.flag = fullUrl(d.country.flag);

      // Auto-update BD member name, charger data & calculate commissions on login
      // Uses the new BD Data API for accurate real-time data
      try {
        const trimmedUuid = uuid.trim();
        const currentName = d.name || "";
        const typeUser = d.type_user || 0;

        const BD_API_URL = "https://hola-chat.com/bd-data-api.php";
        const BD_API_KEY = "ghala2026actions";

        // Find if this user is a works member
        const { data: worksMember } = await supabase
          .from("works_members")
          .select("id, member_name, member_type, works_id, total_commission_usd")
          .eq("member_uuid", trimmedUuid)
          .eq("status", "active")
          .maybeSingle();

        const bdMember = worksMember ? {
          id: worksMember.id,
          member_name: worksMember.member_name,
          member_type: worksMember.member_type === "agent" ? "agency" : worksMember.member_type,
          bd_uuid: worksMember.works_id,
          last_daily_charges: 0,
          monthly_charges: 0,
          current_month_commission: 0,
          total_commission: worksMember.total_commission_usd || 0,
        } : null;

        if (bdMember) {
          const updateObj: Record<string, unknown> = {
            type_user: typeUser,
          };

          // Update name if changed
          if (currentName && currentName !== bdMember.member_name) {
            updateObj.member_name = currentName;
          }

          // Fetch real-time data from BD API based on member type
          let liveMonthlyAmount = 0;
          let liveDailyAmount = 0;
          let apiFailed = false;

          try {
            if (bdMember.member_type === "supporter") {
              const chargeRes = await fetch(`${BD_API_URL}?key=${BD_API_KEY}&action=user-charges&uuid=${trimmedUuid}`, { signal: AbortSignal.timeout(15000) });
              if (chargeRes.ok) {
                const chargeData = await chargeRes.json();
                console.log(`[LOGIN-BD-RAW] user-charges response for ${trimmedUuid}:`, JSON.stringify(chargeData));
              if (chargeData?.charges) {
                  liveMonthlyAmount = typeof chargeData.charges.month === 'object' ? (chargeData.charges.month.total || 0) : (chargeData.charges.month || 0);
                  liveDailyAmount = typeof chargeData.charges.today === 'object' ? (chargeData.charges.today.total || 0) : (chargeData.charges.today || 0);
                }
              } else { const errText = await chargeRes.text(); console.log(`[LOGIN-BD-RAW] user-charges FAILED for ${trimmedUuid}: ${chargeRes.status} ${errText}`); apiFailed = true; }
            } else if (bdMember.member_type === "agency") {
              const incomeRes = await fetch(`${BD_API_URL}?key=${BD_API_KEY}&action=agency-income&uuid=${trimmedUuid}`, { signal: AbortSignal.timeout(15000) });
              if (incomeRes.ok) {
                const incomeData = await incomeRes.json();
                console.log(`[LOGIN-SALARY-DEBUG] agency-income response for ${trimmedUuid}:`, JSON.stringify(incomeData));
              if (incomeData?.commission) {
                  liveMonthlyAmount = typeof incomeData.commission.month === 'object' ? (incomeData.commission.month.total || 0) : (incomeData.commission.month || 0);
                  liveDailyAmount = typeof incomeData.commission.today === 'object' ? (incomeData.commission.today.total || 0) : (incomeData.commission.today || 0);
                }
                // Extract salary from agencies array using user's agency ID or UUID
                // API returns paginated results (50 per page), so we need to find the right page
                const userAgencyId = d.agency?.id;
                let foundAgency = false;
                
                // First check the already-fetched first page
                if (incomeData?.agencies && Array.isArray(incomeData.agencies)) {
                  const myAgency = incomeData.agencies.find((a: any) => 
                    String(a['معرف']) === String(userAgencyId) || 
                    String(a['العميل الصغير']) === String(userAgencyId) ||
                    String(a['المعرف المميز لصاحب الوكالة']) === String(trimmedUuid)
                  );
                  if (myAgency && myAgency['الراتب']) {
                    const salaryVal = parseFloat(myAgency['الراتب']) || 0;
                    console.log(`[LOGIN-SALARY] Found salary on page 1 for user ${trimmedUuid} agency ${userAgencyId}: $${salaryVal}`);
                    d.agency_salary = { amount_usd: salaryVal, cut: 0, is_paid: 0 };
                    foundAgency = true;
                  }
                }
                
                // If not found, try fetching all pages (API may not support &page param)
                if (!foundAgency && userAgencyId) {
                  // Try with per_page / limit params to get all agencies
                  const allParams = ['per_page=500', 'limit=500', 'all=true'];
                  for (const param of allParams) {
                    if (foundAgency) break;
                    try {
                      const allRes = await fetch(`${BD_API_URL}?key=${BD_API_KEY}&action=agency-income&uuid=${trimmedUuid}&${param}`, { signal: AbortSignal.timeout(15000) });
                      if (allRes.ok) {
                        const allData = await allRes.json();
                        console.log(`[LOGIN-SALARY] Tried ${param}: got ${allData?.agencies?.length || 0} agencies`);
                        if (allData?.agencies && Array.isArray(allData.agencies) && allData.agencies.length > 50) {
                          const myAgency = allData.agencies.find((a: any) => 
                            String(a['معرف']) === String(userAgencyId) || 
                            String(a['المعرف المميز لصاحب الوكالة']) === String(trimmedUuid)
                          );
                          if (myAgency && myAgency['الراتب']) {
                            const salaryVal = parseFloat(myAgency['الراتب']) || 0;
                            console.log(`[LOGIN-SALARY] Found via ${param}: $${salaryVal}`);
                            d.agency_salary = { amount_usd: salaryVal, cut: 0, is_paid: 0 };
                            foundAgency = true;
                          }
                        }
                      }
                    } catch (e) { /* skip */ }
                  }
                  
                  // Last resort: paginate sequentially through all pages
                  if (!foundAgency) {
                    for (let page = 2; page <= 10 && !foundAgency; page++) {
                      try {
                        const pageRes = await fetch(`${BD_API_URL}?key=${BD_API_KEY}&action=agency-income&uuid=${trimmedUuid}&page=${page}`, { signal: AbortSignal.timeout(8000) });
                        if (pageRes.ok) {
                          const pageData = await pageRes.json();
                          const agencies = pageData?.agencies;
                          if (!agencies || !Array.isArray(agencies) || agencies.length === 0) {
                            console.log(`[LOGIN-SALARY] Page ${page}: empty, stopping`);
                            break;
                          }
                          console.log(`[LOGIN-SALARY] Page ${page}: ${agencies.length} agencies, IDs: ${agencies.slice(0,3).map((a:any)=>a['معرف']).join(',')}`);
                          const myAgency = agencies.find((a: any) => 
                            String(a['معرف']) === String(userAgencyId) || 
                            String(a['المعرف المميز لصاحب الوكالة']) === String(trimmedUuid)
                          );
                          if (myAgency && myAgency['الراتب']) {
                            const salaryVal = parseFloat(myAgency['الراتب']) || 0;
                            console.log(`[LOGIN-SALARY] Found on page ${page}: $${salaryVal}`);
                            d.agency_salary = { amount_usd: salaryVal, cut: 0, is_paid: 0 };
                            foundAgency = true;
                          }
                        }
                      } catch (e) { /* skip */ }
                    }
                  }
                }
                
                if (!foundAgency) {
                  console.log(`[LOGIN-SALARY] Agency not found after pagination. agencyId=${userAgencyId}, uuid=${trimmedUuid}`);
                }
              } else { await incomeRes.text(); apiFailed = true; }
            }
          } catch (apiErr) {
            console.error("BD API fetch on login:", apiErr);
            apiFailed = true;
          }

          // Fallback: use charger_num from login response when BD API fails
          if (apiFailed && liveMonthlyAmount === 0) {
            const chargerNum = d.level?.charger_num || 0;
            if (chargerNum > 0) {
              liveMonthlyAmount = chargerNum;
              liveDailyAmount = chargerNum;
              console.log(`[LOGIN-BD-FALLBACK] Using charger_num=${chargerNum} as fallback for uuid=${trimmedUuid}`);
            }
          }

          console.log(`[LOGIN-BD] uuid=${trimmedUuid} type=${bdMember.member_type} monthly=${liveMonthlyAmount} daily=${liveDailyAmount} (commission=manual_only)`);

          // Only update charge tracking data - NO automatic commission calculation
          // Commissions are managed exclusively by admin via the dashboard
          updateObj.last_daily_charges = liveDailyAmount || (d.level?.charger_num || 0);
          if (liveMonthlyAmount > 0) updateObj.monthly_charges = liveMonthlyAmount;

          await supabase.from("works_members").update(updateObj).eq("id", bdMember.id);
        }
      } catch (e) {
        console.error("BD member sync on login:", e);
      }

      // Salary is now fetched separately via gala-salary edge function
    }

    // Generate encrypted session token (password encrypted, not stored in plaintext on client)
    const newSessionToken = await encryptForToken(password, uuid.trim());
    if (data.session_token === undefined) {
      data.session_token = newSessionToken;
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("gala-login error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
