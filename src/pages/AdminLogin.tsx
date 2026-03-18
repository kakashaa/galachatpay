import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Lock, ArrowRight, Loader2, AlertCircle, User, Phone, KeyRound } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const API_URL = "https://galachat.site/project-z/api.php";

const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // First-login state
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [loginData, setLoginData] = useState<any>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("يرجى إدخال اسم المستخدم وكلمة المرور");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "admin_login",
          username: username.trim(),
          password,
        }),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.message || "بيانات الدخول غير صحيحة");
        setLoading(false);
        return;
      }

      // Check if first login (must change password)
      if (data.must_change_password) {
        setMustChangePassword(true);
        setLoginData(data);
        setLoading(false);
        return;
      }

      // Store session
      completeLogin(data);
    } catch {
      setError("حدث خطأ أثناء تسجيل الدخول");
    } finally {
      setLoading(false);
    }
  };

  const handleFirstLoginSetup = async () => {
    if (!newPassword.trim() || newPassword.length < 4) {
      toast.error("كلمة المرور يجب أن تكون 4 أحرف على الأقل");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("كلمات المرور غير متطابقة");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "admin_first_setup",
          admin_key: "ghala2026owner",
          username: username.trim(),
          new_password: newPassword,
          phone: whatsapp.trim() || "",
        }),
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.message || "فشل تحديث البيانات");
        setLoading(false);
        return;
      }
      toast.success("تم تحديث بياناتك بنجاح");
      // Re-login with new password
      const loginRes = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "admin_login",
          username: username.trim(),
          password: newPassword,
        }),
      });
      const loginResult = await loginRes.json();
      if (loginResult.success) {
        completeLogin(loginResult);
      } else {
        toast.error("تم التحديث، يرجى تسجيل الدخول مرة أخرى");
        setMustChangePassword(false);
        setPassword("");
      }
    } catch {
      toast.error("حدث خطأ");
    } finally {
      setLoading(false);
    }
  };

  const completeLogin = async (data: any) => {
    sessionStorage.setItem("admin_username", data.username || username.trim());
    sessionStorage.setItem("admin_display_name", data.name || data.display_name || username.trim());
    sessionStorage.setItem("admin_role", data.role);
    if (data.shift_start) sessionStorage.setItem("admin_shift_start", data.shift_start);
    if (data.shift_end) sessionStorage.setItem("admin_shift_end", data.shift_end);
    if (data.phone) sessionStorage.setItem("admin_phone", data.phone);

    // Store external API token for agencies/salaries
    if (data.token) {
      sessionStorage.setItem("admin_api_token", data.token);
    }

    // Generate edge-function compatible session token
    const edgeToken = btoa(JSON.stringify({ 
      username: data.username || username.trim(), 
      role: data.role, 
      iat: Date.now() 
    }));
    sessionStorage.setItem("admin_session_token", edgeToken);

    navigate("/admin/dashboard", { replace: true });
  };

  // First-login setup screen
  if (mustChangePassword) {
    return (
      <div className="mobile-container flex flex-col items-center px-6 py-8 pb-16 overflow-y-auto bg-background relative admin-theme" style={{ justifyContent: "safe center" }}>
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="w-full max-w-sm z-10">
          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
              <KeyRound className="w-10 h-10 text-amber-400" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">أول تسجيل دخول</h1>
            <p className="text-sm text-muted-foreground mt-1">يرجى تغيير كلمة المرور وإدخال رقم الواتساب</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">كلمة المرور الجديدة</label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="كلمة مرور جديدة"
                dir="ltr"
                className="h-14 rounded-2xl"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">تأكيد كلمة المرور</label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="أعد إدخال كلمة المرور"
                dir="ltr"
                className="h-14 rounded-2xl"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">رقم الواتساب (اختياري)</label>
              <div className="relative">
                <Phone className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="+966XXXXXXXXX"
                  dir="ltr"
                  className="h-14 rounded-2xl pr-12"
                />
              </div>
            </div>

            <Button
              onClick={handleFirstLoginSetup}
              disabled={loading}
              className="w-full h-14 rounded-2xl text-lg font-bold"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "حفظ والدخول"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-container flex flex-col items-center px-6 py-8 pb-16 overflow-y-auto bg-background relative admin-theme" style={{ justifyContent: "safe center" }}>
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
      <div className="w-full max-w-sm z-10">
        <div className="text-center mb-8 css-fade-up">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">لوحة التحكم</h1>
          <p className="text-sm text-muted-foreground mt-1">تسجيل دخول المسؤول</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 css-fade-up-d2">
          <div className="relative">
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
              <User className="w-5 h-5" />
            </div>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="اسم المستخدم"
              autoComplete="username"
              className="w-full h-14 pr-12 pl-4 rounded-2xl bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none backdrop-blur-md text-right"
            />
          </div>

          <div className="relative">
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
              <Lock className="w-5 h-5" />
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="كلمة المرور"
              dir="ltr"
              autoComplete="current-password"
              className="w-full h-14 pr-12 pl-4 rounded-2xl bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none backdrop-blur-md text-right"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-2xl css-fade-up">
              <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-14 rounded-2xl gold-gradient text-white font-bold text-lg shadow-lg shadow-primary/20 disabled:opacity-60 transition-all active:scale-95"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "دخول"}
          </button>
        </form>

        <div className="mt-6 text-center css-fade-up-d4">
          <button
            onClick={() => navigate("/")}
            className="text-muted-foreground hover:text-primary transition-colors text-sm flex items-center gap-2 mx-auto"
          >
            <ArrowRight className="w-4 h-4" />
            العودة لتسجيل الدخول
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
