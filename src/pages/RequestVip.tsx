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
  { level: 1, label: "VIP 1", days: 10, color: "from-amber-600/20 to-amber-800/5" },
  { level: 2, label: "VIP 2", days: 10, color: "from-amber-500/20 to-orange-700/5" },
  { level: 3, label: "VIP 3", days: 10, color: "from-yellow-500/20 to-amber-700/5" },
  { level: 4, label: "VIP 4", days: 10, color: "from-yellow-400/20 to-yellow-700/5" },
  { level: 5, label: "VIP 5", days: 10, color: "from-yellow-300/20 to-yellow-600/5" },
  { level: 6, label: "VIP 6", days: 10, color: "from-yellow-200/20 to-yellow-500/5" },
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
  const [usedTotal, setUsedTotal] = useState(0);         // total requests this month (for regular users)
  const [usedHighVip, setUsedHighVip] = useState(0);     // VIP 4-5 requests this month (for agents)
  const [giftedRecipients, setGiftedRecipients] = useState<string[]>([]); // already gifted IDs

  useEffect(() => {
    if (!user) return;
    const checkDb = async () => {
      setChecking(true);
      const currentMonth = getCurrentMonth();

      const { data: requests } = await supabase
        .from("vip_requests")
        .select("vip_level, created_at, recipient_uuid")
        .eq("user_uuid", user.uuid)
        .eq("request_month", currentMonth);

      const allReqs = requests || [];
      setUsedTotal(allReqs.length);
      setUsedHighVip(allReqs.filter((r: any) => r.vip_level >= 4).length);
      setGiftedRecipients(allReqs.filter((r: any) => r.recipient_uuid).map((r: any) => r.recipient_uuid));
      setChecking(false);
    };
    checkDb();
  }, [user]);

  if (!user) { navigate("/"); return null; }

  const isAgent = user.type_user >= 2;

  // Determine which tiers to show and their state
  const getTierState = (level: number) => {
    if (!isAgent) {
      // Regular user/host: VIP 1-3 available, 4-6 locked
      if (level >= 4) return "locked_agent_only";
      if (usedTotal >= 1) return "used_up";
      return "available";
    }
    // Agents: VIP 1-5 available, VIP 6 locked
    if (level === 6) return "locked";
    if (level >= 4 && usedHighVip >= 5) return "used_up";
    return "available";
  };

  const handleRequest = async () => {
    if (selectedVip === null) return;
    if (mode === "gift" && !recipientId.trim()) {
      setError("أدخل معرف المستلم.");
      return;
    }
    if (mode === "gift" && giftedRecipients.includes(recipientId.trim())) {
      setError("لقد أهديت هذا المستخدم بالفعل هذا الشهر.");
      return;
    }

    setLoading(true); setError("");
    try {
      const payload: any = {
        uuid: user.uuid,
        type: "vip",
        value: selectedVip,
        user_name: user.name,
        type_user: user.type_user,
      };
      if (mode === "gift" && recipientId.trim()) {
        payload.recipient_uuid = recipientId.trim();
      }

      const { data, error: fnError } = await supabase.functions.invoke("gala-request", { body: payload });
      if (fnError) { setError("حدث خطأ. حاول مرة أخرى."); setLoading(false); return; }
      if (!data?.success) { setError(data?.error || "فشل الطلب."); setLoading(false); return; }

      // Update local state
      setUsedTotal(prev => prev + 1);
      if (selectedVip >= 4) setUsedHighVip(prev => prev + 1);
      if (mode === "gift" && recipientId.trim()) {
        setGiftedRecipients(prev => [...prev, recipientId.trim()]);
      }
      setSubmitted(true);
    } catch { setError("حدث خطأ غير متوقع."); } finally { setLoading(false); }
  };

  const regularLimitReached = !isAgent && usedTotal >= 1;

  return (
    <MobileLayout showHeader headerTitle="طلب VIP" onBack={() => navigate("/dashboard")}>
      <div className="px-4 py-3 space-y-3">
        <ServicePreviousRequests userUuid={user.uuid} serviceType="vip" />

        {/* Account type + limits */}
        <div className="glass-card p-3" dir="rtl">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full gold-gradient flex items-center justify-center flex-shrink-0">
              <Users className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-foreground">{userTypeLabels[user.type_user] || "مستخدم"}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <Calendar className="w-3 h-3 text-primary" />
                <p className="text-[10px] text-primary">
                  {isAgent
                    ? `VIP 4-5: متبقي ${Math.max(0, 5 - usedHighVip)} من 5 • VIP 1-3: غير محدود`
                    : `مرة واحدة شهرياً (10 أيام) • ${usedTotal >= 1 ? "تم الاستخدام" : "متاح"}`}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Already used warning (regular users) */}
        {regularLimitReached && (
          <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] font-bold text-foreground" dir="rtl">تم استخدام طلبك هذا الشهر</p>
          </div>
        )}

        {checking ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Self/Gift toggle (agents only) */}
            {isAgent && (
              <div className="flex gap-2" dir="rtl">
                <button
                  onClick={() => { setMode("self"); setSubmitted(false); setError(""); }}
                  className={`flex-1 h-9 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${mode === "self" ? "gold-gradient text-primary-foreground" : "glass-card text-muted-foreground"}`}
                >
                  <User className="w-3.5 h-3.5" /> لنفسي
                </button>
                <button
                  onClick={() => { setMode("gift"); setSubmitted(false); setError(""); }}
                  className={`flex-1 h-9 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${mode === "gift" ? "gold-gradient text-primary-foreground" : "glass-card text-muted-foreground"}`}
                >
                  <Gift className="w-3.5 h-3.5" /> إهداء لمستخدم
                </button>
              </div>
            )}

            {/* Recipient ID input (gift mode) */}
            {isAgent && mode === "gift" && (
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
                  const isLocked = state === "locked_agent_only" || state === "locked";
                  const isUsedUp = state === "used_up";
                  const isDisabled = isLocked || isUsedUp || regularLimitReached;
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
                        {state === "locked_agent_only"
                          ? "متاح فقط للوكلاء"
                          : state === "locked"
                            ? "غير متاح"
                            : isUsedUp
                              ? "تم استخدام الحد"
                              : `مجاني • ${tier.days} أيام`}
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
                    ? `تم إهداء VIP ${selectedVip} للمستخدم ${recipientId} بنجاح! 🎁`
                    : `تم تفعيل VIP ${selectedVip} بنجاح! 🎉`}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">المدة: 10 أيام</p>
              </div>
            ) : (
              <button
                onClick={handleRequest}
                disabled={selectedVip === null || loading || regularLimitReached}
                className="w-full h-10 gold-gradient rounded-xl text-primary-foreground font-bold text-sm flex items-center justify-center gap-1.5 disabled:opacity-40 active:scale-[0.98] transition-transform"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  <>
                    {mode === "gift" ? <Gift className="w-4 h-4" /> : <Crown className="w-4 h-4" />}
                    {regularLimitReached ? "تم استخدام طلبك" : mode === "gift" ? "إهداء VIP" : "تقديم الطلب"}
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
