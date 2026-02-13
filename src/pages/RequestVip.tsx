import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Crown, Check, Lock, Users, Calendar, AlertCircle } from "lucide-react";
import MobileLayout from "@/components/MobileLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface VipTier {
  level: number;
  label: string;
  days: number;
  available: boolean;
  requiresCheck: boolean;
  color: string;
}

const vipTiers: VipTier[] = [
  { level: 1, label: "VIP 1", days: 10, available: true, requiresCheck: false, color: "from-amber-600/20 to-amber-800/5" },
  { level: 2, label: "VIP 2", days: 10, available: true, requiresCheck: false, color: "from-amber-500/20 to-orange-700/5" },
  { level: 3, label: "VIP 3", days: 10, available: true, requiresCheck: false, color: "from-yellow-500/20 to-amber-700/5" },
  { level: 4, label: "VIP 4", days: 10, available: false, requiresCheck: true, color: "from-yellow-400/20 to-yellow-700/5" },
  { level: 5, label: "VIP 5", days: 10, available: false, requiresCheck: true, color: "from-yellow-300/20 to-yellow-600/5" },
  { level: 6, label: "VIP 6", days: 10, available: false, requiresCheck: true, color: "from-yellow-200/20 to-yellow-500/5" },
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
  const [alreadyRequested, setAlreadyRequested] = useState<{ requested: boolean; level: number | null; date: string | null }>({ requested: false, level: null, date: null });

  useEffect(() => {
    if (!user) return;
    const checkDb = async () => {
      setChecking(true);
      const currentMonth = getCurrentMonth();
      const { data } = await supabase
        .from("vip_requests")
        .select("vip_level, created_at")
        .eq("user_uuid", user.uuid)
        .eq("request_month", currentMonth)
        .maybeSingle();
      if (data) {
        setAlreadyRequested({ requested: true, level: (data as any).vip_level, date: (data as any).created_at });
      }
      setChecking(false);
    };
    checkDb();
  }, [user]);

  if (!user) { navigate("/"); return null; }

  const isAgent = user.type_user >= 3;

  const handleRequest = async () => {
    if (selectedVip === null) return;
    if (!isAgent && alreadyRequested.requested) {
      setError("لقد استخدمت طلبك هذا الشهر.");
      return;
    }
    setLoading(true); setError("");
    try {
      const { data, error: fnError } = await supabase.functions.invoke("gala-request", {
        body: { uuid: user.uuid, type: "vip", value: selectedVip, user_name: user.name },
      });
      if (fnError) { setError("حدث خطأ. حاول مرة أخرى."); setLoading(false); return; }
      if (!data?.success) { setError(data?.error || "فشل الطلب."); setLoading(false); return; }
      if (!isAgent) {
        setAlreadyRequested({ requested: true, level: selectedVip, date: new Date().toISOString() });
      }
      setSubmitted(true);
    } catch { setError("حدث خطأ غير متوقع."); } finally { setLoading(false); }
  };

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
                  {isAgent ? "يمكنك رفع طلب VIP لـ 5 أشخاص شهرياً" : "مرة واحدة فقط شهرياً (10 أيام)"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Already requested warning */}
        {!isAgent && alreadyRequested.requested && (
          <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] font-bold text-foreground">تم استخدام طلبك هذا الشهر</p>
              <p className="text-[10px] text-muted-foreground">VIP {alreadyRequested.level} بتاريخ {new Date(alreadyRequested.date!).toLocaleDateString("ar-SA")}</p>
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
                  const isLocked = !tier.available && !isAgent;
                  const isDisabled = isLocked || (!isAgent && alreadyRequested.requested);
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
                        {tier.available || isAgent ? `مجاني • ${tier.days} أيام` : "يتطلب شروط"}
                      </span>
                      {isSelected && <Check className="w-4 h-4 text-primary" />}
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
                <p className="text-xs font-bold text-foreground">تم تفعيل VIP {selectedVip} بنجاح! 🎉</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">المدة: 10 أيام</p>
              </div>
            ) : (
              <button
                onClick={handleRequest}
                disabled={selectedVip === null || loading || (!isAgent && alreadyRequested.requested)}
                className="w-full h-10 gold-gradient rounded-xl text-primary-foreground font-bold text-sm flex items-center justify-center gap-1.5 disabled:opacity-40 active:scale-[0.98] transition-transform"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  <>
                    <Crown className="w-4 h-4" />
                    {!isAgent && alreadyRequested.requested ? "تم استخدام طلبك" : "تقديم الطلب"}
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
