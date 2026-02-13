import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Crown, Check, Lock, Users, Calendar, AlertCircle, MessageCircle } from "lucide-react";
import MobileLayout from "@/components/MobileLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface VipTier {
  level: number;
  label: string;
  days: number;
  color: string;
}

const vipTiers: VipTier[] = [
  { level: 1, label: "VIP 1", days: 10, color: "from-amber-600/20 to-amber-800/5" },
  { level: 2, label: "VIP 2", days: 10, color: "from-amber-500/20 to-orange-700/5" },
  { level: 3, label: "VIP 3", days: 10, color: "from-yellow-500/20 to-amber-700/5" },
  { level: 4, label: "VIP 4", days: 10, color: "from-yellow-400/20 to-yellow-700/5" },
  { level: 5, label: "VIP 5", days: 10, color: "from-yellow-300/20 to-yellow-600/5" },
  { level: 6, label: "VIP 6", days: 10, color: "from-yellow-200/20 to-yellow-500/5" },
];

const userTypeLabels: Record<number, string> = {
  0: "مستخدم", 1: "مستخدم", 2: "مضيف",
  3: "وكيل مضيفين", 4: "وكيل شحن", 5: "وكيل شحن ومضيفين", 6: "مضيف ووكيل شحن",
};

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
  const [showVip6Message, setShowVip6Message] = useState(false);
  
  // Track requests per user
  const [monthlyRequests, setMonthlyRequests] = useState<{ vip_level: number; created_at: string }[]>([]);
  const [agentHighTierCount, setAgentHighTierCount] = useState(0); // count of VIP 4+5 requests
  const [regularUsed, setRegularUsed] = useState(false); // regular user already requested this month

  useEffect(() => {
    if (!user) return;
    const checkDb = async () => {
      setChecking(true);
      const currentMonth = getCurrentMonth();
      
      const { data: requests } = await supabase
        .from("vip_requests")
        .select("vip_level, created_at")
        .eq("user_uuid", user.uuid)
        .eq("request_month", currentMonth);
      
      const reqs = (requests || []) as { vip_level: number; created_at: string }[];
      setMonthlyRequests(reqs);
      
      const isAgent = user.type_user >= 3;
      if (isAgent) {
        // Count VIP 4 and 5 requests together for the 5-request limit
        const highTierCount = reqs.filter(r => r.vip_level === 4 || r.vip_level === 5).length;
        setAgentHighTierCount(highTierCount);
      } else {
        // Regular users: 1 request per month total
        setRegularUsed(reqs.length > 0);
      }
      
      setChecking(false);
    };
    checkDb();
  }, [user]);

  if (!user) { navigate("/"); return null; }

  const isAgent = user.type_user >= 3;

  const getTierStatus = (level: number): { disabled: boolean; reason: string } => {
    // VIP 6: blocked for everyone
    if (level === 6) {
      return { disabled: true, reason: "تواصل مع الإدارة" };
    }
    
    // VIP 4, 5: agents only
    if (level >= 4 && level <= 5) {
      if (!isAgent) {
        return { disabled: true, reason: "للوكلاء فقط" };
      }
      // Agents: max 5 requests for VIP 4+5 combined
      if (agentHighTierCount >= 5) {
        return { disabled: true, reason: "وصلت الحد الأقصى (5)" };
      }
      return { disabled: false, reason: "" };
    }
    
    // VIP 1, 2, 3: available for everyone
    if (!isAgent) {
      // Regular users: 1 request per month total
      if (regularUsed) {
        return { disabled: true, reason: "تم استخدام طلبك" };
      }
      return { disabled: false, reason: "" };
    }
    
    // Agents can request VIP 1-3 unlimited
    return { disabled: false, reason: "" };
  };

  const handleVipClick = (level: number) => {
    if (level === 6) {
      setShowVip6Message(true);
      setSelectedVip(null);
      return;
    }
    const status = getTierStatus(level);
    if (status.disabled) return;
    setShowVip6Message(false);
    setSelectedVip(level);
    setSubmitted(false);
    setError("");
  };

  const handleRequest = async () => {
    if (selectedVip === null || selectedVip === 6) return;
    const status = getTierStatus(selectedVip);
    if (status.disabled) { setError(status.reason); return; }
    
    setLoading(true); setError("");
    try {
      const { data, error: fnError } = await supabase.functions.invoke("gala-request", {
        body: { uuid: user.uuid, type: "vip", value: selectedVip, user_name: user.name, type_user: user.type_user },
      });
      if (fnError) { setError("حدث خطأ. حاول مرة أخرى."); setLoading(false); return; }
      if (!data?.success) { setError(data?.error || "فشل الطلب."); setLoading(false); return; }
      
      // Update local state
      if (isAgent && (selectedVip === 4 || selectedVip === 5)) {
        setAgentHighTierCount(prev => prev + 1);
      }
      if (!isAgent) {
        setRegularUsed(true);
      }
      setSubmitted(true);
    } catch { setError("حدث خطأ غير متوقع."); } finally { setLoading(false); }
  };

  const canSubmit = selectedVip !== null && selectedVip !== 6 && !getTierStatus(selectedVip).disabled;

  return (
    <MobileLayout showHeader headerTitle="طلب VIP" onBack={() => navigate("/dashboard")}>
      <div className="px-4 py-3 space-y-3">
        {/* Account type + monthly limit */}
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
                    ? `VIP 4-5: ${5 - agentHighTierCount} طلبات متبقية • VIP 1-3: غير محدود`
                    : "مرة واحدة فقط شهرياً (10 أيام)"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Regular user already used */}
        {!isAgent && regularUsed && monthlyRequests.length > 0 && (
          <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] font-bold text-foreground">تم استخدام طلبك هذا الشهر</p>
              <p className="text-[10px] text-muted-foreground">
                VIP {monthlyRequests[0].vip_level} بتاريخ {new Date(monthlyRequests[0].created_at).toLocaleDateString("ar-SA")}
              </p>
            </div>
          </div>
        )}

        {/* Agent high-tier limit reached */}
        {isAgent && agentHighTierCount >= 5 && (
          <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] font-bold text-foreground">وصلت حد VIP 4-5 لهذا الشهر (5 طلبات)</p>
              <p className="text-[10px] text-muted-foreground">يمكنك الاستمرار بطلب VIP 1-3 بدون حدود</p>
            </div>
          </div>
        )}

        {checking ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* VIP Grid */}
            <div>
              <h3 className="text-xs font-bold text-foreground mb-2" dir="rtl">اختر نوع الـ VIP</h3>
              <div className="grid grid-cols-2 gap-2">
                {vipTiers.map((tier) => {
                  const status = getTierStatus(tier.level);
                  const isSelected = selectedVip === tier.level;
                  const isVip6 = tier.level === 6;

                  return (
                    <button
                      key={tier.level}
                      onClick={() => handleVipClick(tier.level)}
                      className={`glass-card p-3 flex flex-col items-center gap-1.5 text-center transition-all bg-gradient-to-br ${tier.color} active:scale-95
                        ${isSelected ? "ring-2 ring-primary border-primary/40" : ""}
                        ${status.disabled && !isVip6 ? "opacity-40" : ""}
                        ${isVip6 ? "opacity-60 border-dashed" : ""}`}
                    >
                      <div className="w-10 h-10 rounded-xl gold-gradient flex items-center justify-center">
                        {isVip6 ? (
                          <MessageCircle className="w-4 h-4 text-primary-foreground/60" />
                        ) : status.disabled ? (
                          <Lock className="w-4 h-4 text-primary-foreground/60" />
                        ) : (
                          <Crown className="w-5 h-5 text-primary-foreground" />
                        )}
                      </div>
                      <p className="text-xs font-bold text-foreground">{tier.label}</p>
                      <span className="text-[9px] text-muted-foreground">
                        {isVip6
                          ? "تواصل مع الإدارة"
                          : status.disabled
                            ? status.reason
                            : `مجاني • ${tier.days} أيام`}
                      </span>
                      {isSelected && !isVip6 && <Check className="w-4 h-4 text-primary" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* VIP 6 message */}
            {showVip6Message && (
              <div className="p-3 bg-primary/10 border border-primary/20 rounded-xl flex items-start gap-2">
                <MessageCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[11px] font-bold text-foreground">VIP 6 غير متاح للطلب المباشر</p>
                  <p className="text-[10px] text-muted-foreground">يرجى التواصل مع الإدارة أو السوبر أدمن لطلب VIP 6</p>
                </div>
              </div>
            )}

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
                <p className="text-xs font-bold text-foreground">تم تفعيل VIP {selectedVip} بنجاح! 🎉</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">المدة: 10 أيام</p>
              </div>
            ) : (
              <button
                onClick={handleRequest}
                disabled={!canSubmit || loading}
                className="w-full h-10 gold-gradient rounded-xl text-primary-foreground font-bold text-sm flex items-center justify-center gap-1.5 disabled:opacity-40 active:scale-[0.98] transition-transform"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  <>
                    <Crown className="w-4 h-4" />
                    {canSubmit ? "تقديم الطلب" : "غير متاح"}
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
