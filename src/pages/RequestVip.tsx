import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
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
  { level: 1, label: "VIP 1", days: 7, available: true, requiresCheck: false, color: "from-amber-600/30 to-amber-800/10" },
  { level: 2, label: "VIP 2", days: 7, available: true, requiresCheck: false, color: "from-amber-500/30 to-orange-700/10" },
  { level: 3, label: "VIP 3", days: 7, available: true, requiresCheck: false, color: "from-yellow-500/30 to-amber-700/10" },
  { level: 4, label: "VIP 4", days: 7, available: false, requiresCheck: true, color: "from-yellow-400/30 to-yellow-700/10" },
  { level: 5, label: "VIP 5", days: 7, available: false, requiresCheck: true, color: "from-yellow-300/30 to-yellow-600/10" },
  { level: 6, label: "VIP 6", days: 7, available: false, requiresCheck: true, color: "from-yellow-200/30 to-yellow-500/10" },
];

const userTypeLabels: Record<number, string> = {
  0: "مستخدم",
  1: "مستخدم",
  2: "مضيف",
  3: "وكيل مضيفين",
  4: "وكيل شحن",
  5: "وكيل شحن ومضيفين",
  6: "مضيف ووكيل شحن",
};

const VIP_REQUEST_KEY = "gala_vip_requested";

function getVipRequestInfo(uuid: string): { requested: boolean; level: number | null; date: string | null } {
  try {
    const stored = localStorage.getItem(VIP_REQUEST_KEY);
    if (!stored) return { requested: false, level: null, date: null };
    const data = JSON.parse(stored);
    if (data.uuid !== uuid) return { requested: false, level: null, date: null };
    // Check if same month
    const requestDate = new Date(data.date);
    const now = new Date();
    if (requestDate.getMonth() === now.getMonth() && requestDate.getFullYear() === now.getFullYear()) {
      return { requested: true, level: data.level, date: data.date };
    }
    return { requested: false, level: null, date: null };
  } catch {
    return { requested: false, level: null, date: null };
  }
}

function saveVipRequest(uuid: string, level: number) {
  localStorage.setItem(VIP_REQUEST_KEY, JSON.stringify({ uuid, level, date: new Date().toISOString() }));
}

const RequestVip: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedVip, setSelectedVip] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [alreadyRequested, setAlreadyRequested] = useState<{ requested: boolean; level: number | null; date: string | null }>({ requested: false, level: null, date: null });

  useEffect(() => {
    if (user) {
      setAlreadyRequested(getVipRequestInfo(user.uuid));
    }
  }, [user]);

  if (!user) {
    navigate("/");
    return null;
  }

  const isAgent = user.type_user >= 3;
  

  const handleRequest = async () => {
    if (selectedVip === null) return;
    // Re-check localStorage to prevent any race condition
    const freshCheck = getVipRequestInfo(user.uuid);
    if (!isAgent && freshCheck.requested) {
      setAlreadyRequested(freshCheck);
      setError("لقد استخدمت طلبك المجاني هذا الشهر. يمكنك الطلب مرة أخرى الشهر القادم.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const { data, error: fnError } = await supabase.functions.invoke("gala-request", {
        body: { uuid: user.uuid, type: "vip", value: selectedVip },
      });

      if (fnError) {
        setError("حدث خطأ في الاتصال. حاول مرة أخرى.");
        setLoading(false);
        return;
      }

      if (!data?.success) {
        setError(data?.error || "فشل الطلب. حاول مرة أخرى.");
        setLoading(false);
        return;
      }

      // Save that user has used their monthly VIP request
      if (!isAgent) {
        saveVipRequest(user.uuid, selectedVip);
        setAlreadyRequested({ requested: true, level: selectedVip, date: new Date().toISOString() });
      }
      setSubmitted(true);
    } catch {
      setError("حدث خطأ غير متوقع.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <MobileLayout showHeader headerTitle="طلب VIP" onBack={() => navigate("/dashboard")}>
      <div className="px-5 py-6 space-y-6">
        {/* User Role */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full gold-gradient flex items-center justify-center">
              <Users className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">نوع حسابك</p>
              <p className="text-xs text-primary font-semibold">{userTypeLabels[user.type_user] || "مستخدم"}</p>
            </div>
          </div>
          {isAgent ? (
            <div className="mt-3 p-3 bg-primary/5 rounded-xl border border-primary/10">
              <p className="text-xs text-primary">بصفتك وكيلاً، يمكنك رفع طلب VIP لـ 5 أشخاص شهرياً</p>
            </div>
          ) : (
            <div className="mt-3 p-3 bg-primary/5 rounded-xl border border-primary/10 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary flex-shrink-0" />
              <p className="text-xs text-primary">يحق لك طلب VIP مجاني <strong>مرة واحدة فقط</strong> شهرياً (7 أيام)</p>
            </div>
          )}
        </motion.div>

        {/* Already Requested Warning */}
        {!isAgent && alreadyRequested.requested && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-foreground">تم استخدام طلبك هذا الشهر</p>
              <p className="text-xs text-muted-foreground mt-1">
                طلبت VIP {alreadyRequested.level} بتاريخ {new Date(alreadyRequested.date!).toLocaleDateString("ar-SA")}. يمكنك الطلب مرة أخرى الشهر القادم.
              </p>
            </div>
          </motion.div>
        )}

        {/* VIP Tiers */}
        <div>
          <h3 className="text-sm font-bold text-foreground mb-3">اختر نوع الـ VIP</h3>
          <div className="space-y-3">
            {vipTiers.map((tier, idx) => {
              const isLocked = !tier.available && !isAgent;
              const isDisabled = isLocked || (!isAgent && alreadyRequested.requested);

              return (
                <motion.button
                  key={tier.level}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => {
                    if (!isDisabled) {
                      setSelectedVip(tier.level);
                      setSubmitted(false);
                      setError("");
                    }
                  }}
                  className={`w-full glass-card p-4 flex items-center gap-4 text-right transition-all bg-gradient-to-br ${tier.color} ${
                    selectedVip === tier.level ? "ring-2 ring-primary border-primary/50" : ""
                  } ${isDisabled ? "opacity-50" : ""}`}
                >
                  <div className="w-12 h-12 rounded-xl gold-gradient flex items-center justify-center flex-shrink-0">
                    <Crown className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground">{tier.label}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-muted-foreground">
                        {tier.available || isAgent
                          ? `مجاني • ${tier.days} أيام`
                          : "يتطلب استيفاء شروط"}
                      </span>
                      {(tier.available || isAgent) && (
                        <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-semibold">
                          مرة واحدة/شهر
                        </span>
                      )}
                    </div>
                  </div>
                  {selectedVip === tier.level ? (
                    <Check className="w-5 h-5 text-primary flex-shrink-0" />
                  ) : isLocked ? (
                    <Lock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  ) : null}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-xl">
            <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Submit */}
        {submitted ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 bg-[hsl(var(--success)/0.1)] border border-[hsl(var(--success)/0.3)] rounded-xl text-center"
          >
            <Check className="w-8 h-8 text-[hsl(var(--success-foreground))] mx-auto mb-2" />
            <p className="text-sm font-bold text-[hsl(var(--success-foreground))]">تم تفعيل VIP {selectedVip} بنجاح! 🎉</p>
            <p className="text-xs text-muted-foreground mt-1">المدة: 7 أيام من تاريخ التفعيل</p>
          </motion.div>
        ) : (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleRequest}
            disabled={selectedVip === null || loading || (!isAgent && alreadyRequested.requested)}
            className="w-full h-12 gold-gradient rounded-xl text-primary-foreground font-bold flex items-center justify-center gap-2 disabled:opacity-40 transition-opacity"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              <>
                <Crown className="w-5 h-5" />
                {!isAgent && alreadyRequested.requested ? "تم استخدام طلبك هذا الشهر" : "تقديم الطلب"}
              </>
            )}
          </motion.button>
        )}
      </div>
    </MobileLayout>
  );
};

export default RequestVip;
