import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Crown, Check, Lock, Users, Calendar, AlertCircle, Gift, User } from "lucide-react";
import MobileLayout from "@/components/MobileLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import ServicePreviousRequests from "@/components/ServicePreviousRequests";
import { userTypeLabels } from "@/utils/userTypeResolver";

interface VipTier {
  level: number;
  label: string;
  days: number;
  color: string;
}

const allVipTiers: VipTier[] = [
  { level: 1, label: "VIP 1", days: 7, color: "from-amber-600/20 to-amber-800/5" },
  { level: 2, label: "VIP 2", days: 7, color: "from-amber-500/20 to-orange-700/5" },
  { level: 3, label: "VIP 3", days: 7, color: "from-yellow-500/20 to-amber-700/5" },
  { level: 4, label: "VIP 4", days: 7, color: "from-yellow-400/20 to-yellow-700/5" },
  { level: 5, label: "VIP 5", days: 7, color: "from-yellow-300/20 to-yellow-600/5" },
  { level: 6, label: "VIP 6", days: 7, color: "from-yellow-200/20 to-yellow-500/5" },
];

const getCurrentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const RequestVip: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedVip, setSelectedVip] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"self" | "gift">("self");
  const [recipientId, setRecipientId] = useState("");

  // Limits state
  const [usedSelf, setUsedSelf] = useState(0);            // self requests this month
  const [usedGiftTotal, setUsedGiftTotal] = useState(0);  // total gifts this month
  const [usedPerLevel, setUsedPerLevel] = useState<Record<number, number>>({1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0});
  const [limitsPerLevel, setLimitsPerLevel] = useState<Record<number, number>>({1: 10, 2: 10, 3: 7, 4: 4, 5: 2, 6: 1});
  const [isTopAgent, setIsTopAgent] = useState(false);     // has custom overrides
  const [giftedRecipients, setGiftedRecipients] = useState<string[]>([]); // already gifted IDs

  useEffect(() => {
    if (!user) return;
    const checkDb = async () => {
      setChecking(true);
      const currentMonth = getCurrentMonth();

      const [reqResult, overrideResult] = await Promise.all([
        supabase
          .from("vip_requests")
          .select("vip_level, created_at, recipient_uuid")
          .eq("user_uuid", user.uuid)
          .eq("request_month", currentMonth),
        supabase
          .from("agent_vip_overrides")
          .select("vip4_limit, vip5_limit, vip6_limit")
          .eq("agent_uuid", user.uuid)
          .maybeSingle(),
      ]);

      const allReqs = reqResult.data || [];
      const selfCount = allReqs.filter((r: any) => !r.recipient_uuid).length;
      const giftCount = allReqs.filter((r: any) => r.recipient_uuid).length;
      setUsedSelf(selfCount);
      setUsedGiftTotal(giftCount);
      
      const perLevel: Record<number, number> = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0};
      for (const r of allReqs) {
        if (r.recipient_uuid) perLevel[r.vip_level] = (perLevel[r.vip_level] || 0) + 1;
      }
      setUsedPerLevel(perLevel);

      if (overrideResult.data) {
        setIsTopAgent(true);
        setLimitsPerLevel({
          1: 10, 2: 10, 3: 7,
          4: overrideResult.data.vip4_limit ?? 4,
          5: overrideResult.data.vip5_limit ?? 2,
          6: overrideResult.data.vip6_limit ?? 1,
        });
      } else {
        setIsTopAgent(false);
      }

      setGiftedRecipients(allReqs.filter((r: any) => r.recipient_uuid).map((r: any) => r.recipient_uuid));
      setChecking(false);
    };
    checkDb();
  }, [user]);

  if (!user) { navigate("/"); return null; }

  // Only host agency owners (type_user >= 2) can GIFT VIP
  const isHostAgencyOwner = user.type_user >= 2;

  // Rules:
  // SELF (everyone): VIP 1-3 only, once per month, 7 days
  // GIFT (host agency owners only): VIP 1-6 with limits per level
  const getTierState = (level: number) => {
    if (isHostAgencyOwner) {
      // Agent: same page for self+gift — uses per-level limits
      const limit = limitsPerLevel[level] ?? 0;
      if (limit <= 0) return "locked";
      if ((usedPerLevel[level] || 0) >= limit) return "used_up";
      return "available";
    } else {
      // Regular user / host / shipping agent: self only
      if (level >= 4) return "locked_vip_high"; // VIP 4-6 locked
      if (usedSelf >= 1) return "used_up";
      return "available";
    }
  };

  const getRemainingGifts = (level: number) => {
    const limit = limitsPerLevel[level] ?? 0;
    const used = usedPerLevel[level] || 0;
    return Math.max(0, limit - used);
  };

  const handleRequest = async () => {
    if (selectedVip === null) return;

    // For agents: if UUID entered = gift, if empty = self
    const isGifting = isHostAgencyOwner && recipientId.trim().length > 0;
    
    if (isGifting && giftedRecipients.includes(recipientId.trim())) {
      setError("لقد أهديت هذا المستخدم بالفعل هذا الشهر.");
      return;
    }

    setLoading(true); setError("");
    try {
      const targetUuid = isGifting ? recipientId.trim() : user.uuid;
      
      const payload: any = {
        uuid: user.uuid,
        type: "vip",
        value: selectedVip,
        user_name: user.name,
        type_user: user.type_user,
      };
      if (isGifting) {
        payload.recipient_uuid = targetUuid;
      }

      const { data, error: fnError } = await supabase.functions.invoke("gala-request", { body: payload });
      if (fnError) { setError("حدث خطأ. حاول مرة أخرى."); setLoading(false); return; }
      if (!data?.success) { setError(data?.error || "فشل الطلب."); setLoading(false); return; }

      // Update local state
      setUsedPerLevel(prev => ({ ...prev, [selectedVip]: (prev[selectedVip] || 0) + 1 }));
      if (isGifting) {
        setUsedGiftTotal(prev => prev + 1);
        setGiftedRecipients(prev => [...prev, recipientId.trim()]);
      } else {
        setUsedSelf(prev => prev + 1);
      }
      setSubmitted(true);
    } catch { setError("حدث خطأ غير متوقع."); } finally { setLoading(false); }
  };

  const selfLimitReached = usedSelf >= 1;

  return (
    <MobileLayout showHeader headerTitle="طلب VIP" onBack={() => navigate("/dashboard")}>
      <div className="px-4 py-3 space-y-3">
        <ServicePreviousRequests userUuid={user.uuid} serviceType="vip" />

        {/* Header card */}
        <div className="rounded-2xl bg-gradient-to-br from-amber-500/10 to-yellow-600/5 border border-amber-500/15 p-4" dir="rtl">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-amber-500/15 flex items-center justify-center">
              <Crown className="w-5 h-5 text-amber-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-foreground">{userTypeLabels[user.type_user] || "مستخدم"}</p>
              <p className="text-[10px] text-amber-400/80 mt-0.5">
                {isHostAgencyOwner ? "وكيل مضيفين — يمكنك الإهداء واللبس" : "يمكنك لبس VIP 1-3 فقط (مرة/شهر)"}
              </p>
            </div>
          </div>
        </div>

        {/* Rules info */}
        <div className="rounded-xl bg-primary/5 border border-primary/15 p-3 space-y-1.5" dir="rtl">
          <p className="text-[10px] font-bold text-primary flex items-center gap-1">📋 القواعد:</p>
          {isHostAgencyOwner ? (
            <>
              <p className="text-[9px] text-muted-foreground">• VIP 1-6 — تقدر تلبسه لنفسك أو ترسله لمستخدم آخر</p>
              <p className="text-[9px] text-muted-foreground">• كل مستوى عنده حد شهري (موضح أدناه)</p>
              <p className="text-[9px] text-muted-foreground">• المدة: 7 أيام لكل طلب</p>
            </>
          ) : (
            <>
              <p className="text-[9px] text-muted-foreground">• تقدر تلبس VIP 1-3 فقط — مرة واحدة بالشهر، 7 أيام</p>
              <p className="text-[9px] text-muted-foreground">• VIP 4-5-6 — اطلب من وكيل مضيفينك يرسل لك</p>
            </>
          )}
        </div>

        {checking ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Self/Gift toggle — agents see unified view, others see self-only */}
            {isHostAgencyOwner ? (
              <div className="rounded-xl bg-violet-500/10 border border-violet-500/20 p-3 text-center" dir="rtl">
                <p className="text-xs font-bold text-violet-400">👑 وكيل مضيفين — اختر VIP واكتب UUID المستلم (أو اتركه فارغ للبس لنفسك)</p>
              </div>
            ) : null}
            {!isHostAgencyOwner && (
            <div className="flex gap-2" dir="rtl">
              <button
                onClick={() => { setMode("self"); setSubmitted(false); setError(""); }}
                className="flex-1 h-10 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 bg-amber-500/15 text-amber-400 border border-amber-500/30"
              >
                <Crown className="w-3.5 h-3.5" /> لبس لنفسي
                </button>
                <button
                  onClick={() => {
                    if (!isHostAgencyOwner) return;
                    setMode("gift"); setSubmitted(false); setError("");
                  }}
                  disabled={!isHostAgencyOwner}
                  className={`flex-1 h-10 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    !isHostAgencyOwner ? "bg-muted/5 text-muted-foreground/30 cursor-not-allowed" :
                    mode === "gift" ? "bg-violet-500/15 text-violet-400 border border-violet-500/30" : "bg-muted/10 text-muted-foreground border border-border/10"
                  }`}
                >
                  <Gift className="w-3.5 h-3.5" /> 🔒 وكيل فقط
                </button>
              </div>
            )}

            {/* Gift limits summary (agents always show) */}
            {isHostAgencyOwner && (
              <div className="grid grid-cols-3 gap-1.5" dir="rtl">
                {allVipTiers.map(tier => {
                  const remaining = getRemainingGifts(tier.level);
                  const limit = limitsPerLevel[tier.level] || 0;
                  const used = usedPerLevel[tier.level] || 0;
                  return (
                    <div key={tier.level} className={`rounded-xl p-2 text-center ${remaining > 0 ? "bg-emerald-500/10 border border-emerald-500/15" : "bg-muted/10 border border-border/10"}`}>
                      <p className="text-[10px] font-bold text-foreground">{tier.label}</p>
                      <p className={`text-xs font-black ${remaining > 0 ? "text-emerald-400" : "text-muted-foreground"}`}>{remaining}/{limit}</p>
                      <p className="text-[8px] text-muted-foreground">متبقي</p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Self limit status */}
            {!isHostAgencyOwner && selfLimitReached && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-center">
                <p className="text-xs font-bold text-amber-400">🔒 تم استخدام طلبك هذا الشهر</p>
                <p className="text-[10px] text-muted-foreground mt-1">يمكنك اللبس مرة واحدة فقط في الشهر</p>
              </div>
            )}

            {/* Recipient ID input (agents always, others never) */}
            {isHostAgencyOwner && (
              <div dir="rtl">
                <label className="text-[10px] text-muted-foreground mb-1 block">أدخل معرف المستلم (UUID)</label>
                <input
                  type="text"
                  value={recipientId}
                  onChange={e => setRecipientId(e.target.value)}
                  placeholder="مثال: 1234567"
                  className="w-full h-9 rounded-xl bg-card/50 border border-border/30 px-3 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/40"
                  maxLength={64}
                />
              </div>
            )}

            {/* VIP Grid */}
            <div>
              <h3 className="text-xs font-bold text-foreground mb-2" dir="rtl">اختر نوع الـ VIP</h3>
              <div className="grid grid-cols-2 gap-2">
                {allVipTiers.map((tier) => {
                  const state = getTierState(tier.level);
                  const isLocked = state === "locked" || state === "locked_vip_high";
                  const isUsedUp = state === "used_up";
                  const isDisabled = isLocked || isUsedUp;
                  const isSelected = selectedVip === tier.level;

                  return (
                    <button
                      key={tier.level}
                      onClick={() => { if (!isDisabled) { setSelectedVip(tier.level); setSubmitted(false); setError(""); } }}
                      className={`glass-card p-3 flex flex-col items-center gap-1.5 text-center transition-all bg-gradient-to-br ${tier.color} active:scale-95
                        ${isSelected ? "ring-2 ring-primary border-primary/40" : ""}
                        ${isDisabled ? "opacity-40" : ""}`}
                    >
                      <div className="w-10 h-10 rounded-xl gold-gradient flex items-center justify-center">
                        {isLocked ? <Lock className="w-4 h-4 text-primary-foreground/60" /> : <Crown className="w-5 h-5 text-primary-foreground" />}
                      </div>
                      <p className="text-xs font-bold text-foreground">{tier.label}</p>
                      <span className="text-[9px] text-muted-foreground">
                        {state === "locked_vip_high"
                          ? "🔒 اطلب من وكيلك يرسل لك"
                          : state === "locked"
                            ? "🔒 غير متاح"
                            : isUsedUp
                              ? "❌ تم استخدام الحد"
                              : isHostAgencyOwner
                                ? `متبقي: ${getRemainingGifts(tier.level)} • ${tier.days} أيام`
                                : `مرة واحدة • ${tier.days} أيام`}
                      </span>
                      {isSelected && !isDisabled && <Check className="w-4 h-4 text-primary" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-1.5 p-2 bg-destructive/10 border border-destructive/15 rounded-lg">
                <AlertCircle className="w-3 h-3 text-destructive flex-shrink-0" />
                <p className="text-[10px] text-destructive">{error}</p>
              </div>
            )}

            {/* Submit / Success */}
            {submitted ? (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
                <Check className="w-6 h-6 text-emerald-400 mx-auto mb-1" />
                <p className="text-xs font-bold text-foreground">
                  {mode === "gift"
                    ? `تم إهداء VIP ${selectedVip} للمستخدم ${recipientId} بنجاح!`
                    : `تم تفعيل VIP ${selectedVip} بنجاح!`}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">المدة: 10 أيام</p>
              </div>
            ) : (
              <button
                onClick={handleRequest}
                disabled={selectedVip === null || loading || selfLimitReached}
                className="w-full h-10 gold-gradient rounded-xl text-primary-foreground font-bold text-sm flex items-center justify-center gap-1.5 disabled:opacity-40 active:scale-[0.98] transition-transform"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  <>
                    {mode === "gift" ? <Gift className="w-4 h-4" /> : <Crown className="w-4 h-4" />}
                    {selfLimitReached ? "تم استخدام طلبك" : mode === "gift" ? "إهداء VIP" : "تقديم الطلب"}
                  </>
                )}
              </button>
            )}
          </>
        )}
      </div>
    </MobileLayout>
  );
};

export default RequestVip;
