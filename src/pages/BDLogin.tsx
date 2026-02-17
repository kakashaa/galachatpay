import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LogIn, Loader2, AlertCircle, Briefcase, CheckCircle, ShieldAlert, ArrowUp } from "lucide-react";
import MobileLayout from "@/components/MobileLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useBD } from "@/contexts/BDContext";

const REQUIRED_LEVEL = 10;

const BDLogin: React.FC = () => {
  const navigate = useNavigate();
  const { user: galaUser } = useAuth();
  const { login, register, loading, error, bdUser } = useBD();
  const [localError, setLocalError] = useState("");
  const [autoChecked, setAutoChecked] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [regSuccess, setRegSuccess] = useState(false);

  const uuid = galaUser?.uuid || "";
  const userLevel = Math.max(
    galaUser?.level?.charger_level || 0,
    galaUser?.level?.sender_level || 0,
    galaUser?.level?.receiver_level || 0
  );
  const displayError = localError || error;
  const { refreshUser } = useAuth();

  // تحديث بيانات المستخدم عند فتح الصفحة للحصول على أحدث مستوى
  useEffect(() => {
    if (galaUser?.uuid) {
      refreshUser();
    }
  }, []);

  // إذا مسجل كبيدي بالفعل → لوحة التحكم
  useEffect(() => {
    if (bdUser) {
      navigate("/bd/dashboard", { replace: true });
    }
  }, [bdUser]);

  // فحص تلقائي عند وجود حساب غلا
  useEffect(() => {
    if (galaUser?.uuid && !bdUser && !autoChecked) {
      setAutoChecked(true);
      (async () => {
        const ok = await login(galaUser.uuid);
        if (ok) {
          navigate("/bd/dashboard", { replace: true });
        } else {
          setLocalError("");
        }
      })();
    }
  }, [galaUser?.uuid, autoChecked]);

  // التسجيل التلقائي كبيدي (لفل 10+)
  const handleAcceptBD = async () => {
    if (!uuid) return;
    setLocalError("");
    setRegistering(true);
    const regName = galaUser?.name || uuid;
    const res = await register(uuid, regName);
    const isAlreadyRegistered = !res.success && res.error?.toLowerCase().includes("already registered");
    if (res.success || isAlreadyRegistered) {
      setRegSuccess(true);
      // إعادة المحاولة عدة مرات مع تأخير لأن الخادم قد يحتاج وقت لمعالجة التسجيل
      const tryLogin = async (attempts: number): Promise<boolean> => {
        for (let i = 0; i < attempts; i++) {
          await new Promise(r => setTimeout(r, i === 0 ? 1500 : 2000));
          const ok = await login(uuid);
          if (ok) return true;
        }
        return false;
      };
      const ok = await tryLogin(3);
      if (ok) {
        navigate("/bd/dashboard", { replace: true });
      } else {
        setRegSuccess(false);
        setLocalError("تم التسجيل بنجاح لكن فشل تحميل لوحة التحكم. أعد تسجيل الدخول.");
      }
      setRegistering(false);
    } else {
      setLocalError(res.error || "فشل التسجيل");
      setRegistering(false);
    }
  };

  // ما في حساب غلا مسجل
  if (!galaUser) {
    return (
      <MobileLayout showHeader headerTitle="نظام البيدي" onBack={() => navigate("/")}>
        <div className="px-5 py-12 flex flex-col items-center gap-6" dir="rtl">
          <div className="w-20 h-20 rounded-full bg-primary/20 border-2 border-primary/40 flex items-center justify-center">
            <Briefcase className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground text-center">نظام البيدي</h1>
          <p className="text-sm text-muted-foreground text-center max-w-xs">
            يجب تسجيل الدخول بحسابك في غلا لايف أولاً للوصول لنظام البيدي
          </p>
          <Button onClick={() => navigate("/")} className="gap-2">
            <LogIn className="w-4 h-4" />
            تسجيل الدخول
          </Button>
        </div>
      </MobileLayout>
    );
  }

  // لو الفحص التلقائي جاري أو لسه ما خلص
  if (loading && !autoChecked) {
    return (
      <MobileLayout showHeader headerTitle="نظام البيدي" onBack={() => navigate("/dashboard")}>
        <div className="px-5 py-16 flex flex-col items-center gap-4" dir="rtl">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">جاري التحقق...</span>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout showHeader headerTitle="نظام البيدي" onBack={() => navigate("/dashboard")}>
      <div className="px-5 py-8 space-y-6 flex flex-col items-center" dir="rtl">
        {/* أيقونة */}
        <div className="w-20 h-20 rounded-full bg-primary/20 border-2 border-primary/40 flex items-center justify-center">
          <Briefcase className="w-10 h-10 text-primary" />
        </div>

        {/* معلومات الحساب */}
        <div className="glass-card p-4 w-full max-w-sm">
          <div className="flex items-center gap-3">
            <img
              src={galaUser.profile?.image || "/placeholder.svg"}
              alt=""
              className="w-10 h-10 rounded-full object-cover border border-primary/30"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground truncate">{galaUser.name}</p>
              <p className="text-[10px] text-muted-foreground">المستوى: {userLevel}</p>
            </div>
          </div>
        </div>

        {/* الفحص التلقائي لسه شغال */}
        {loading && (
          <div className="flex items-center justify-center gap-2 py-4">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground">جاري التحقق...</span>
          </div>
        )}

        {/* بعد الفحص التلقائي وما عنده حساب بيدي */}
        {autoChecked && !loading && !bdUser && (
          <div className="w-full max-w-sm">
            {userLevel < REQUIRED_LEVEL ? (
              /* ═══ تحت لفل 10 ═══ */
              <div className="glass-card p-6 space-y-4 text-center">
                <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/20 border-2 border-amber-500/40 flex items-center justify-center">
                  <ArrowUp className="w-8 h-8 text-amber-400" />
                </div>
                <h2 className="text-lg font-bold text-foreground">ارفع مستواك أولاً</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  للحصول على صلاحية <span className="text-primary font-semibold">بي دي</span> يجب أن يكون مستوى حسابك{" "}
                  <span className="text-primary font-bold">{REQUIRED_LEVEL}</span> أو أعلى.
                </p>
                <div className="flex items-center justify-center gap-2 p-3 bg-muted/30 rounded-lg">
                  <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-xs text-muted-foreground">
                    مستواك الحالي: <span className="font-bold text-foreground">{userLevel}</span> — تحتاج{" "}
                    <span className="font-bold text-primary">{REQUIRED_LEVEL - userLevel}</span> مستوى إضافي
                  </span>
                </div>
                <Button variant="outline" onClick={() => navigate("/dashboard")} className="w-full mt-2">
                  العودة للرئيسية
                </Button>
              </div>
            ) : (
              /* ═══ لفل 10 أو أعلى ═══ */
              <div className="glass-card p-6 space-y-4 text-center">
                <div className="w-16 h-16 mx-auto rounded-full bg-green-500/20 border-2 border-green-500/40 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-400" />
                </div>
                <h2 className="text-lg font-bold text-foreground">أنت مؤهل!</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  مستوى حسابك <span className="text-primary font-bold">{userLevel}</span> يؤهلك لتصبح{" "}
                  <span className="text-primary font-semibold">بي دي</span> في غلا لايف.
                  <br />
                  سيتم إنشاء كود خاص بك تلقائياً.
                </p>

                {displayError && (
                  <div className="flex items-center gap-2 text-destructive text-xs p-3 bg-destructive/10 rounded-lg">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{displayError}</span>
                  </div>
                )}

                {regSuccess && (
                  <div className="flex items-center gap-2 text-green-400 text-xs p-3 bg-green-500/10 rounded-lg">
                    <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>تم تسجيلك كبيدي بنجاح! جاري الدخول...</span>
                  </div>
                )}

                <Button
                  onClick={handleAcceptBD}
                  disabled={loading || registering || regSuccess}
                  className="w-full gap-2 text-base py-5"
                >
                  {registering ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Briefcase className="w-5 h-5" />
                  )}
                  {registering ? "جاري التسجيل..." : "موافق — أريد أن أصبح بيدي"}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </MobileLayout>
  );
};

export default BDLogin;
