import React, { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { LogIn, Eye, EyeOff, AlertCircle, Info } from "lucide-react";
import MobileLayout from "@/components/MobileLayout";
import galaLogo from "@/assets/gala-logo.png";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!userId.trim() || !password.trim()) {
      setError("يرجى إدخال معرف الحساب والرمز");
      return;
    }

    setLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("gala-login", {
        body: { uuid: userId.trim(), password: password.trim() },
      });

      if (fnError) {
        setError("حدث خطأ في الاتصال. حاول مرة أخرى.");
        setLoading(false);
        return;
      }

      if (!data?.success) {
        setError(data?.error || "فشل تسجيل الدخول. تأكد من البيانات.");
        setLoading(false);
        return;
      }

      const apiUser = data.data;
      setUser({
        id: apiUser.id,
        uuid: apiUser.uuid,
        name: apiUser.name,
        phone: apiUser.phone,
        type_user: apiUser.type_user,
        profile: {
          image: apiUser.profile?.image || "",
          gender: apiUser.profile?.gender || 0,
          birthday: apiUser.profile?.birthday || "",
          age: apiUser.profile?.age || 0,
          country: apiUser.country?.name || "",
        },
        level: {
          receiver_level: apiUser.level?.receiver_level || 0,
          sender_level: apiUser.level?.sender_level || 0,
          charger_level: apiUser.level?.charger_level || 0,
          receiver_num: apiUser.level?.receiver_num || 0,
          sender_num: apiUser.level?.sender_num || 0,
          charger_num: apiUser.level?.charger_num || 0,
        },
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
    <MobileLayout>
      <div className="flex flex-col items-center justify-center px-6 py-8" style={{ minHeight: "100dvh" }}>
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-8"
        >
          <img src={galaLogo} alt="غلا لايف" className="w-28 h-28 rounded-3xl glow-gold" />
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-center mb-8"
        >
          <h1 className="text-2xl font-extrabold gold-text mb-2">غلا لايف</h1>
          <p className="text-sm text-muted-foreground">سجّل دخولك باستخدام حسابك في غلا لايف</p>
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
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">معرف الحساب (ID)</label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="أدخل معرف غلا لايف"
              dir="ltr"
              className="w-full h-12 px-4 bg-input rounded-xl text-foreground placeholder:text-muted-foreground border border-border/50 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-center"
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">رمز الدخول</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="أدخل رمز الدخول"
                dir="ltr"
                className="w-full h-12 px-4 pe-12 bg-input rounded-xl text-foreground placeholder:text-muted-foreground border border-border/50 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-center"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-xl"
            >
              <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </motion.div>
          )}

          {/* Login Button */}
          <motion.button
            type="submit"
            disabled={loading}
            whileTap={{ scale: 0.97 }}
            className="w-full h-12 gold-gradient rounded-xl text-primary-foreground font-bold text-base flex items-center justify-center gap-2 disabled:opacity-60 transition-opacity"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                تسجيل الدخول
              </>
            )}
          </motion.button>
        </motion.form>

        {/* Instructions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          className="w-full mt-8 glass-card p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-primary flex-shrink-0" />
            <p className="text-sm font-bold text-foreground">تعليمات تسجيل الدخول</p>
          </div>
          <ul className="space-y-2 text-xs text-muted-foreground leading-relaxed">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              استخدم معرف حسابك (ID) في تطبيق غلا لايف
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              أدخل رمز الدخول الذي تم إنشاؤه في التطبيق الرئيسي
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              في حال لم تفعّل خاصية الدخول بمعرف غلا لايف، يرجى تفعيلها من إعدادات التطبيق
            </li>
          </ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.5 }}
          className="w-full mt-4 mb-8"
        >
          <button className="w-full py-3 text-sm text-primary font-semibold border border-primary/20 rounded-xl bg-primary/5 hover:bg-primary/10 transition-colors">
            كيف أفعّل الدخول بمعرف غلا لايف؟
          </button>
        </motion.div>
      </div>
    </MobileLayout>
  );
};

export default Login;
