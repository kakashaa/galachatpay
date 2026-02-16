import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, DollarSign, RefreshCw, Loader2, Copy, CheckCircle, Wallet, Link2, AlertCircle, ArrowDown, ChevronDown, ChevronUp } from "lucide-react";
import MobileLayout from "@/components/MobileLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  withdrawals: any[];
}

const BDInfoPage: React.FC = () => {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const [data, setData] = useState<BDData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [earningsExpanded, setEarningsExpanded] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  // Withdrawal state
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawLoading, setWithdrawLoading] = useState(false);

  // Recipient info state (for approved withdrawals)
  const [showRecipientForm, setShowRecipientForm] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"transfer" | "bank" | "">(""); 
  const [recipientInfo, setRecipientInfo] = useState({ name: "", phone: "", transfer_type: "", country: "", bank_account: "", bank_name: "" });
  const [recipientLoading, setRecipientLoading] = useState(false);

  useEffect(() => {
    if (!authUser?.uuid) { navigate("/dashboard"); return; }
    loadData();
  }, [authUser?.uuid]);

  // Realtime subscription for withdrawals
  useEffect(() => {
    if (!authUser?.uuid) return;
    const channel = supabase
      .channel("bd-withdrawals-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "bd_withdrawals" }, () => {
        loadData();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
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
    const link = `https://galachatpay.lovable.app/bd/join/${data.settings.referral_code}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success("تم نسخ رابط الدعوة");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWithdrawRequest = async () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount < 60) {
      toast.error("الحد الأدنى للسحب 60 دولار");
      return;
    }
    setWithdrawLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("bd-manage", {
        body: { action: "request_withdrawal", bd_uuid: authUser?.uuid, amount },
      });
      if (error) throw error;
      if (result?.success) {
        toast.success("تم إرسال طلب السحب بنجاح");
        setShowWithdraw(false);
        setWithdrawAmount("");
        loadData();
      } else {
        toast.error(result?.error || "فشل إرسال الطلب");
      }
    } catch (e: any) {
      toast.error(e.message || "خطأ");
    }
    setWithdrawLoading(false);
  };

  const handleSubmitRecipientInfo = async (withdrawalId: string) => {
    if (!recipientInfo.name || !recipientInfo.country) {
      toast.error("جميع الحقول مطلوبة");
      return;
    }
    if (paymentMethod === "transfer" && (!recipientInfo.phone || !recipientInfo.transfer_type)) {
      toast.error("جميع الحقول مطلوبة");
      return;
    }
    if (paymentMethod === "bank" && (!recipientInfo.bank_account || !recipientInfo.bank_name)) {
      toast.error("جميع الحقول مطلوبة");
      return;
    }
    setRecipientLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("bd-manage", {
        body: {
          action: "submit_recipient_info",
          withdrawal_id: withdrawalId,
          recipient_name: recipientInfo.name,
          recipient_phone: paymentMethod === "transfer" ? recipientInfo.phone : recipientInfo.bank_account,
          transfer_type: paymentMethod === "transfer" ? recipientInfo.transfer_type : `بنك: ${recipientInfo.bank_name}`,
          country: recipientInfo.country,
        },
      });
      if (error) throw error;
      if (result?.success) {
        toast.success("تم إرسال معلومات المستلم بنجاح");
        setShowRecipientForm(false);
        setPaymentMethod("");
        setRecipientInfo({ name: "", phone: "", transfer_type: "", country: "", bank_account: "", bank_name: "" });
        loadData();
      } else {
        toast.error(result?.error || "فشل الإرسال");
      }
    } catch (e: any) {
      toast.error(e.message || "خطأ");
    }
    setRecipientLoading(false);
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

  const { settings, agencies, totals, withdrawals = [] } = data;
  const totalEarned = Number(settings.total_earned || 0);
  const availableBalance = Number(settings.available_balance || 0);
  const publishedDomain = "https://galachatpay.lovable.app";
  const referralLink = `${publishedDomain}/bd/join/${settings.referral_code}`;

  // Find approved withdrawal needing recipient info
  const approvedWithdrawal = withdrawals.find((w: any) => w.status === "approved");
  // Find pending withdrawal
  const pendingWithdrawal = withdrawals.find((w: any) => w.status === "pending");
  // Find info_submitted withdrawal
  const infoSubmittedWithdrawal = withdrawals.find((w: any) => w.status === "info_submitted");
  // Show completed only if no active withdrawal in progress
  const hasActiveWithdrawal = approvedWithdrawal || pendingWithdrawal || infoSubmittedWithdrawal;
  const completedWithdrawal = !hasActiveWithdrawal ? withdrawals.find((w: any) => w.status === "completed" && w.transfer_number) : null;

  const tabs = [
    { key: "agencies" as const, label: "الوكلاء", icon: Building2, color: "text-amber-400", bgColor: "bg-amber-500/10", items: agencies, total: totals.agency, pct: settings.agency_commission_pct },
  ];

  return (
    <MobileLayout showHeader headerTitle="لوحة BD" onBack={() => navigate("/dashboard")}>
      <div className="px-4 py-4 space-y-4" dir="rtl">
        {/* Approved withdrawal notification - needs recipient info */}
        {approvedWithdrawal && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              <p className="text-sm font-bold text-emerald-400">تمت الموافقة على طلب السحب!</p>
            </div>
            <p className="text-xs text-muted-foreground">
              تمت الموافقة على سحب <span className="font-bold text-emerald-400">${Number(approvedWithdrawal.amount).toFixed(2)}</span>. يرجى إضافة معلومات المستلم لإتمام التحويل.
            </p>
            {!showRecipientForm ? (
              <Button size="sm" className="w-full gap-2" onClick={() => setShowRecipientForm(true)}>
                <ArrowDown className="w-4 h-4" /> إضافة معلومات المستلم
              </Button>
            ) : (
              <div className="space-y-3">
                {/* Recipient name - always shown */}
                <Input
                  placeholder="اسم المستلم"
                  value={recipientInfo.name}
                  onChange={(e) => setRecipientInfo({ ...recipientInfo, name: e.target.value })}
                  className="h-10 text-sm"
                />

                {/* Payment method selection */}
                {!paymentMethod && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-foreground">اختر طريقة الاستلام:</p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={() => setPaymentMethod("transfer")}>
                        💸 حوالة
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={() => setPaymentMethod("bank")}>
                        🏦 بنك
                      </Button>
                    </div>
                  </div>
                )}

                {/* Transfer fields */}
                {paymentMethod === "transfer" && (
                  <>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-foreground">💸 حوالة</span>
                      <button className="text-[10px] text-muted-foreground underline" onClick={() => setPaymentMethod("")}>تغيير</button>
                    </div>
                    <Input
                      placeholder="رقم جوال المستلم"
                      value={recipientInfo.phone}
                      onChange={(e) => setRecipientInfo({ ...recipientInfo, phone: e.target.value })}
                      className="h-10 text-sm"
                      dir="ltr"
                    />
                    <Input
                      placeholder="نوع الحوالة (مثال: ويسترن يونيون)"
                      value={recipientInfo.transfer_type}
                      onChange={(e) => setRecipientInfo({ ...recipientInfo, transfer_type: e.target.value })}
                      className="h-10 text-sm"
                    />
                    <Input
                      placeholder="الدولة"
                      value={recipientInfo.country}
                      onChange={(e) => setRecipientInfo({ ...recipientInfo, country: e.target.value })}
                      className="h-10 text-sm"
                    />
                  </>
                )}

                {/* Bank fields */}
                {paymentMethod === "bank" && (
                  <>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-foreground">🏦 بنك</span>
                      <button className="text-[10px] text-muted-foreground underline" onClick={() => setPaymentMethod("")}>تغيير</button>
                    </div>
                    <Input
                      placeholder="رقم الحساب البنكي / IBAN"
                      value={recipientInfo.bank_account}
                      onChange={(e) => setRecipientInfo({ ...recipientInfo, bank_account: e.target.value })}
                      className="h-10 text-sm"
                      dir="ltr"
                    />
                    <Input
                      placeholder="اسم البنك"
                      value={recipientInfo.bank_name}
                      onChange={(e) => setRecipientInfo({ ...recipientInfo, bank_name: e.target.value })}
                      className="h-10 text-sm"
                    />
                    <Input
                      placeholder="الدولة"
                      value={recipientInfo.country}
                      onChange={(e) => setRecipientInfo({ ...recipientInfo, country: e.target.value })}
                      className="h-10 text-sm"
                    />
                  </>
                )}

                {/* Submit / Cancel */}
                {paymentMethod && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 gap-1"
                      disabled={recipientLoading}
                      onClick={() => handleSubmitRecipientInfo(approvedWithdrawal.id)}
                    >
                      {recipientLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                      إرسال
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setShowRecipientForm(false); setPaymentMethod(""); }}>إلغاء</Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Completed transfer notification */}
        {completedWithdrawal && (
          <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-primary" />
              <p className="text-sm font-bold text-primary">تم تحويل أرباحك!</p>
            </div>
            <p className="text-xs text-muted-foreground">
              تم تحويل <span className="font-bold text-primary">${Number(completedWithdrawal.amount).toFixed(2)}</span> بنجاح
            </p>
            <p className="text-xs text-foreground">رقم الحوالة: <span className="font-mono font-bold" dir="ltr">{completedWithdrawal.transfer_number}</span></p>
            {completedWithdrawal.receipt_url && (
              <a href={completedWithdrawal.receipt_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">📎 عرض الإيصال</a>
            )}
          </div>
        )}

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
            <button
              onClick={() => setEarningsExpanded(!earningsExpanded)}
              className="bg-primary/10 rounded-xl p-3 text-center transition-colors hover:bg-primary/15 relative"
            >
              <DollarSign className="w-4 h-4 text-primary mx-auto mb-1" />
              <p className="text-base font-bold text-amber-400">${totalEarned.toFixed(2)}</p>
              <p className="text-[9px] text-muted-foreground">أرباح الشهر الحالي</p>
              <ChevronDown className={`w-3 h-3 text-muted-foreground mx-auto mt-1 transition-transform ${earningsExpanded ? "rotate-180" : ""}`} />
            </button>
            <button
              className="bg-primary/10 rounded-xl p-3 text-center transition-all hover:bg-primary/20 active:scale-95"
              onClick={() => { if (availableBalance >= 60) setShowWithdraw(!showWithdraw); else if (availableBalance > 0) toast.error("الحد الأدنى للسحب 60 دولار"); }}
            >
              <Wallet className="w-4 h-4 text-primary mx-auto mb-1" />
              <p className="text-base font-bold text-green-400">${availableBalance.toFixed(2)}</p>
              <p className="text-[9px] text-muted-foreground">الرصيد المتاح</p>
              {availableBalance >= 60 && <p className="text-[8px] text-primary mt-1">اضغط للسحب</p>}
            </button>
          </div>

          {/* Earnings breakdown - expandable categories */}
          {earningsExpanded && (
            <div className="space-y-2 mb-3 animate-in slide-in-from-top-2 duration-200">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isCatExpanded = expandedCategory === tab.key;
                return (
                  <div key={tab.key} className="bg-muted/10 rounded-xl border border-border/20 overflow-hidden">
                    <button
                      onClick={() => setExpandedCategory(isCatExpanded ? null : tab.key)}
                      className="w-full p-3 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-full ${tab.bgColor} flex items-center justify-center`}>
                          <Icon className={`w-4 h-4 ${tab.color}`} />
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-foreground">{tab.label} ({tab.items.length})</p>
                          <p className="text-[10px] text-muted-foreground">نسبة: {tab.pct}%</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-primary">${tab.total.toFixed(2)}</p>
                        {isCatExpanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                      </div>
                    </button>
                    {isCatExpanded && (
                      <div className="px-3 pb-3">
                        {tab.items.length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-3">لا يوجد أعضاء بعد</p>
                        ) : (
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {tab.items.map((member: any) => (
                              <div key={member.id} className="flex items-center justify-between p-2.5 bg-background/50 rounded-lg border border-border/20">
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
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Withdraw form */}
          {showWithdraw && (
            <div className="bg-muted/20 rounded-xl p-3 space-y-3 mb-3 border border-primary/20">
              <p className="text-xs font-bold text-foreground">طلب سحب الرصيد المتاح</p>
              <p className="text-[10px] text-muted-foreground">الحد الأدنى: $60 • المتاح: ${availableBalance.toFixed(2)}</p>
              <Input
                type="number"
                min="60"
                max={availableBalance}
                step="0.01"
                placeholder="المبلغ بالدولار"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                className="h-10 text-sm text-center"
                dir="ltr"
              />
              {parseFloat(withdrawAmount) > 0 && parseFloat(withdrawAmount) < 60 && (
                <div className="flex items-center gap-1.5 text-destructive text-[10px]">
                  <AlertCircle className="w-3 h-3" />
                  <span>الحد الأدنى للسحب 60 دولار</span>
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 gap-1"
                  disabled={withdrawLoading || !parseFloat(withdrawAmount) || parseFloat(withdrawAmount) < 60 || parseFloat(withdrawAmount) > availableBalance}
                  onClick={handleWithdrawRequest}
                >
                  {withdrawLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
                  تأكيد السحب
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setShowWithdraw(false); setWithdrawAmount(""); }}>إلغاء</Button>
              </div>
            </div>
          )}

          {/* Referral link */}
          <div className="bg-muted/20 rounded-xl p-3 space-y-2">
            <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 text-primary" /> رابطك المخصص
            </p>
            <p className="text-[10px] text-muted-foreground">شارك هذا الرابط لإضافة الأعضاء وعرض معلوماتك</p>
            <div className="flex gap-2">
              <div className="flex-1 bg-background/50 rounded-lg px-3 py-2 text-[10px] text-muted-foreground font-mono truncate" dir="ltr">
                {referralLink}
              </div>
              <Button size="sm" variant="outline" onClick={copyReferralLink} className="h-8 gap-1 text-xs shrink-0">
                {copied ? <CheckCircle className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "تم" : "نسخ"}
              </Button>
            </div>
            <Button size="sm" variant="default" onClick={() => window.open(referralLink, "_blank")} className="w-full gap-2 text-xs mt-1">
              <Link2 className="w-3.5 h-3.5" />
              فتح صفحة التسجيل
            </Button>
          </div>
        </div>

        {/* Withdrawal history */}
        {withdrawals.length > 0 && (
          <div className="glass-card p-4 space-y-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Wallet className="w-4 h-4 text-primary" />
              سجل طلبات السحب
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {withdrawals.map((w: any) => {
                const statusMap: Record<string, { label: string; cls: string }> = {
                  pending: { label: "قيد المراجعة", cls: "bg-amber-500/20 text-amber-400" },
                  approved: { label: "تمت الموافقة", cls: "bg-emerald-500/20 text-emerald-400" },
                  info_submitted: { label: "بانتظار التحويل", cls: "bg-blue-500/20 text-blue-400" },
                  completed: { label: "مكتمل", cls: "bg-green-500/20 text-green-400" },
                  rejected: { label: "مرفوض", cls: "bg-destructive/20 text-destructive" },
                };
                const st = statusMap[w.status] || { label: w.status, cls: "bg-muted/20 text-muted-foreground" };
                return (
                  <div key={w.id} className="p-3 bg-muted/10 rounded-lg border border-border/20 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-foreground">${Number(w.amount).toFixed(2)}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${st.cls}`}>{st.label}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{new Date(w.created_at).toLocaleDateString("ar-EG")}</p>
                    {w.admin_note && <p className="text-[10px] text-destructive">ملاحظة: {w.admin_note}</p>}
                    {w.transfer_number && <p className="text-[10px] text-foreground">رقم الحوالة: <span className="font-mono" dir="ltr">{w.transfer_number}</span></p>}
                    {w.receipt_url && (
                      <a href={w.receipt_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary underline flex items-center gap-1">📎 صورة الإيصال</a>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Note */}
        <div className="bg-muted/10 rounded-xl p-3 border border-border/20">
          <p className="text-[10px] text-muted-foreground text-center">
            💰 أرباح الشهر الحالي تُنقل تلقائياً للرصيد المتاح بنهاية الشهر
          </p>
        </div>
      </div>
    </MobileLayout>
  );
};

export default BDInfoPage;
