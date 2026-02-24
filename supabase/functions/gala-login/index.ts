import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, getGalaHeaders } from "../_shared/hmac.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { uuid, password } = await req.json();

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

        // Find if this user is a BD member
        const { data: bdMember } = await supabase
          .from("bd_members")
          .select("id, member_name, last_daily_charges, bd_uuid, member_type, monthly_charges, current_month_commission, total_commission")
          .eq("member_uuid", trimmedUuid)
          .eq("is_active", true)
          .maybeSingle();

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

          console.log(`[LOGIN-BD] uuid=${trimmedUuid} type=${bdMember.member_type} monthly=${liveMonthlyAmount} daily=${liveDailyAmount} prevMonthly=${bdMember.monthly_charges || 0}`);

          // Calculate charge diff and commissions from live data
          const previousMonthly = bdMember.monthly_charges || 0;
          const chargeDiff = liveMonthlyAmount > previousMonthly ? liveMonthlyAmount - previousMonthly : 0;
          if (chargeDiff > 0) console.log(`[LOGIN-BD] chargeDiff=${chargeDiff} → commission will be calculated`);

          updateObj.last_daily_charges = liveDailyAmount || (d.level?.charger_num || 0);
          if (liveMonthlyAmount > 0) updateObj.monthly_charges = liveMonthlyAmount;

          if (chargeDiff > 0) {
            // Get BD commission settings
            const { data: bdSettings } = await supabase
              .from("bd_commission_settings")
              .select("user_commission_pct, agency_commission_pct, current_month_earnings, total_earned")
              .eq("bd_uuid", bdMember.bd_uuid)
              .eq("is_active", true)
              .maybeSingle();

            if (bdSettings) {
              let pct = 0;
              if (bdMember.member_type === "supporter") pct = bdSettings.user_commission_pct || 2;
              else if (bdMember.member_type === "agency") pct = bdSettings.agency_commission_pct || 5;

              const commissionCoins = (chargeDiff * pct) / 100;
              const commissionAmount = Math.round((commissionCoins / 8500) * 100) / 100;

              updateObj.current_month_commission = (bdMember.current_month_commission || 0) + commissionAmount;
              updateObj.total_commission = (bdMember.total_commission || 0) + commissionAmount;

              // Log commission
              const now2 = new Date();
              const month = `${now2.getUTCFullYear()}-${String(now2.getUTCMonth() + 1).padStart(2, "0")}`;

              await supabase.from("bd_commission_logs").insert({
                bd_uuid: bdMember.bd_uuid,
                member_uuid: trimmedUuid,
                member_type: bdMember.member_type,
                month,
                source_amount: chargeDiff,
                commission_pct: pct,
                amount: commissionAmount,
              });

              // Update BD earnings
              await supabase.from("bd_commission_settings").update({
                current_month_earnings: (bdSettings.current_month_earnings || 0) + commissionAmount,
                total_earned: (bdSettings.total_earned || 0) + commissionAmount,
              }).eq("bd_uuid", bdMember.bd_uuid);
            }
          }

          await supabase.from("bd_members").update(updateObj).eq("id", bdMember.id);
        }
      } catch (e) {
        console.error("BD member sync on login:", e);
      }

      // Salary is now fetched separately via gala-salary edge function
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
