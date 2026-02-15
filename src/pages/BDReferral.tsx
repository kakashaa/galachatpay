import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Briefcase, CheckCircle, Loader2, AlertCircle, User, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { userTypeLabels } from "@/utils/userTypeResolver";
import galaLogo from "@/assets/gala-logo.png";

const DEVICE_KEY = "bd_referral_device_registered";

const BDReferral: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const [uuid, setUuid] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [deviceBlocked, setDeviceBlocked] = useState(false);

  // Check if this device already registered
  useEffect(() => {
    const registered = localStorage.getItem(DEVICE_KEY);
    if (registered) {
      setDeviceBlocked(true);
    }
  }, []);

  const handleJoin = async () => {
    const memberUuid = uuid.trim();
    if (!memberUuid) { setError("أدخل آيدي حسابك في غلا لايف"); return; }
    if (!code) { setError("رمز الدعوة غير صالح"); return; }

    setLoading(true);
    setError("");
    try {
      const { data, error: invokeErr } = await supabase.functions.invoke("bd-manage", {
        body: { action: "register_referral", referral_code: code, member_uuid: memberUuid },
      });
      if (invokeErr) throw invokeErr;
      if (data?.success) {
        // Mark device as registered
        localStorage.setItem(DEVICE_KEY, memberUuid);
        setResult(data.data);
        toast.success("تم التسجيل بنجاح!");
      } else {
        setError(data?.error || "فشل التسجيل");
      }
    } catch (e: any) {
      setError(e.message || "خطأ في الاتصال");
    } finally {
      setLoading(false);
    }
  };

  // Device already registered
  if (deviceBlocked) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6" dir="rtl">
        <div className="w-full max-w-sm space-y-6 text-center">
          <img src={galaLogo} alt="Gala" className="w-16 h-16 mx-auto rounded-2xl" />
          <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8 text-amber-400" />
          </div>
          <h2 className="text-lg font-bold text-foreground">تم التسجيل مسبقاً</h2>
          <p className="text-sm text-muted-foreground">
            تم تسجيل حساب من هذا الجهاز مسبقاً. لا يمكن التسجيل مرة أخرى.
          </p>
        </div>
      </div>
    );
  }

  // Success screen
  if (result) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6" dir="rtl">
        <div className="w-full max-w-sm space-y-6 text-center">
          <img src={galaLogo} alt="Gala" className="w-16 h-16 mx-auto rounded-2xl" />
          <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-lg font-bold text-foreground">تم تسجيلك بنجاح!</h2>
          <div className="bg-card border border-border rounded-2xl p-4 space-y-3 text-right">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">الاسم</span>
              <span className="font-bold text-foreground">{result.member_name || uuid}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">نوع الحساب</span>
              <span className="font-bold text-primary">{userTypeLabels[result.type_user] || "مستخدم عادي"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">التصنيف</span>
              <span className="font-bold text-amber-400">
                {result.member_type === "agency" ? "وكيل" : result.member_type === "host" ? "مضيف" : "مستخدم عادي"}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">BD</span>
              <span className="font-bold text-foreground">{result.bd_name}</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">تم تسجيل حسابك لدى مطور الأعمال بنجاح</p>
        </div>
      </div>
    );
  }

  // Main form - no login required
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6" dir="rtl">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-3">
          <img src={galaLogo} alt="Gala" className="w-16 h-16 mx-auto rounded-2xl" />
          <div className="w-16 h-16 rounded-full bg-primary/20 border-2 border-primary/40 flex items-center justify-center mx-auto">
            <Briefcase className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground">التسجيل عبر دعوة BD</h1>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">
            أدخل آيدي حسابك في غلا لايف للتسجيل لدى مطور الأعمال
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">آيدي الحساب (UUID)</label>
            <Input
              value={uuid}
              onChange={(e) => setUuid(e.target.value)}
              placeholder="أدخل آيدي حسابك"
              className="text-center font-mono text-sm"
              dir="ltr"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-destructive text-xs p-3 bg-destructive/10 rounded-lg">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button onClick={handleJoin} disabled={loading || !uuid.trim()} className="w-full gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <User className="w-4 h-4" />}
            تسجيل
          </Button>
        </div>

        <p className="text-[10px] text-muted-foreground text-center">
          رمز الدعوة: <span className="font-mono text-primary">{code}</span>
        </p>
      </div>
    </div>
  );
};

export default BDReferral;
