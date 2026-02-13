import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Lock, ArrowRight, Loader2, AlertCircle, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("يرجى إدخال اسم المستخدم وكلمة المرور");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { data, error: fnError } = await supabase.functions.invoke("admin-manage", {
        body: { username: username.trim(), password, action: "auth_check", data: {} },
      });
      if (fnError || !data?.data) {
        setError("بيانات الدخول غير صحيحة");
        setLoading(false);
        return;
      }
      // Store credentials and role in session
      sessionStorage.setItem("admin_username", username.trim());
      sessionStorage.setItem("admin_token", password);
      sessionStorage.setItem("admin_role", data.data.role);
      navigate("/admin/dashboard", { replace: true });
    } catch {
      setError("حدث خطأ. حاول مرة أخرى.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background relative">
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
          {/* Username */}
          <div className="relative">
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
              <User className="w-5 h-5" />
            </div>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="اسم المستخدم"
              dir="ltr"
              autoComplete="username"
              className="w-full h-14 pr-12 pl-4 rounded-2xl bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none backdrop-blur-md text-right"
            />
          </div>

          {/* Password */}
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
