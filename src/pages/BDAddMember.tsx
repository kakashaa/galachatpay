import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, UserPlus, AlertTriangle, Loader2, Shield, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";

const TERMS = [
  "لا يتم قبول تسجيل أي عضو إلا إذا كان حسابه جديداً بالكامل.",
  "لا يقبل تسجيل حسابات قديمة أو حسابات مسجلة لدى بيدي آخر.",
  "لا يتم قبول حسابات ذات مستويات أعلى من صفر.",
  "لا يتم قبول حسابات تاريخ إنشائها في غلا لايف قديم.",
];

const WARNING = "تحذير شديد: إذا تم اكتشاف أي مخالفة أو تسجيل عضو غير مؤهل أو جلبه من بيدي آخر أو دخل من نفسه، سيتم سحب صلاحية البيدي بالكامل وحرمانك من أرباحك.";

const BDAddMember: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [memberType, setMemberType] = useState<"supporter" | "agency" | null>(null);
  const [memberUuid, setMemberUuid] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bdData, setBdData] = useState<any>(null);

  // Load BD data on mount
  React.useEffect(() => {
    const load = async () => {
      if (!user?.uuid) return;
      const { data } = await supabase.functions.invoke("bd-manage", {
        body: { action: "check_status", user_uuid: user.uuid },
      });
      if (data?.bd) setBdData(data.bd);
    };
    load();
  }, [user?.uuid]);

  const handleSendInvite = async () => {
    if (!memberUuid.trim() || !memberType || !user?.uuid || !bdData) return;

    setLoading(true);
    try {
      const { data } = await supabase.functions.invoke("bd-manage", {
        body: {
          action: "invite_member",
          bd_uuid: user.uuid,
          bd_name: bdData.bd_name || user.name,
          member_uuid: memberUuid.trim(),
          member_type: memberType,
          referral_code: bdData.referral_code || "",
        },
      });

      if (data?.error) {
        toast.error(data.error);
      } else {
        toast.success("تم إرسال الدعوة بنجاح! سيتلقى العضو إشعاراً.");
        navigate("/bd/dashboard");
      }
    } catch {
      toast.error("فشل إرسال الدعوة");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mobile-container bg-background text-foreground pb-10 overflow-y-auto" dir="rtl">
      <header className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button onClick={() => navigate("/bd/dashboard")} className="p-2 rounded-xl hover:bg-muted">
          <ArrowRight className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-lg">إضافة عضو</h1>
      </header>

      <main className="px-4 space-y-5">
        {!termsAccepted ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <h3 className="font-bold text-sm text-red-400">شروط وتحذيرات التسجيل</h3>
              </div>
              <p className="text-xs text-muted-foreground font-bold">يرجى قراءة الشروط بعناية قبل المتابعة</p>
              <ul className="space-y-2">
                {TERMS.map((t, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Shield className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4">
              <p className="text-sm text-red-400 font-bold leading-relaxed">{WARNING}</p>
            </div>

            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3">
              <p className="text-xs text-amber-400">
                💡 لن تتم إضافة العضو مباشرة. سيتلقى العضو إشعار الدعوة ويجب عليه الموافقة قبل أن يُضاف إلى حسابك.
              </p>
            </div>

            <Button
              onClick={() => setTermsAccepted(true)}
              className="w-full h-12 text-base font-bold rounded-xl"
            >
              <CheckCircle className="w-5 h-5 ml-2" />
              أوافق على جميع الشروط والتحذيرات
            </Button>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            {/* Member Type Selection */}
            <div className="space-y-2">
              <label className="text-sm font-bold">نوع العضو</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setMemberType("supporter")}
                  className={`p-4 rounded-2xl border text-center transition-all ${
                    memberType === "supporter"
                      ? "border-emerald-500 bg-emerald-500/10"
                      : "border-border/40 bg-card"
                  }`}
                >
                  <UserPlus className={`w-6 h-6 mx-auto mb-2 ${memberType === "supporter" ? "text-emerald-400" : "text-muted-foreground"}`} />
                  <div className={`text-sm font-bold ${memberType === "supporter" ? "text-emerald-400" : "text-foreground"}`}>إضافة داعم</div>
                  <div className="text-[10px] text-muted-foreground">عمولة 2%</div>
                </button>
                <button
                  onClick={() => setMemberType("agency")}
                  className={`p-4 rounded-2xl border text-center transition-all ${
                    memberType === "agency"
                      ? "border-amber-500 bg-amber-500/10"
                      : "border-border/40 bg-card"
                  }`}
                >
                  <UserPlus className={`w-6 h-6 mx-auto mb-2 ${memberType === "agency" ? "text-amber-400" : "text-muted-foreground"}`} />
                  <div className={`text-sm font-bold ${memberType === "agency" ? "text-amber-400" : "text-foreground"}`}>إضافة وكيل</div>
                  <div className="text-[10px] text-muted-foreground">عمولة 5%</div>
                </button>
              </div>
            </div>

            {/* Member UUID */}
            {memberType && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                <label className="text-sm font-bold">آيدي العضو (UUID)</label>
                <Input
                  placeholder="أدخل آيدي العضو..."
                  value={memberUuid}
                  onChange={(e) => setMemberUuid(e.target.value)}
                  dir="ltr"
                  className="text-center font-mono"
                />
              </motion.div>
            )}

            {/* Send Button */}
            {memberType && memberUuid.trim() && (
              <Button
                onClick={handleSendInvite}
                disabled={loading}
                className="w-full h-12 text-base font-bold rounded-xl"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "إرسال الدعوة"}
              </Button>
            )}
          </motion.div>
        )}
      </main>
    </div>
  );
};

export default BDAddMember;
