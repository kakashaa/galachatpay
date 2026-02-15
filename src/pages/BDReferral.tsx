import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle, Loader2, AlertCircle, User, ShieldAlert, Lock, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { userTypeLabels } from "@/utils/userTypeResolver";
import galaLogo from "@/assets/gala-logo.png";

const DEVICE_KEY = "bd_referral_device_registered";

const BDReferral: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const [uuid, setUuid] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<"uuid" | "password">("uuid");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [deviceBlocked, setDeviceBlocked] = useState(false);
  

  useEffect(() => {
    document.title = "بوابة BD - تسجيل الأعضاء";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute("content", "سجّل حسابك لدى مطور الأعمال عبر رابط الدعوة");

    const registered = localStorage.getItem(DEVICE_KEY);
    if (registered) setDeviceBlocked(true);
  }, []);

  const handleUuidSubmit = () => {
    const memberUuid = uuid.trim();
    if (!memberUuid) { setError("أدخل آيدي حسابك في غلا لايف"); return; }
    if (!/^\d+$/.test(memberUuid)) { setError("الآيدي يجب أن يكون أرقام فقط"); return; }
    setError("");
    setStep("password");
  };

  const handleVerifyAndJoin = async () => {
    const memberUuid = uuid.trim();
    const pw = password.trim();
    if (!pw) { setError("أدخل رمز حسابك"); return; }
    if (!code) { setError("رمز الدعوة غير صالح"); return; }

    setLoading(true);
    setError("");
    try {
      // Step 1: Verify password via gala-login
      const loginResult = await supabase.functions.invoke("gala-login", {
        body: { uuid: memberUuid, password: pw },
      });

      const loginData = loginResult.data;
      if (loginResult.error || !loginData?.success) {
        const errorText = loginData?.error || "";
        if (errorText.toLowerCase().includes("password") || errorText.toLowerCase().includes("invalid credentials")) {
          setError("الرمز غير صحيح. تأكد من رمز حسابك وحاول مرة أخرى.");
        } else if (errorText.toLowerCase().includes("user not found") || errorText.toLowerCase().includes("uuid")) {
          setError("الآيدي غير صحيح. تأكد من رقم الآيدي.");
          setStep("uuid");
        } else if (loginData?.blocked) {
          setError(loginData.error || "تم حظر الحساب مؤقتاً");
        } else {
          setError("الآيدي أو الرمز غير صحيح. تأكد من البيانات وحاول مرة أخرى.");
        }
        setLoading(false);
        return;
      }

      // User verified successfully
      const userData = loginData.data;

      // DEBUG: Show all fields from login API
      setError("");
      setResult({ _debug: true, fields: Object.keys(userData || {}), data: userData });
      setLoading(false);
      return;

      // Step 2: Register with BD
      const { data, error: invokeErr } = await supabase.functions.invoke("bd-manage", {
        body: { action: "register_referral", referral_code: code, member_uuid: memberUuid },
      });
      if (invokeErr) throw invokeErr;
      if (data?.success) {
        localStorage.setItem(DEVICE_KEY, memberUuid);
        setResult(data.data);
        toast.success("تم التسجيل بنجاح!");
      } else {
        setError(data?.error || "فشل التسجيل");
      }
    } catch (e: any) {
      setError(e.message || "خطأ في الاتصال");
    } finally {
      setLoading(false);
    }
  };

  if (deviceBlocked) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6" dir="rtl">
        <div className="w-full max-w-sm space-y-6 text-center">
          <img src={galaLogo} alt="Gala" className="w-16 h-16 mx-auto rounded-2xl" />
          <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8 text-amber-400" />
          </div>
          <h2 className="text-lg font-bold text-foreground">تم التسجيل مسبقاً</h2>
          <p className="text-sm text-muted-foreground">تم تسجيل حساب من هذا الجهاز مسبقاً. لا يمكن التسجيل مرة أخرى.</p>
        </div>
      </div>
    );
  }

  if (result) {
    // DEBUG mode: show all API fields
    if (result._debug) {
      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6" dir="rtl">
          <div className="w-full max-w-sm space-y-4 text-center">
            <h2 className="text-lg font-bold text-foreground">حقول API تسجيل الدخول</h2>
            <div className="bg-card border border-border rounded-2xl p-4 text-right overflow-auto max-h-[70vh]">
              <pre className="text-[10px] text-muted-foreground whitespace-pre-wrap break-all" dir="ltr">
                {JSON.stringify(result.data, null, 2)}
              </pre>
            </div>
            <Button onClick={() => { setResult(null); setStep("uuid"); setPassword(""); }} className="w-full">
              رجوع
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6" dir="rtl">
        <div className="w-full max-w-sm space-y-6 text-center">
          <img src={galaLogo} alt="Gala" className="w-16 h-16 mx-auto rounded-2xl" />
          <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-lg font-bold text-foreground">تم تسجيلك بنجاح!</h2>
          <div className="bg-card border border-border rounded-2xl p-4 space-y-3 text-right">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">الاسم</span>
              <span className="font-bold text-foreground">{result.member_name || uuid}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">نوع الحساب</span>
              <span className="font-bold text-primary">{userTypeLabels[result.type_user] || "مستخدم عادي"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">التصنيف</span>
              <span className="font-bold text-amber-400">
                {result.member_type === "agency" ? "وكيل" : result.member_type === "host" ? "مضيف" : "مستخدم عادي"}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">BD</span>
              <span className="font-bold text-foreground">{result.bd_name}</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">تم تسجيل حسابك لدى مطور الأعمال بنجاح</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6" dir="rtl">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-3">
          <img src={galaLogo} alt="Gala" className="w-16 h-16 mx-auto rounded-2xl" />
          <h1 className="text-xl font-bold text-foreground">التسجيل عبر دعوة BD</h1>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">
            {step === "uuid"
              ? "أدخل آيدي حسابك في غلا لايف للتسجيل لدى مطور الأعمال"
              : "أدخل رمز حسابك للتحقق من هويتك"
            }
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          {step === "uuid" ? (
            <>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">آيدي الحساب (UUID)</label>
                <div className="relative">
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <User className="w-4 h-4" />
                  </div>
                  <Input
                    value={uuid}
                    onChange={(e) => setUuid(e.target.value.replace(/\D/g, ""))}
                    placeholder="أدخل آيدي حسابك (أرقام فقط)"
                    className="text-center font-mono text-sm pr-9"
                    dir="ltr"
                    inputMode="numeric"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-destructive text-xs p-3 bg-destructive/10 rounded-lg">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button onClick={handleUuidSubmit} disabled={!uuid.trim()} className="w-full gap-2">
                <Lock className="w-4 h-4" />
                التالي — إدخال رمز الحساب
              </Button>
            </>
          ) : (
            <>
              {/* Show UUID badge */}
              <div className="flex items-center justify-center gap-2 p-2 bg-primary/10 rounded-lg">
                <User className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-mono text-primary font-bold" dir="ltr">{uuid}</span>
                <button
                  onClick={() => { setStep("uuid"); setPassword(""); setError(""); }}
                  className="text-[10px] text-muted-foreground hover:text-foreground underline mr-2"
                >
                  تغيير
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">رمز الحساب (كلمة السر)</label>
                <div className="relative">
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <Lock className="w-4 h-4" />
                  </div>
                  <Input
                    type={showPassword ? "text" : "password"}
                    inputMode="numeric"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="رمز حسابك (أرقام فقط)"
                    className="text-center font-mono text-sm pr-9 pl-9"
                    dir="ltr"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-destructive text-xs p-3 bg-destructive/10 rounded-lg">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button onClick={handleVerifyAndJoin} disabled={loading || !password.trim()} className="w-full gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                تحقق وسجّل
              </Button>
            </>
          )}
        </div>

        <p className="text-[10px] text-muted-foreground text-center">
          رمز الدعوة: <span className="font-mono text-primary">{code}</span>
        </p>
      </div>
    </div>
  );
};

export default BDReferral;
