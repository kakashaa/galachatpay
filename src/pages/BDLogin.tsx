import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogIn, UserPlus, Loader2, AlertCircle, Briefcase } from "lucide-react";
import MobileLayout from "@/components/MobileLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBD } from "@/contexts/BDContext";

const BDLogin: React.FC = () => {
  const navigate = useNavigate();
  const { login, register, loading, error } = useBD();
  const [uuid, setUuid] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [localError, setLocalError] = useState("");
  const [regSuccess, setRegSuccess] = useState(false);

  const handleLogin = async () => {
    if (!uuid.trim()) { setLocalError("أدخل UUID"); return; }
    setLocalError("");
    const ok = await login(uuid.trim());
    if (ok) navigate("/bd/dashboard");
  };

  const handleRegister = async () => {
    if (!uuid.trim() || !name.trim()) { setLocalError("أدخل UUID والاسم"); return; }
    setLocalError("");
    const res = await register(uuid.trim(), name.trim());
    if (res.success) {
      setRegSuccess(true);
      setTimeout(() => { setMode("login"); setRegSuccess(false); }, 2000);
    } else {
      setLocalError(res.error || "فشل التسجيل");
    }
  };

  const displayError = localError || error;

  return (
    <MobileLayout showHeader headerTitle="نظام البيدي" onBack={() => navigate("/")}>
      <div className="px-5 py-8 space-y-6 flex flex-col items-center" dir="rtl">
        <div className="w-20 h-20 rounded-full bg-primary/20 border-2 border-primary/40 flex items-center justify-center mb-2">
          <Briefcase className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-xl font-bold text-foreground text-center">نظام البيدي — غلا لايف</h1>
        <p className="text-xs text-muted-foreground text-center max-w-xs">سجّل الداعمين والمضيفين والوكالات واحصل على عمولاتك</p>

        {mode === "login" ? (
          <div className="glass-card p-5 w-full max-w-sm space-y-4">
            <Input
              placeholder="أدخل UUID الخاص بك"
              value={uuid}
              onChange={(e) => setUuid(e.target.value)}
              className="text-center text-sm"
              dir="ltr"
            />
            {displayError && (
              <div className="flex items-center gap-2 text-destructive text-xs">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{displayError}</span>
              </div>
            )}
            <Button onClick={handleLogin} disabled={loading} className="w-full gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
              دخول
            </Button>
            <Button variant="ghost" onClick={() => { setMode("register"); setLocalError(""); }} className="w-full gap-2 text-xs text-muted-foreground">
              <UserPlus className="w-4 h-4" />
              سجّل كبيدي جديد
            </Button>
          </div>
        ) : (
          <div className="glass-card p-5 w-full max-w-sm space-y-4">
            <Input
              placeholder="UUID الخاص بك"
              value={uuid}
              onChange={(e) => setUuid(e.target.value)}
              className="text-center text-sm"
              dir="ltr"
            />
            <Input
              placeholder="اسمك"
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
              <div className="text-center text-xs text-green-400 font-bold">تم التسجيل بنجاح! سجّل دخولك الآن</div>
            )}
            <Button onClick={handleRegister} disabled={loading} className="w-full gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              تسجيل
            </Button>
            <Button variant="ghost" onClick={() => { setMode("login"); setLocalError(""); }} className="w-full text-xs text-muted-foreground">
              عندك حساب؟ سجّل دخول
            </Button>
          </div>
        )}
      </div>
    </MobileLayout>
  );
};

export default BDLogin;
