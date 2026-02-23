import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, UserPlus, AlertTriangle, Loader2, Shield, CheckCircle, XCircle, CircleDot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const TERMS = [
  "لا يتم قبول تسجيل أي عضو إلا إذا كان حسابه جديداً بالكامل.",
  "لا يقبل تسجيل حسابات قديمة أو حسابات مسجلة لدى بيدي آخر.",
  "لا يتم قبول حسابات ذات مستويات أعلى من صفر.",
  "لا يتم قبول حسابات تاريخ إنشائها في غلا لايف قديم.",
];

const WARNING = "تحذير شديد: إذا تم اكتشاف أي مخالفة أو تسجيل عضو غير مؤهل أو جلبه من بيدي آخر أو دخل من نفسه، سيتم سحب صلاحية البيدي بالكامل وحرمانك من أرباحك.";

interface ViolationInfo {
  count: number;
  message: string;
  banned: boolean;
  violations: Array<{ id: string; member_uuid: string; member_name: string; details: string; created_at: string }>;
}

const BDAddMember: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [memberType, setMemberType] = useState<"supporter" | "agency" | null>(null);
  const [memberUuid, setMemberUuid] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bdData, setBdData] = useState<any>(null);
  const [violationDialog, setViolationDialog] = useState<ViolationInfo | null>(null);

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

  const fetchViolations = async (bdUuid: string) => {
    const { data } = await supabase
      .from("bd_violations")
      .select("*")
      .eq("bd_uuid", bdUuid)
      .order("created_at", { ascending: true });
    return data || [];
  };

  const handleSendInvite = async () => {
    if (!memberUuid.trim() || !memberType || !user?.uuid || !bdData) return;

    setLoading(true);
    try {
      let data: any = null;
      let fnError: any = null;
      try {
        const res = await supabase.functions.invoke("bd-manage", {
          body: {
            action: "invite_member",
            bd_uuid: user.uuid,
            bd_name: bdData.bd_name || user.name,
            member_uuid: memberUuid.trim(),
            member_type: memberType,
            referral_code: bdData.referral_code || "",
          },
        });
        data = res.data;
        fnError = res.error;
      } catch (e) {
        console.error("[BD-INVITE] invoke error:", e);
        toast.error("فشل الاتصال بالسيرفر");
        return;
      }

      console.log("[BD-INVITE] Response:", JSON.stringify(data));

      if (fnError || !data) {
        toast.error("فشل الاتصال بالسيرفر");
        return;
      }

      let responseData: any;
      try {
        responseData = typeof data === 'string' ? JSON.parse(data) : data;
      } catch {
        toast.error("استجابة غير متوقعة من السيرفر");
        return;
      }

      if (responseData?.violation || responseData?.banned) {
        const violations = await fetchViolations(user.uuid);
        setViolationDialog({
          count: responseData.violation_count || violations.length,
          message: responseData.error,
          banned: !!responseData.banned,
          violations,
        });
      } else if (responseData?.error) {
        toast.error(responseData.error);
      } else if (responseData?.success) {
        toast.success("تم إرسال الدعوة بنجاح! سيتلقى العضو إشعاراً.");
        navigate("/bd/dashboard");
      } else {
        toast.error("حدث خطأ غير متوقع");
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

      {/* Violation Warning Dialog */}
      <Dialog open={!!violationDialog} onOpenChange={() => {
        if (violationDialog?.banned) navigate("/bd", { replace: true });
        setViolationDialog(null);
      }}>
        <DialogContent className="max-w-sm mx-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-6 h-6" />
              {violationDialog?.banned ? "⛔ تم إيقاف البيدي" : "⚠️ تحذير - مخالفة"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* 3 Strike Indicators */}
            <div className="flex items-center justify-center gap-3 py-3">
              {[1, 2, 3].map((num) => {
                const isUsed = (violationDialog?.count || 0) >= num;
                const isLatest = num === violationDialog?.count;
                return (
                  <motion.div
                    key={num}
                    initial={isLatest ? { scale: 0 } : {}}
                    animate={isLatest ? { scale: 1 } : {}}
                    transition={{ type: "spring", delay: 0.2 }}
                    className="flex flex-col items-center gap-1"
                  >
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center border-2 transition-all ${
                      isUsed
                        ? "border-red-500 bg-red-500/20"
                        : "border-muted-foreground/30 bg-muted/20"
                    }`}>
                      {isUsed ? (
                        <XCircle className="w-8 h-8 text-red-500" />
                      ) : (
                        <CircleDot className="w-8 h-8 text-muted-foreground/40" />
                      )}
                    </div>
                    <span className={`text-[10px] font-bold ${isUsed ? "text-red-400" : "text-muted-foreground"}`}>
                      إنذار {num}
                    </span>
                  </motion.div>
                );
              })}
            </div>

            {/* Warning Message */}
            <div className={`rounded-xl p-3 text-sm leading-relaxed ${
              violationDialog?.banned
                ? "bg-red-500/10 border border-red-500/30 text-red-400"
                : "bg-amber-500/10 border border-amber-500/30 text-amber-400"
            }`}>
              {violationDialog?.banned ? (
                <p className="font-bold">تم إيقاف حساب البيدي الخاص بك نهائياً بسبب 3 مخالفات متكررة. لن تتمكن من إضافة أعضاء أو الوصول لصلاحيات البيدي.</p>
              ) : (
                <p>المستخدم الذي تريد دعوته <strong>قديم في البرنامج</strong>. ادعو شخص جديد على التطبيق واكسب نسبتك!</p>
              )}
            </div>

            {/* Violation History */}
            {violationDialog?.violations && violationDialog.violations.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-muted-foreground">سجل المحاولات:</h4>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {violationDialog.violations.map((v, i) => (
                    <div key={v.id} className="flex items-center gap-2 bg-muted/30 rounded-lg p-2 text-xs">
                      <span className="bg-red-500/20 text-red-400 font-bold rounded-full w-5 h-5 flex items-center justify-center shrink-0">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className="text-foreground font-mono">{v.member_uuid}</span>
                        <span className="text-muted-foreground mr-1">- {v.details || "حساب قديم"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Remaining Warnings */}
            {!violationDialog?.banned && (
              <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-3 text-center">
                <p className="text-xs text-red-400 font-bold">
                  ⚡ متبقي {3 - (violationDialog?.count || 0)} إنذار(ات) قبل إيقاف البيدي نهائياً
                </p>
              </div>
            )}

            <Button
              onClick={() => {
                setViolationDialog(null);
                if (violationDialog?.banned) navigate("/bd", { replace: true });
              }}
              variant={violationDialog?.banned ? "destructive" : "outline"}
              className="w-full"
            >
              {violationDialog?.banned ? "العودة للصفحة الرئيسية" : "فهمت، سأدعو شخص جديد"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BDAddMember;
