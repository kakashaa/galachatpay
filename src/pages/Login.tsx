import React, { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, AlertCircle, HelpCircle, User, Lock, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import LoginInstructions from "@/components/LoginInstructions";

const Mascot = () => (
  <div className="relative animate-bounce-slow flex items-center justify-center">
    <div className="absolute inset-0 bg-primary/30 blur-3xl rounded-full scale-75" />
    <div className="relative w-32 h-32 bg-primary rounded-full flex items-center justify-center shadow-2xl">
      {/* Ears */}
      <div className="absolute -top-2 w-1 h-6 bg-primary rounded-full origin-bottom rotate-[15deg]" />
      <div className="absolute -top-2 w-1 h-6 bg-primary rounded-full origin-bottom -rotate-[15deg]" />
      {/* Eyes */}
      <div className="flex gap-4">
        <div className="w-3 h-3 bg-black rounded-full" />
        <div className="w-3 h-3 bg-black rounded-full" />
      </div>
      {/* Side bumps */}
      <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-6 bg-primary rounded-l-full" />
      <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-6 bg-primary rounded-r-full" />
      {/* Feet */}
      <div className="absolute -bottom-1 left-1/3 w-3 h-3 bg-primary/80 rounded-b-md" />
      <div className="absolute -bottom-1 right-1/3 w-3 h-3 bg-primary/80 rounded-b-md" />
    </div>
  </div>
);

const Particles = () => (
  <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
    <div className="absolute w-1 h-1 bg-white/20 rounded-full top-1/4 left-1/4 animate-pulse" />
    <div className="absolute w-2 h-2 bg-white/20 rounded-full top-1/3 right-1/4 animate-bounce-slow" style={{ animationDelay: "1s" }} />
    <div className="absolute w-1 h-1 bg-white/20 rounded-full bottom-1/4 left-1/3 animate-pulse" style={{ animationDelay: "2s" }} />
    <div className="absolute w-1.5 h-1.5 bg-white/20 rounded-full top-1/2 right-1/3 animate-float" />
    <div className="absolute w-1 h-1 bg-white/20 rounded-full bottom-1/3 right-1/2 animate-bounce-slow" />
    <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-primary/20 rounded-full blur-[120px] animate-pulse-glow" />
    <div className="absolute bottom-[-10%] right-[-10%] w-64 h-64 bg-accent/20 rounded-full blur-[120px] animate-pulse-glow" style={{ animationDelay: "2s" }} />
  </div>
);

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!userId.trim() && !password.trim()) {
      setError("يرجى إدخال الآيدي والرمز");
      return;
    }
    if (!userId.trim()) {
      setError("يرجى إدخال آيدي الحساب");
      return;
    }
    if (!password.trim()) {
      setError("يرجى إدخال رمز الحساب");
      return;
    }

    setLoading(true);

    try {
      let data: any = null;
      let fnError: any = null;

      try {
        const result = await supabase.functions.invoke("gala-login", {
          body: { uuid: userId.trim(), password: password.trim() },
        });
        data = result.data;
        fnError = result.error;
      } catch (invokeErr: any) {
        // supabase.functions.invoke can throw on non-2xx
        setError("بيانات الدخول غير صحيحة. تأكد من الآيدي والرمز.");
        setLoading(false);
        return;
      }

      if (fnError || !data?.success) {
        const errorText = data?.error || "";
        let msg: string;
        if (errorText.toLowerCase().includes("user not found") || errorText.toLowerCase().includes("uuid")) {
          msg = "الآيدي غير صحيح. تأكد من رقم الآيدي وحاول مرة أخرى.";
        } else if (errorText.toLowerCase().includes("password") || errorText.toLowerCase().includes("invalid credentials")) {
          msg = "الرمز غير صحيح. تأكد من رمز الحساب وحاول مرة أخرى.";
        } else {
          msg = "الآيدي أو الرمز غير صحيح. تأكد من البيانات وحاول مرة أخرى.";
        }
        setError(msg);
        setLoading(false);
        return;
      }

      const apiUser = data.data;
      const levelData = typeof apiUser.level === "number"
        ? { receiver_level: apiUser.level, sender_level: 0, charger_level: 0, receiver_num: 0, sender_num: 0, charger_num: 0 }
        : {
            receiver_level: apiUser.level?.receiver_level || 0,
            sender_level: apiUser.level?.sender_level || 0,
            charger_level: apiUser.level?.charger_level || 0,
            receiver_num: apiUser.level?.receiver_num || 0,
            sender_num: apiUser.level?.sender_num || 0,
            charger_num: apiUser.level?.charger_num || 0,
          };
      setUser({
        id: apiUser.id,
        uuid: apiUser.uuid,
        name: apiUser.name,
        phone: apiUser.phone,
        type_user: apiUser.type_user,
        profile: {
          image: apiUser.profile?.image || "",
          gender: apiUser.profile?.gender || apiUser.gender || 0,
          birthday: apiUser.profile?.birthday || "",
          age: apiUser.profile?.age || 0,
          country: apiUser.country?.name || "",
        },
        level: levelData,
        my_store: {
          coins: apiUser.my_store?.coins || 0,
          diamonds: apiUser.my_store?.diamonds || 0,
          usd: apiUser.my_store?.usd || 0,
        },
        vip: apiUser.vip || {},
        country: {
          id: apiUser.country?.id || 0,
          name: apiUser.country?.name || "",
          flag: apiUser.country?.flag || "",
        },
      });

      navigate("/dashboard");
    } catch {
      setError("حدث خطأ غير متوقع. حاول مرة أخرى.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 overflow-hidden relative bg-background">
      <Particles />

      <div className="w-full max-w-md flex flex-col items-center z-10">
        {/* Mascot */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, type: "spring" }}
          className="mb-8"
        >
          <Mascot />
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-center mb-12"
        >
          <h1 className="text-7xl font-black mb-4 tracking-tight gradient-text">
            غلا شات
          </h1>
          <p className="text-muted-foreground text-sm font-bold tracking-wide leading-relaxed max-w-xs mx-auto">
            سجّل دخولك الآن وابدأ تجربة جديدة كلياً! كن مدير نفسك، أنشئ طلبك خلال ثواني، وتابع كل شيء بسهولة وبدون انتظار أو زيارة خدمة العملاء.
          </p>
        </motion.div>

        {/* Form */}
        <motion.form
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          onSubmit={handleLogin}
          className="w-full space-y-4"
        >
          {/* User ID */}
          <div className="relative">
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
              <User className="w-5 h-5" />
            </div>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="آيدي حسابك"
              dir="ltr"
              className="w-full h-14 pr-12 pl-4 rounded-2xl bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-300 outline-none backdrop-blur-md text-right"
            />
          </div>

          {/* Password */}
          <div className="relative">
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
              <Lock className="w-5 h-5" />
            </div>
            <input
              type={showPassword ? "text" : "password"}
              inputMode="numeric"
              pattern="[0-9]*"
              value={password}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, "");
                setPassword(val);
              }}
              placeholder="رمز حسابك (أرقام فقط)"
              dir="ltr"
              className="w-full h-14 pr-12 pl-12 rounded-2xl bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-300 outline-none backdrop-blur-md text-right"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-2xl"
            >
              <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </motion.div>
          )}

          {/* Login Button */}
          <motion.button
            type="submit"
            disabled={loading}
            whileTap={{ scale: 0.98 }}
            className="w-full h-14 rounded-2xl gold-gradient text-white font-bold text-xl shadow-lg shadow-primary/20 hover:shadow-primary/40 active:scale-[0.98] transition-all duration-200 mt-2 disabled:opacity-60"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
            ) : (
              "تسجيل الدخول"
            )}
          </motion.button>
        </motion.form>

        {/* Instructions Link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          className="mt-12 text-center space-y-3"
        >
          <button
            onClick={() => setShowInstructions(true)}
            className="text-muted-foreground hover:text-primary transition-colors text-sm font-medium flex items-center justify-center gap-2 group mx-auto"
          >
            <HelpCircle className="w-4 h-4" />
            <span className="border-b border-transparent group-hover:border-primary pb-0.5">تعليمات تسجيل الدخول</span>
          </button>
          <button
            onClick={() => navigate("/admin")}
            className="text-muted-foreground/50 hover:text-muted-foreground transition-colors text-xs flex items-center justify-center gap-1.5 mx-auto"
          >
            <Shield className="w-3 h-3" />
            <span>الدخول كمسؤول</span>
          </button>
        </motion.div>
      </div>

      <LoginInstructions open={showInstructions} onClose={() => setShowInstructions(false)} />
    </div>
  );
};

export default Login;
