import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { UserPlus, Loader2, AlertCircle, CheckCircle, Users, Building2, ShieldAlert, Info, AlertTriangle } from "lucide-react";
import MobileLayout from "@/components/MobileLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const TYPE_CONFIG = {
  supporter: { label: "داعم", icon: Users, color: "text-blue-400", bg: "bg-blue-500/10" },
  agency: { label: "وكالة", icon: Building2, color: "text-amber-400", bg: "bg-amber-500/10" },
} as const;

type Step = "terms" | "form" | "instructions";

const BDAddMember: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const memberType = (searchParams.get("type") || "supporter") as keyof typeof TYPE_CONFIG;
  const { user: authUser } = useAuth();
  const config = TYPE_CONFIG[memberType] || TYPE_CONFIG.supporter;

  const [step, setStep] = useState<Step>("terms");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [uuid, setUuid] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [addedName, setAddedName] = useState("");

  const handleSendInvitation = async () => {
    if (!uuid.trim()) { setError("أدخل UUID العضو"); return; }
    if (!authUser?.uuid) { setError("يجب تسجيل الدخول أولاً"); return; }
    setError("");
    setLoading(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("bd-referral", {
        body: {
          action: "send_invitation",
          bd_uuid: authUser.uuid,
          bd_name: authUser.name || authUser.uuid,
          bd_referral_code: "",
          member_uuid: uuid.trim(),
          member_type: memberType,
        },
      });
      if (fnError) throw fnError;
      if (data?.success) {
        setAddedName(data?.name || uuid.trim());
        setStep("instructions");
        setUuid("");
      } else {
        setError(data?.error || "فشل إرسال الدعوة");
      }
    } catch (e: any) {
      setError(e.message || "خطأ في الاتصال");
    } finally {
      setLoading(false);
    }
  };

  const Icon = config.icon;

  return (
    <MobileLayout showHeader headerTitle="تسجيل عضو جديد" onBack={() => navigate("/bd/dashboard")}>
      <div className="px-5 py-6 space-y-5" dir="rtl">

        {/* ─── Step 1: Terms & Warnings ─── */}
        {step === "terms" && (
          <div className="glass-card p-5 space-y-4">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <ShieldAlert className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">شروط وتحذيرات التسجيل</p>
                <p className="text-[10px] text-muted-foreground">يرجى قراءة الشروط بعناية قبل المتابعة</p>
              </div>
            </div>

            <div className="space-y-3 text-xs leading-relaxed">
              {/* Warning 1 */}
              <div className="flex gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-amber-200">
                  <strong>لا يتم قبول</strong> تسجيل أي عضو إلا إذا كان حسابه <strong>جديداً بالكامل</strong>. لا يُقبل تسجيل حسابات قديمة أو حسابات مسجلة لدى بي دي آخر.
                </p>
              </div>

              {/* Warning 2 */}
              <div className="flex gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-amber-200">
                  لا يتم قبول حسابات ذات <strong>مستويات أعلى من صفر</strong> أو حسابات تاريخ إنشائها في غلا لايف قديم.
                </p>
              </div>

              {/* Warning 3 - severe */}
              <div className="flex gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-destructive">
                  <strong>تحذير شديد:</strong> إذا تم اكتشاف أي مخالفة أو تسجيل عضو لم تجلبه أنت إلى التطبيق، أو جلبه بي دي آخر، أو دخل من نفسه، <strong>سيتم سحب صلاحيات البي دي بالكامل وحرمانك من أرباحك.</strong>
                </p>
              </div>

              {/* Info about invitation flow */}
              <div className="flex gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
                <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p className="text-muted-foreground">
                  لن تتم إضافة العضو مباشرة. سيتلقى العضو <strong>إشعار دعوة</strong> ويجب عليه <strong>الموافقة</strong> قبل أن يُضاف إلى حسابك.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/10 border border-border/30">
              <Checkbox
                id="terms"
                checked={termsAccepted}
                onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                className="mt-0.5"
              />
              <label htmlFor="terms" className="text-xs text-muted-foreground cursor-pointer leading-relaxed">
                أوافق على جميع الشروط والتحذيرات المذكورة أعلاه وأتعهد بعدم مخالفتها
              </label>
            </div>

            <Button
              onClick={() => setStep("form")}
              disabled={!termsAccepted}
              className="w-full gap-2"
            >
              متابعة
            </Button>
          </div>
        )}

        {/* ─── Step 2: UUID Input Form ─── */}
        {step === "form" && (
          <div className="glass-card p-5 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-12 h-12 rounded-full ${config.bg} flex items-center justify-center`}>
                <Icon className={`w-6 h-6 ${config.color}`} />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">تسجيل عضو جديد</p>
                <p className="text-[10px] text-muted-foreground">أدخل UUID الشخص لإرسال دعوة إليه</p>
              </div>
            </div>

            <Input
              placeholder="UUID العضو"
              value={uuid}
              onChange={(e) => setUuid(e.target.value)}
              className="text-center text-sm"
              dir="ltr"
            />

            {/* Type selector */}
            <div className="flex gap-2">
              {(Object.entries(TYPE_CONFIG) as [string, typeof config][]).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => navigate(`/bd/add-member?type=${key}`, { replace: true })}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                    memberType === key
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/20 text-muted-foreground"
                  }`}
                >
                  {cfg.label}
                </button>
              ))}
            </div>

            {error && (
              <div className="flex items-center gap-2 text-destructive text-xs p-2 bg-destructive/10 rounded-lg">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button onClick={handleSendInvitation} disabled={loading} className="w-full gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              إرسال دعوة
            </Button>

            <button
              onClick={() => { setStep("terms"); setTermsAccepted(false); }}
              className="text-[10px] text-muted-foreground underline w-full text-center"
            >
              العودة للشروط
            </button>
          </div>
        )}

        {/* ─── Step 3: Instructions after sending ─── */}
        {step === "instructions" && (
          <div className="glass-card p-5 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">تم إرسال الدعوة بنجاح!</p>
                <p className="text-[10px] text-muted-foreground">
                  تم إرسال دعوة إلى <strong className="text-primary">{addedName}</strong>
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs leading-relaxed">
              <div className="flex gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
                <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div className="text-muted-foreground space-y-2">
                  <p><strong>الخطوات التالية:</strong></p>
                  <ol className="list-decimal mr-4 space-y-1">
                    <li>اذهب إلى المستخدم <strong className="text-primary">{addedName}</strong> الذي أضفته كعضو</li>
                    <li>اطلب منه التوجه إلى الموقع وتسجيل الدخول</li>
                    <li>سيجد إشعاراً في أعلى الصفحة بأنك دعوته ليصبح عضواً لديك</li>
                    <li>يضغط على <strong>موافقة</strong> أو <strong>رفض</strong> لإتمام العملية</li>
                  </ol>
                </div>
              </div>

              <div className="flex gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-amber-200">
                  لن يُضاف العضو إلى حسابك إلا بعد <strong>موافقته على الدعوة</strong>. تأكد من تواصلك معه.
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => { setStep("form"); setError(""); }}
                variant="outline"
                className="flex-1 gap-2"
              >
                <UserPlus className="w-4 h-4" />
                إضافة عضو آخر
              </Button>
              <Button
                onClick={() => navigate("/bd/dashboard")}
                className="flex-1"
              >
                لوحة التحكم
              </Button>
            </div>
          </div>
        )}
      </div>
    </MobileLayout>
  );
};

export default BDAddMember;
