import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle, Loader2, AlertCircle, User, ShieldAlert, Users, Mic, Building2, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { userTypeLabels } from "@/utils/userTypeResolver";
import galaLogo from "@/assets/gala-logo.png";

const DEVICE_KEY = "bd_referral_device_registered";

interface BDPublicInfo {
  bd_name: string;
  total_members: number;
  agencies_count: number;
  hosts_count: number;
  users_count: number;
  members: { name: string; type: string; type_user: number; joined: string }[];
}

const TYPE_ICONS: Record<string, { icon: typeof Users; color: string; bg: string; label: string }> = {
  agency: { icon: Building2, label: "وكيل", color: "text-amber-400", bg: "bg-amber-500/10" },
  host: { icon: Mic, label: "مضيف", color: "text-pink-400", bg: "bg-pink-500/10" },
  user: { icon: Users, label: "مستخدم", color: "text-blue-400", bg: "bg-blue-500/10" },
};

const BDReferral: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const [uuid, setUuid] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [deviceBlocked, setDeviceBlocked] = useState(false);
  const [bdInfo, setBdInfo] = useState<BDPublicInfo | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(true);

  useEffect(() => {
    const registered = localStorage.getItem(DEVICE_KEY);
    if (registered) setDeviceBlocked(true);
    loadBDInfo();
  }, [code]);

  const loadBDInfo = async () => {
    if (!code) return;
    setLoadingInfo(true);
    try {
      const { data, error: err } = await supabase.functions.invoke("bd-manage", {
        body: { action: "get_bd_public_info", referral_code: code },
      });
      if (!err && data?.success) setBdInfo(data.data);
    } catch {}
    setLoadingInfo(false);
  };

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
        localStorage.setItem(DEVICE_KEY, memberUuid);
        setResult(data.data);
        toast.success("تم التسجيل بنجاح!");
        loadBDInfo(); // refresh info
      } else {
        setError(data?.error || "فشل التسجيل");
      }
    } catch (e: any) {
      setError(e.message || "خطأ في الاتصال");
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (loadingInfo) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-b from-primary/20 to-background px-6 pt-10 pb-8 text-center">
        <div className="absolute inset-0 opacity-10">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="absolute w-1 h-1 bg-primary rounded-full animate-pulse" style={{ top: `${20 + i * 15}%`, left: `${10 + i * 20}%`, animationDelay: `${i * 0.3}s` }} />
          ))}
        </div>
        <img src={galaLogo} alt="Gala" className="w-16 h-16 mx-auto rounded-2xl mb-3 shadow-lg" />
        <div className="w-14 h-14 rounded-full bg-primary/20 border-2 border-primary/40 flex items-center justify-center mx-auto mb-3">
          <Crown className="w-7 h-7 text-primary" />
        </div>
        {bdInfo ? (
          <>
            <h1 className="text-xl font-bold text-foreground">{bdInfo.bd_name}</h1>
            <p className="text-xs text-muted-foreground mt-1">مطور أعمال معتمد</p>
          </>
        ) : (
          <h1 className="text-xl font-bold text-foreground">دعوة BD</h1>
        )}
      </div>

      <div className="px-5 pb-10 space-y-4 -mt-2">
        {/* Stats cards */}
        {bdInfo && (
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "الوكلاء", count: bdInfo.agencies_count, icon: Building2, color: "text-amber-400", bg: "bg-amber-500/10" },
              { label: "المضيفين", count: bdInfo.hosts_count, icon: Mic, color: "text-pink-400", bg: "bg-pink-500/10" },
              { label: "المستخدمين", count: bdInfo.users_count, icon: Users, color: "text-blue-400", bg: "bg-blue-500/10" },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="bg-card border border-border/30 rounded-xl p-3 text-center">
                  <div className={`w-9 h-9 rounded-full ${s.bg} flex items-center justify-center mx-auto mb-1.5`}>
                    <Icon className={`w-4 h-4 ${s.color}`} />
                  </div>
                  <p className="text-lg font-bold text-foreground">{s.count}</p>
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* Members list */}
        {bdInfo && bdInfo.members.length > 0 && (
          <div className="bg-card border border-border/30 rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              الأعضاء ({bdInfo.total_members})
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {bdInfo.members.map((m, i) => {
                const cfg = TYPE_ICONS[m.type] || TYPE_ICONS.user;
                const Icon = cfg.icon;
                return (
                  <div key={i} className="flex items-center gap-3 p-2.5 bg-muted/10 rounded-lg">
                    <div className={`w-8 h-8 rounded-full ${cfg.bg} flex items-center justify-center shrink-0`}>
                      <Icon className={`w-4 h-4 ${cfg.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">{m.name || "—"}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {cfg.label} • {userTypeLabels[m.type_user] || "مستخدم عادي"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Registration or blocked */}
        {deviceBlocked ? (
          <div className="bg-card border border-border/30 rounded-xl p-5 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-7 h-7 text-amber-400" />
            </div>
            <h2 className="text-base font-bold text-foreground">تم التسجيل مسبقاً</h2>
            <p className="text-xs text-muted-foreground">تم تسجيل حساب من هذا الجهاز مسبقاً</p>
          </div>
        ) : result ? (
          <div className="bg-card border border-border/30 rounded-xl p-5 text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="text-base font-bold text-foreground">تم تسجيلك بنجاح!</h2>
            <div className="space-y-2 text-right">
              <div className="flex justify-between text-sm p-2 bg-muted/10 rounded-lg">
                <span className="text-muted-foreground">الاسم</span>
                <span className="font-bold text-foreground">{result.member_name || uuid}</span>
              </div>
              <div className="flex justify-between text-sm p-2 bg-muted/10 rounded-lg">
                <span className="text-muted-foreground">نوع الحساب</span>
                <span className="font-bold text-primary">{userTypeLabels[result.type_user] || "مستخدم عادي"}</span>
              </div>
              <div className="flex justify-between text-sm p-2 bg-muted/10 rounded-lg">
                <span className="text-muted-foreground">التصنيف</span>
                <span className="font-bold text-amber-400">
                  {result.member_type === "agency" ? "وكيل" : result.member_type === "host" ? "مضيف" : "مستخدم عادي"}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-card border border-border/30 rounded-xl p-5 space-y-4">
            <div className="text-center space-y-1">
              <h2 className="text-sm font-bold text-foreground">سجّل حسابك الآن</h2>
              <p className="text-[10px] text-muted-foreground">أدخل آيدي حسابك في غلا لايف للانضمام</p>
            </div>

            <Input
              value={uuid}
              onChange={(e) => setUuid(e.target.value)}
              placeholder="آيدي الحساب (UUID)"
              className="text-center font-mono text-sm"
              dir="ltr"
            />

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
        )}

        <p className="text-[10px] text-muted-foreground text-center">
          رمز الدعوة: <span className="font-mono text-primary">{code}</span>
        </p>
      </div>
    </div>
  );
};

export default BDReferral;
