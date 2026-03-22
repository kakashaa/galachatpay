import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, AlertCircle, User, Lock, Wallet, ArrowRight } from "lucide-react";
import { galaApi } from "@/services/galaApi";

const AgentLogin: React.FC = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Already logged in as agent?
    if (localStorage.getItem("ghala_type") === "agent" && localStorage.getItem("ghala_token")) {
      navigate("/agent", { replace: true });
    }
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password.trim()) {
      setError("يرجى إدخال اسم المستخدم وكلمة المرور");
      return;
    }

    setLoading(true);
    try {
      const data = await galaApi.agentLogin(username.trim(), password.trim());

      if (!data.success) {
        setError(data.error || "بيانات الدخول غير صحيحة");
        setLoading(false);
        return;
      }

      localStorage.setItem("ghala_token", data.token);
      localStorage.setItem("ghala_type", "agent");
      localStorage.setItem("ghala_agent_name", data.name || "");
      localStorage.setItem("ghala_agency_id", data.agency_id || "");

      if (data.must_change_password) {
        navigate("/agent/setup", { replace: true });
      } else {
        navigate("/agent", { replace: true });
      }
    } catch {
      setError("حدث خطأ في الاتصال. حاول مرة أخرى.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mobile-container flex flex-col items-center px-6 py-8 pb-16 overflow-y-auto relative bg-background" style={{ justifyContent: "safe center" }}>
      <div className="absolute top-0 left-0 w-64 h-64 bg-amber-500/8 rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-amber-600/8 rounded-full pointer-events-none" />

      <div className={`w-full max-w-md flex flex-col items-center z-10 transition-opacity duration-500 ${mounted ? "opacity-100" : "opacity-0"}`}>
        {/* Icon */}
        <div className="mb-8">
          <div className="relative w-24 h-24 bg-gradient-to-br from-amber-500 to-amber-600 rounded-full flex items-center justify-center shadow-2xl shadow-amber-500/30 animate-bounce-slow">
            <Wallet className="w-10 h-10 text-white" />
          </div>
        </div>

        {/* Title */}
        <div className={`text-center mb-10 transition-all duration-700 delay-100 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
          <h1 className="text-3xl font-black mb-2 text-amber-400">دخول وكيل الشحن</h1>
          <p className="text-muted-foreground text-sm">سجّل دخولك لإدارة عمليات الشحن</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className={`w-full space-y-4 transition-all duration-700 delay-200 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
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
              className="w-full h-14 pr-12 pl-4 rounded-2xl bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all duration-200 outline-none text-right"
            />
          </div>

          <div className="relative">
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
              <Lock className="w-5 h-5" />
            </div>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="كلمة المرور"
              dir="ltr"
              className="w-full h-14 pr-12 pl-12 rounded-2xl bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all duration-200 outline-none text-right"
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-2xl">
              <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-14 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold text-xl shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 active:scale-[0.98] transition-all duration-200 mt-2 disabled:opacity-60"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
            ) : (
              "تسجيل الدخول"
            )}
          </button>
        </form>

        {/* Back */}
        <button
          onClick={() => navigate("/")}
          className="mt-8 text-muted-foreground hover:text-foreground transition-colors text-sm flex items-center gap-2"
        >
          <ArrowRight className="w-4 h-4" />
          <span>العودة للصفحة الرئيسية</span>
        </button>
      </div>
    </div>
  );
};

export default AgentLogin;
