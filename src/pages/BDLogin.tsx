import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LogIn, UserPlus, Loader2, AlertCircle, Briefcase, CheckCircle } from "lucide-react";
import MobileLayout from "@/components/MobileLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useBD } from "@/contexts/BDContext";

const BDLogin: React.FC = () => {
  const navigate = useNavigate();
  const { user: galaUser } = useAuth();
  const { login, register, loading, error, bdUser } = useBD();
  const [mode, setMode] = useState<"idle" | "register">("idle");
  const [name, setName] = useState("");
  const [localError, setLocalError] = useState("");
  const [regSuccess, setRegSuccess] = useState(false);
  const [autoChecked, setAutoChecked] = useState(false);

  // إذا مسجل دخول كبيدي بالفعل، وجّه للوحة التحكم
  useEffect(() => {
    if (bdUser) {
      navigate("/bd/dashboard", { replace: true });
    }
  }, [bdUser]);

  // تحقق تلقائي من حساب البيدي عند وجود حساب غلا مسجل
  useEffect(() => {
    if (galaUser?.uuid && !bdUser && !autoChecked) {
      setAutoChecked(true);
      (async () => {
        const ok = await login(galaUser.uuid);
        if (ok) {
          navigate("/bd/dashboard", { replace: true });
        }
      })();
    }
  }, [galaUser?.uuid, autoChecked]);

  const displayError = localError || error;
  const uuid = galaUser?.uuid || "";

  const handleLogin = async () => {
    if (!uuid) {
      setLocalError("سجّل دخول بحسابك في غلا لايف أولاً");
      return;
    }
    setLocalError("");
    const ok = await login(uuid);
    if (ok) navigate("/bd/dashboard");
  };

  const handleRegister = async () => {
    if (!uuid) {
      setLocalError("سجّل دخول بحسابك في غلا لايف أولاً");
      return;
    }
    const regName = name.trim() || galaUser?.name || "";
    if (!regName) {
      setLocalError("أدخل اسمك");
      return;
    }
    setLocalError("");
    const res = await register(uuid, regName);
    if (res.success) {
      setRegSuccess(true);
      setTimeout(async () => {
        setRegSuccess(false);
        setMode("idle");
        const ok = await login(uuid);
        if (ok) navigate("/bd/dashboard");
      }, 1500);
    } else {
      setLocalError(res.error || "فشل التسجيل");
    }
  };

  // إذا ما في حساب غلا مسجل
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

  return (
    <MobileLayout showHeader headerTitle="نظام البيدي" onBack={() => navigate("/dashboard")}>
      <div className="px-5 py-8 space-y-6 flex flex-col items-center" dir="rtl">
        <div className="w-20 h-20 rounded-full bg-primary/20 border-2 border-primary/40 flex items-center justify-center">
          <Briefcase className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-xl font-bold text-foreground text-center">نظام البيدي — غلا لايف</h1>
        <p className="text-xs text-muted-foreground text-center max-w-xs">
          سجّل الداعمين والمضيفين والوكالات واحصل على عمولاتك
        </p>

        {/* معلومات الحساب المربوط */}
        <div className="glass-card p-4 w-full max-w-sm">
          <div className="flex items-center gap-3 mb-1">
            <img
              src={galaUser.profile?.image || "/placeholder.svg"}
              alt=""
              className="w-10 h-10 rounded-full object-cover border border-primary/30"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground truncate">{galaUser.name}</p>
              <p className="text-[10px] text-muted-foreground font-mono" dir="ltr">{galaUser.uuid}</p>
            </div>
          </div>
        </div>

        {mode === "idle" ? (
          <div className="w-full max-w-sm space-y-3">
            {displayError && !loading && (
              <div className="flex items-center gap-2 text-destructive text-xs p-3 bg-destructive/10 rounded-lg">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{displayError}</span>
              </div>
            )}

            {/* إذا الفحص التلقائي فشل (ما عنده حساب بيدي) */}
            {autoChecked && !loading && !bdUser && (
              <>
                <p className="text-xs text-muted-foreground text-center">ما عندك حساب بيدي مسجل بعد</p>
                <Button onClick={() => { setMode("register"); setLocalError(""); }} className="w-full gap-2">
                  <UserPlus className="w-4 h-4" />
                  سجّل كبيدي جديد
                </Button>
                <Button variant="outline" onClick={handleLogin} disabled={loading} className="w-full gap-2 text-xs">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                  إعادة المحاولة
                </Button>
              </>
            )}

            {loading && (
              <div className="flex items-center justify-center gap-2 py-4">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <span className="text-xs text-muted-foreground">جاري التحقق...</span>
              </div>
            )}
          </div>
        ) : (
          <div className="glass-card p-5 w-full max-w-sm space-y-4">
            <p className="text-sm font-bold text-foreground text-center">تسجيل حساب بيدي جديد</p>
            <Input
              placeholder="اسمك (اختياري - يُستخدم اسم حسابك)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-center text-sm"
            />
            {displayError && (
              <div className="flex items-center gap-2 text-destructive text-xs">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{displayError}</span>
              </div>
            )}
            {regSuccess && (
              <div className="flex items-center gap-2 text-green-400 text-xs p-2 bg-green-500/10 rounded-lg">
                <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                <span>تم التسجيل بنجاح! جاري الدخول...</span>
              </div>
            )}
            <Button onClick={handleRegister} disabled={loading} className="w-full gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              تسجيل
            </Button>
            <Button variant="ghost" onClick={() => { setMode("idle"); setLocalError(""); }} className="w-full text-xs text-muted-foreground">
              رجوع
            </Button>
          </div>
        )}
      </div>
    </MobileLayout>
  );
};

export default BDLogin;
