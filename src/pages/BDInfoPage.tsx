import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Mic, Building2, DollarSign, RefreshCw, Loader2, Copy, CheckCircle, Wallet, Link2 } from "lucide-react";
import MobileLayout from "@/components/MobileLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { userTypeLabels } from "@/utils/userTypeResolver";

interface BDData {
  settings: any;
  agencies: any[];
  hosts: any[];
  users: any[];
  totals: { agency: number; host: number; user: number };
}

const BDInfoPage: React.FC = () => {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const [data, setData] = useState<BDData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"agencies" | "hosts" | "users">("agencies");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!authUser?.uuid) { navigate("/dashboard"); return; }
    loadData();
  }, [authUser?.uuid]);

  const loadData = async () => {
    if (!authUser?.uuid) return;
    setLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("bd-manage", {
        body: { action: "get_bd_info", bd_uuid: authUser.uuid },
      });
      if (error) throw error;
      if (result?.success) setData(result.data);
      else toast.error(result?.error || "فشل تحميل البيانات");
    } catch (e: any) {
      toast.error(e.message || "خطأ في الاتصال");
    } finally {
      setLoading(false);
    }
  };

  const copyReferralLink = () => {
    if (!data?.settings?.referral_code) return;
    const link = `${window.location.origin}/bd/join/${data.settings.referral_code}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success("تم نسخ رابط الدعوة");
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <MobileLayout showHeader headerTitle="لوحة BD" onBack={() => navigate("/dashboard")}>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MobileLayout>
    );
  }

  if (!data) {
    return (
      <MobileLayout showHeader headerTitle="لوحة BD" onBack={() => navigate("/dashboard")}>
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
          <p className="text-sm text-muted-foreground mb-4">لم يتم العثور على بيانات BD</p>
          <Button onClick={() => navigate("/dashboard")} variant="outline">العودة</Button>
        </div>
      </MobileLayout>
    );
  }

  const { settings, agencies, hosts, users, totals } = data;
  const totalEarned = Number(settings.total_earned || 0);
  const availableBalance = Number(settings.available_balance || 0);
  const referralLink = `${window.location.origin}/bd/join/${settings.referral_code}`;

  const tabs = [
    { key: "agencies" as const, label: "الوكلاء", icon: Building2, color: "text-amber-400", bgColor: "bg-amber-500/10", items: agencies, total: totals.agency, pct: settings.agency_commission_pct },
    { key: "hosts" as const, label: "المضيفين", icon: Mic, color: "text-pink-400", bgColor: "bg-pink-500/10", items: hosts, total: totals.host, pct: settings.host_commission_pct },
    { key: "users" as const, label: "المستخدمين", icon: Users, color: "text-blue-400", bgColor: "bg-blue-500/10", items: users, total: totals.user, pct: settings.user_commission_pct },
  ];

  return (
    <MobileLayout showHeader headerTitle="لوحة BD" onBack={() => navigate("/dashboard")}>
      <div className="px-4 py-4 space-y-4" dir="rtl">
        {/* User info */}
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground">{settings.bd_name || authUser?.name}</p>
              <p className="text-[10px] text-muted-foreground font-mono truncate" dir="ltr">{authUser?.uuid}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={loadData} disabled={loading} className="h-8 w-8">
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            </Button>
          </div>

          {/* Earnings */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-primary/10 rounded-xl p-3 text-center">
              <DollarSign className="w-4 h-4 text-primary mx-auto mb-1" />
              <p className="text-base font-bold text-amber-400">${totalEarned.toFixed(2)}</p>
              <p className="text-[9px] text-muted-foreground">إجمالي الأرباح</p>
            </div>
            <div className="bg-primary/10 rounded-xl p-3 text-center">
              <Wallet className="w-4 h-4 text-primary mx-auto mb-1" />
              <p className="text-base font-bold text-green-400">${availableBalance.toFixed(2)}</p>
              <p className="text-[9px] text-muted-foreground">الرصيد المتاح</p>
            </div>
          </div>

          {/* Referral link */}
          <div className="bg-muted/20 rounded-xl p-3 space-y-2">
            <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 text-primary" /> رابط الدعوة الخاص بك
            </p>
            <div className="flex gap-2">
              <div className="flex-1 bg-background/50 rounded-lg px-3 py-2 text-[10px] text-muted-foreground font-mono truncate" dir="ltr">
                {referralLink}
              </div>
              <Button size="sm" variant="outline" onClick={copyReferralLink} className="h-8 gap-1 text-xs shrink-0">
                {copied ? <CheckCircle className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "تم" : "نسخ"}
              </Button>
            </div>
          </div>
        </div>

        {/* Three tabs */}
        <div className="flex gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${isActive ? "border-primary bg-primary/10" : "border-border/20 bg-muted/10"}`}
              >
                <div className={`w-10 h-10 rounded-full ${tab.bgColor} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${tab.color}`} />
                </div>
                <p className="text-[10px] font-bold text-foreground">{tab.label}</p>
                <p className="text-[9px] text-muted-foreground">{tab.items.length} عضو</p>
                <p className="text-[10px] font-bold text-primary">${tab.total.toFixed(2)}</p>
              </button>
            );
          })}
        </div>

        {/* Active tab content */}
        {tabs.map((tab) => {
          if (activeTab !== tab.key) return null;
          const Icon = tab.icon;
          return (
            <div key={tab.key} className="glass-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${tab.color}`} />
                  {tab.label} ({tab.items.length})
                </h3>
                <div className="text-[10px] text-muted-foreground">
                  نسبة: <span className="text-primary font-bold">{tab.pct}%</span>
                </div>
              </div>

              {/* Total earnings for this category */}
              <div className="bg-muted/20 rounded-lg p-2.5 text-center">
                <p className="text-xs font-bold text-amber-400">${tab.total.toFixed(2)}</p>
                <p className="text-[9px] text-muted-foreground">إجمالي الأرباح من {tab.label}</p>
              </div>

              {/* Members list */}
              {tab.items.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">لا يوجد أعضاء بعد</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {tab.items.map((member: any) => (
                    <div key={member.id} className="flex items-center justify-between p-2.5 bg-muted/10 rounded-lg border border-border/20">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-foreground truncate">{member.member_name || "—"}</p>
                        <p className="text-[10px] text-muted-foreground font-mono" dir="ltr">{member.member_uuid}</p>
                        <p className="text-[9px] text-muted-foreground">{userTypeLabels[member.type_user] || "مستخدم عادي"}</p>
                      </div>
                      <div className="text-left shrink-0 mr-2">
                        <p className="text-[10px] font-bold text-primary">${Number(member.total_commission || 0).toFixed(2)}</p>
                        <p className="text-[9px] text-muted-foreground">{new Date(member.created_at).toLocaleDateString("ar-EG")}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Note about withdrawals */}
        <div className="bg-muted/10 rounded-xl p-3 border border-border/20">
          <p className="text-[10px] text-muted-foreground text-center">
            💰 يمكنك سحب أرباحك في نهاية كل شهر فقط
          </p>
        </div>
      </div>
    </MobileLayout>
  );
};

export default BDInfoPage;
