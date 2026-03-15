import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, AlertCircle, Lock, Phone, Settings } from "lucide-react";

const AGENT_API = "https://galachat.site/admin-panel-api.php";

const AgentSetup: React.FC = () => {
  const navigate = useNavigate();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("ghala_type") !== "agent") {
      navigate("/login/agent", { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!oldPassword || !newPassword || !confirmPassword) {
      setError("يرجى ملء جميع الحقول المطلوبة");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("كلمة المرور الجديدة غير متطابقة");
      return;
    }
    if (newPassword.length < 4) {
      setError("كلمة المرور يجب أن تكون 4 أحرف على الأقل");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("ghala_token");
      const res = await fetch(`${AGENT_API}?action=agent_change_password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, old_password: oldPassword, new_password: newPassword, phone }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "فشل تغيير كلمة المرور");
        return;
      }
      navigate("/agent", { replace: true });
    } catch {
      setError("حدث خطأ في الاتصال");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mobile-container flex flex-col items-center px-6 py-8 overflow-y-auto bg-background">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-amber-500 to-amber-600 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-amber-500/20">
            <Settings className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-2xl font-black text-amber-400">إعداد الحساب</h1>
          <p className="text-muted-foreground text-sm mt-1">يرجى تغيير كلمة المرور قبل المتابعة</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Old Password */}
          <div className="relative">
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"><Lock className="w-5 h-5" /></div>
            <input
              type={showOld ? "text" : "password"}
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="كلمة المرور الحالية"
              dir="ltr"
              className="w-full h-14 pr-12 pl-12 rounded-2xl bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-amber-500/50 outline-none text-right"
            />
            <button type="button" onClick={() => setShowOld(!showOld)} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
              {showOld ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {/* New Password */}
          <div className="relative">
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"><Lock className="w-5 h-5" /></div>
            <input
              type={showNew ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="كلمة المرور الجديدة"
              dir="ltr"
              className="w-full h-14 pr-12 pl-12 rounded-2xl bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-amber-500/50 outline-none text-right"
            />
            <button type="button" onClick={() => setShowNew(!showNew)} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
              {showNew ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {/* Confirm */}
          <div className="relative">
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"><Lock className="w-5 h-5" /></div>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="تأكيد كلمة المرور الجديدة"
              dir="ltr"
              className="w-full h-14 pr-12 pl-4 rounded-2xl bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-amber-500/50 outline-none text-right"
            />
          </div>

          {/* Phone */}
          <div className="relative">
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"><Phone className="w-5 h-5" /></div>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="رقم الواتساب (اختياري)"
              dir="ltr"
              className="w-full h-14 pr-12 pl-4 rounded-2xl bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-amber-500/50 outline-none text-right"
            />
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
            className="w-full h-14 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold text-lg shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all disabled:opacity-60"
          >
            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" /> : "حفظ وإكمال"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AgentSetup;
