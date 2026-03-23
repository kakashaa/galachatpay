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
  "يتم فحص الجهاز تلقائيًا عند إضافة أي عضو للتأكد من عدم استخدام أكثر من حساب على نفس الجهاز.",
  "يجب أن يكون العضو حسابه حقيقي ونشط داخل التطبيق.",
  "لا يمكن إضافة عضو تابع لـ BD آخر.",
  "يمنع إضافة الحسابات الوهمية أو المكررة.",
  "لا يمكن إضافة نفس العضو أكثر من مرة.",
  "تتم الإضافة بعد تحقق النظام من أهلية العضو.",
  "لا يتم قبول الحسابات التي مستويات حسابها فوق الصفر.",
  "يتم قبول الحسابات التي مستويات حسابها صفر فقط.",
];

const WARNING = "تحذير شديد: إذا تم اكتشاف أي مخالفة أو تسجيل عضو غير مؤهل أو جلبه من بيدي آخر أو دخل من نفسه، سيتم سحب صلاحية البيدي بالكامل وحرمانك من أرباحك.";

interface ViolationInfo {
  count: number;
  message: string;
  banned: boolean;
  violations: Array<{ id: string; member_uuid: string; member_name: string; details: string; created_at: string }>;
}

// AgencyErrorInfo removed - using simple string state instead

const BDAddMember: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [memberType, setMemberType] = useState<"supporter" | "agency" | null>(null);
  const [memberUuid, setMemberUuid] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bdData, setBdData] = useState<any>(null);
  const [violationDialog, setViolationDialog] = useState<ViolationInfo | null>(null);
  const [agencyConfirm, setAgencyConfirm] = useState(false);
  const [agencyError, setAgencyError] = useState<string | null>(null);

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

  const fetchViolations = async (bdUuid: string): Promise<any[]> => {
    try {
      const { data: abuseData } = await (supabase.from("works_abuse_log" as any) as any)
        .select("*")
        .eq("user_uuid", bdUuid)
        .order("created_at", { ascending: true });
      return (abuseData && Array.isArray(abuseData)) ? abuseData : [];
    } catch {
      return [];
    }
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
      } else if (responseData?.no_agency) {
        setAgencyError(responseData.error);
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
                لن تتم إضافة العضو مباشرة. سيتلقى العضو إشعار الدعوة ويجب عليه الموافقة قبل أن يُضاف إلى حسابك.
              </p>
            </div>

            <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-3">
              <p className="text-xs text-blue-400">
                <strong>ملاحظة مهمة:</strong> لا يمكن أن يكون الجهاز الواحد حساب بيدي وعضو ضمن بيدي آخر في نفس الوقت. يجب على كل جهاز اختيار أحدهما فقط.
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
                  onClick={() => setAgencyConfirm(true)}
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
              {violationDialog?.banned ? "تم إيقاف البيدي" : "تحذير - مخالفة"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3 py-3">
              {[1, 2, 3].map((num) => {
                const isUsed = (violationDialog?.count || 0) >= num;
                const isLatest = num === violationDialog?.count;
                return (
                  <motion.div key={num} initial={isLatest ? { scale: 0 } : {}} animate={isLatest ? { scale: 1 } : {}} transition={{ type: "spring", delay: 0.2 }} className="flex flex-col items-center gap-1">
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center border-2 transition-all ${isUsed ? "border-red-500 bg-red-500/20" : "border-muted-foreground/30 bg-muted/20"}`}>
                      {isUsed ? <XCircle className="w-8 h-8 text-red-500" /> : <CircleDot className="w-8 h-8 text-muted-foreground/40" />}
                    </div>
                    <span className={`text-[10px] font-bold ${isUsed ? "text-red-400" : "text-muted-foreground"}`}>إنذار {num}</span>
                  </motion.div>
                );
              })}
            </div>
            <div className={`rounded-xl p-3 text-sm leading-relaxed ${violationDialog?.banned ? "bg-red-500/10 border border-red-500/30 text-red-400" : "bg-amber-500/10 border border-amber-500/30 text-amber-400"}`}>
              {violationDialog?.banned ? (
                <p className="font-bold">تم إيقاف حساب البيدي الخاص بك نهائياً بسبب 3 مخالفات متكررة.</p>
              ) : (
                <p>المستخدم الذي تريد دعوته <strong>قديم في البرنامج</strong>. ادعو شخص جديد على التطبيق واكسب نسبتك!</p>
              )}
            </div>
            {violationDialog?.violations && violationDialog.violations.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-muted-foreground">سجل المحاولات:</h4>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {violationDialog.violations.map((v, i) => (
                    <div key={v.id} className="flex items-center gap-2 bg-muted/30 rounded-lg p-2 text-xs">
                      <span className="bg-red-500/20 text-red-400 font-bold rounded-full w-5 h-5 flex items-center justify-center shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <span className="text-foreground font-mono">{v.member_uuid}</span>
                        <span className="text-muted-foreground mr-1">- {v.details || "حساب قديم ولايمكنك دعوته للانضمام"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {!violationDialog?.banned && (
              <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-3 text-center">
                <p className="text-xs text-red-400 font-bold">متبقي {3 - (violationDialog?.count || 0)} إنذار(ات) قبل إيقاف البيدي نهائياً</p>
              </div>
            )}
            <Button onClick={() => { setViolationDialog(null); if (violationDialog?.banned) navigate("/bd", { replace: true }); }} variant={violationDialog?.banned ? "destructive" : "outline"} className="w-full">
              {violationDialog?.banned ? "العودة للصفحة الرئيسية" : "فهمت، سأدعو شخص جديد"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Agency Confirmation Dialog */}
      <Dialog open={agencyConfirm} onOpenChange={setAgencyConfirm}>
        <DialogContent className="max-w-sm mx-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-400">
              <AlertTriangle className="w-5 h-5" />
              تأكيد إضافة وكيل
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 space-y-2">
              <p className="text-sm text-amber-400 font-bold leading-relaxed">
                قبل ما ترسل الدعوة، تأكد من التالي:
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                  <span>الوكيل <strong className="text-foreground">عنده وكالة</strong> أو أنشأ وكالة في التطبيق</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                  <span>إذا ما صارت عنده وكالة بعد، <strong className="text-red-400">انتظر</strong> لما يصير عنده وكالة وبعدين ارسل الطلب</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                  <span>جميع مستويات الوكيل <strong className="text-foreground">أصفار</strong> (شحن، إرسال، استقبال)</span>
                </li>
              </ul>
            </div>

            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-3">
              <p className="text-xs text-red-400 font-bold">
                إذا الوكيل ما عنده وكالة أو مستوياته مو أصفار، الدعوة بتنرفض وبتحسب عليك إنذار!
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => setAgencyConfirm(false)}
                variant="outline"
                className="flex-1"
              >
                إلغاء
              </Button>
              <Button
                onClick={() => {
                  setAgencyConfirm(false);
                  setMemberType("agency");
                }}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
              >
                <CheckCircle className="w-4 h-4 ml-1" />
                تأكدت، متابعة
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Agency Not Found Error Dialog */}
      <Dialog open={!!agencyError} onOpenChange={() => setAgencyError(null)}>
        <DialogContent className="max-w-sm mx-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-400">
              <AlertTriangle className="w-6 h-6" />
              لا يمكن إرسال الدعوة
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 space-y-3">
              <p className="text-sm text-amber-400 font-bold leading-relaxed">
                {agencyError}
              </p>
            </div>
            <div className="bg-muted/30 rounded-xl p-3 space-y-2">
              <p className="text-xs text-muted-foreground font-bold">خطوات الحل:</p>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold shrink-0">1.</span>
                  اطلب من الوكيل فتح تطبيق غلا لايف
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold shrink-0">2.</span>
                  يروح يعمل "إنشاء وكالة" من داخل التطبيق
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold shrink-0">3.</span>
                  بعد ما تصير عنده وكالة، ارجع وارسل الدعوة
                </li>
              </ul>
            </div>
            <Button onClick={() => setAgencyError(null)} variant="outline" className="w-full">
              فهمت، سأتأكد أولاً
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BDAddMember;
