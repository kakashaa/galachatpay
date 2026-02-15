import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Briefcase, CheckCircle, Loader2, AlertCircle, User } from "lucide-react";
import MobileLayout from "@/components/MobileLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { userTypeLabels } from "@/utils/userTypeResolver";

const BDReferral: React.FC = () => {
  const navigate = useNavigate();
  const { code } = useParams<{ code: string }>();
  const { user: authUser } = useAuth();
  const [uuid, setUuid] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authUser?.uuid) setUuid(authUser.uuid);
  }, [authUser?.uuid]);

  const handleJoin = async () => {
    const memberUuid = uuid.trim();
    if (!memberUuid) { setError("أدخل الـ UUID الخاص بك"); return; }
    if (!code) { setError("رمز الدعوة غير صالح"); return; }

    setLoading(true);
    setError("");
    try {
      const { data, error: invokeErr } = await supabase.functions.invoke("bd-manage", {
        body: { action: "register_referral", referral_code: code, member_uuid: memberUuid },
      });
      if (invokeErr) throw invokeErr;
      if (data?.success) {
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

  if (result) {
    return (
      <MobileLayout showHeader headerTitle="تسجيل ناجح" onBack={() => navigate("/")}>
        <div className="flex flex-col items-center justify-center px-6 py-16 space-y-6" dir="rtl">
          <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-lg font-bold text-foreground">تم تسجيلك بنجاح!</h2>
          <div className="glass-card p-4 w-full max-w-sm space-y-3">
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
          <p className="text-xs text-muted-foreground text-center">تم تسجيل حسابك لدى مطور الأعمال بنجاح</p>
          <Button onClick={() => navigate("/")} variant="outline">العودة للرئيسية</Button>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout showHeader headerTitle="دعوة BD" onBack={() => navigate("/")}>
      <div className="flex flex-col items-center px-6 py-12 space-y-6" dir="rtl">
        <div className="w-20 h-20 rounded-full bg-primary/20 border-2 border-primary/40 flex items-center justify-center">
          <Briefcase className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-xl font-bold text-foreground text-center">التسجيل عبر رابط دعوة BD</h1>
        <p className="text-xs text-muted-foreground text-center max-w-xs">
          أدخل الـ UUID الخاص بحسابك في غلا لايف للتسجيل لدى مطور الأعمال
        </p>

        <div className="glass-card p-5 w-full max-w-sm space-y-4">
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">UUID الحساب</label>
            <Input
              value={uuid}
              onChange={(e) => setUuid(e.target.value)}
              placeholder="أدخل UUID حسابك"
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
    </MobileLayout>
  );
};

export default BDReferral;
