import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, AlertCircle, User, Lock, Shield, Fingerprint, Timer, Ban, Trash2, ChevronRight } from "lucide-react";
import PulsingHelpIcon from "@/components/PulsingHelpIcon";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import LoginInstructions from "@/components/LoginInstructions";
import { resolveUserType } from "@/utils/userTypeResolver";

interface SavedAccount {
  uuid: string;
  name: string;
  image: string;
}

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { user, setUser, isAuthenticated } = useAuth();
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [loading, setLoading] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [blockInfo, setBlockInfo] = useState<{ blocked: boolean; permanent: boolean; blockedUntil?: string; blockCount?: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  // Saved accounts
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);
  const [quickLoginLoading, setQuickLoginLoading] = useState<string | null>(null);

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    setMounted(true);
    // Check if user was force-logged out
    const reason = localStorage.getItem("gala_force_logout_reason");
    if (reason === "password_changed") {
      localStorage.removeItem("gala_force_logout_reason");
      toast.error("تم تسجيل خروجك تلقائياً لأن الرمز السري تم تغييره من جهاز آخر. يرجى تسجيل الدخول بالرمز الجديد.", {
        duration: 8000,
      });
    }
    try {
      const raw = localStorage.getItem("gala_saved_accounts");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setSavedAccounts(parsed);
      }
    } catch { /* ignore */ }
  }, []);

  const removeSavedAccount = (uuid: string) => {
    const updated = savedAccounts.filter(a => a.uuid !== uuid);
    setSavedAccounts(updated);
    localStorage.setItem("gala_saved_accounts", JSON.stringify(updated));
  };

  const handleQuickAccountLogin = (account: SavedAccount) => {
    setUserId(account.uuid);
    setPassword("");
    setError("");
    setWarning("");
    setBlockInfo(null);
    // Focus on password field
    setTimeout(() => {
      const pwInput = document.querySelector('input[type="password"], input[inputmode="numeric"]') as HTMLInputElement;
      pwInput?.focus();
    }, 100);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setWarning("");
    setBlockInfo(null);

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
        setError("بيانات الدخول غير صحيحة. تأكد من الآيدي والرمز.");
        setLoading(false);
        return;
      }

      if (data?.blocked) {
        setBlockInfo({
          blocked: true,
          permanent: data.permanent,
          blockedUntil: data.blocked_until,
          blockCount: data.block_count,
        });
        setError(data.error || "تم حظر الحساب");
        setLoading(false);
        return;
      }

      if (data?.warning) {
        setWarning(data.warning);
      }

      if (data?.remaining_attempts !== undefined && data?.remaining_attempts <= 2) {
        setWarning(data.warning || `⚠️ تبقى لك ${data.remaining_attempts} محاولة فقط!`);
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

      const effectiveType = resolveUserType(apiUser.type_user, apiUser.agency);

      const userObj = {
        id: apiUser.id,
        uuid: apiUser.uuid,
        name: apiUser.name,
        phone: apiUser.phone,
        type_user: effectiveType,
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
      };

      // Store password for session verification
      localStorage.setItem("gala_session_key", btoa(password.trim()));

      setUser(userObj);

      // Update saved accounts with latest info
      try {
        const savedRaw = localStorage.getItem("gala_saved_accounts");
        const saved: SavedAccount[] = savedRaw ? JSON.parse(savedRaw) : [];
        const idx = saved.findIndex(a => a.uuid === apiUser.uuid);
        const entry = { uuid: apiUser.uuid, name: apiUser.name, image: apiUser.profile?.image || "" };
        if (idx >= 0) {
          saved[idx] = entry;
        } else {
          saved.unshift(entry);
        }
        localStorage.setItem("gala_saved_accounts", JSON.stringify(saved.slice(0, 5)));
      } catch { /* ignore */ }

      // Clean up old support chat messages from other accounts
      const keysToDelete: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith("gala_support_chat_") && !key.endsWith(apiUser.uuid)) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach(key => localStorage.removeItem(key));

      // Register device_id for this user
      try {
        let deviceId = localStorage.getItem("gala_device_id");
        if (!deviceId) {
          deviceId = crypto.randomUUID();
          localStorage.setItem("gala_device_id", deviceId);
        }
        await supabase.from("user_devices").upsert(
          { user_uuid: apiUser.uuid, device_id: deviceId, updated_at: new Date().toISOString() },
          { onConflict: "user_uuid" }
        );
      } catch { /* ignore device registration errors */ }

      navigate("/dashboard", { replace: true });
    } catch {
      setError("حدث خطأ غير متوقع. حاول مرة أخرى.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 overflow-hidden relative bg-background">
      {/* Lightweight CSS-only background glow */}
      <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-primary/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-64 h-64 bg-accent/15 rounded-full blur-[100px] pointer-events-none" />

      <div className={`w-full max-w-md flex flex-col items-center z-10 transition-opacity duration-500 ${mounted ? "opacity-100" : "opacity-0"}`}>
        {/* Logo circle */}
        <div className="mb-8">
          <div className="relative w-28 h-28 bg-primary rounded-full flex items-center justify-center shadow-2xl animate-bounce-slow">
            <div className="flex gap-3.5">
              <div className="w-2.5 h-2.5 bg-black rounded-full" />
              <div className="w-2.5 h-2.5 bg-black rounded-full" />
            </div>
          </div>
        </div>

        {/* Title */}
        <div className={`text-center mb-10 transition-all duration-700 delay-100 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
          <h1 className="text-6xl font-black mb-3 tracking-tight gradient-text">
            غلا شات
          </h1>
          <p className="text-muted-foreground text-sm font-bold tracking-wide leading-relaxed max-w-xs mx-auto">
            سجّل دخولك الآن وابدأ تجربة جديدة كلياً! كن مدير نفسك، أنشئ طلبك خلال ثواني، وتابع كل شيء بسهولة وبدون انتظار أو زيارة خدمة العملاء.
          </p>
        </div>

        {/* Saved Accounts */}
        {savedAccounts.length > 0 && (
          <div className={`w-full mb-5 transition-all duration-500 ${mounted ? "opacity-100" : "opacity-0"}`}>
            <p className="text-xs text-muted-foreground text-right mb-2 pr-1">حسابات محفوظة</p>
            <div className="space-y-2">
              {savedAccounts.map((account) => (
                <div
                  key={account.uuid}
                  className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl p-3 group"
                >
                  <button
                    onClick={() => removeSavedAccount(account.uuid)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all shrink-0"
                    title="حذف الحساب المحفوظ"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleQuickAccountLogin(account)}
                    className="flex-1 flex items-center gap-3 text-right min-w-0"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">{account.name}</p>
                      <p className="text-xs text-muted-foreground" dir="ltr">ID: {account.uuid}</p>
                    </div>
                    {account.image ? (
                      <img
                        src={account.image}
                        alt={account.name}
                        className="w-10 h-10 rounded-full object-cover border-2 border-primary/30 shrink-0"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/20 border-2 border-primary/30 flex items-center justify-center shrink-0">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                    )}
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 rtl:rotate-180" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Block Warning Banner */}
        {blockInfo && (
          <div className="w-full mb-4">
            <div className={`rounded-2xl p-4 border space-y-2 ${
              blockInfo.permanent
                ? "bg-destructive/10 border-destructive/30"
                : "bg-warning/10 border-warning/30"
            }`}>
              <div className="flex items-center gap-2 justify-end">
                <div className="text-right">
                  <p className={`text-sm font-bold ${blockInfo.permanent ? "text-destructive" : "text-warning"}`}>
                    {blockInfo.permanent ? "🚫 حظر نهائي" : "⏳ حظر مؤقت"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {blockInfo.permanent
                      ? "تواصل مع الإدارة لفك الحظر"
                      : `التحذير رقم ${blockInfo.blockCount}`
                    }
                  </p>
                </div>
                {blockInfo.permanent ? (
                  <Ban className="w-6 h-6 text-destructive" />
                ) : (
                  <Timer className="w-6 h-6 text-warning" />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <form
          onSubmit={handleLogin}
          className={`w-full space-y-4 transition-all duration-700 delay-200 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
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
              className="w-full h-14 pr-12 pl-4 rounded-2xl bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200 outline-none text-right"
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
              className="w-full h-14 pr-12 pl-12 rounded-2xl bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200 outline-none text-right"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {/* Warning */}
          {warning && !error && (
            <div className="flex items-center gap-2 p-3 bg-warning/10 border border-warning/30 rounded-2xl">
              <AlertCircle className="w-4 h-4 text-warning flex-shrink-0" />
              <p className="text-sm text-warning font-medium">{warning}</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-2xl">
              <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading || (blockInfo?.blocked && blockInfo?.permanent)}
            className="w-full h-14 rounded-2xl gold-gradient text-white font-bold text-xl shadow-lg shadow-primary/20 hover:shadow-primary/40 active:scale-[0.98] transition-all duration-200 mt-2 disabled:opacity-60"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
            ) : (
              "تسجيل الدخول"
            )}
          </button>
        </form>

        {/* Instructions Link */}
        <div className={`mt-10 text-center space-y-3 transition-all duration-700 delay-300 ${mounted ? "opacity-100" : "opacity-0"}`}>
          <button
            onClick={() => setShowInstructions(true)}
            className="text-muted-foreground hover:text-primary transition-colors text-sm font-medium flex items-center justify-center gap-2 group mx-auto animate-pulse-glow"
          >
            <PulsingHelpIcon size={16} />
            <span className="border-b border-transparent group-hover:border-primary pb-0.5">تعليمات تسجيل الدخول</span>
          </button>
          <button
            onClick={() => navigate("/admin")}
            className="text-muted-foreground/50 hover:text-muted-foreground transition-colors text-xs flex items-center justify-center gap-1.5 mx-auto"
          >
            <Shield className="w-3 h-3" />
            <span>الدخول كمسؤول</span>
          </button>
        </div>
      </div>

      <LoginInstructions open={showInstructions} onClose={() => setShowInstructions(false)} />
    </div>
  );
};

export default Login;
