import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Lock, Briefcase, Heart, Building2, UserPlus, Wallet, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";

const WorksPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [myWorks, setMyWorks] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [pendingRequest, setPendingRequest] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Add member dialog
  const [showAddMember, setShowAddMember] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [memberUuid, setMemberUuid] = useState("");
  const [memberType, setMemberType] = useState<"supporter" | "agent">("supporter");
  const [sending, setSending] = useState(false);

  // Withdraw dialog
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [recipientUuid, setRecipientUuid] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);

  // Earnings
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [monthEarnings, setMonthEarnings] = useState(0);

  const userLevel = user?.level?.charger_level || 0;

  const fetchData = useCallback(async () => {
    if (!user?.uuid) return;
    setLoading(true);
    try {
      // Check for active works account
      const { data: works } = await supabase
        .from("works_accounts").select("*")
        .eq("user_uuid", user.uuid).eq("status", "active").maybeSingle();

      if (works) {
        setMyWorks(works);
        // Fetch members
        const { data: m } = await supabase
          .from("works_members").select("*").eq("works_id", works.id).eq("status", "active");
        setMembers(m || []);

        // Fetch today earnings
        const today = new Date().toISOString().split("T")[0];
        const { data: te } = await supabase
          .from("works_earnings").select("commission_usd").eq("works_id", works.id).eq("period_date", today);
        setTodayEarnings((te || []).reduce((s: number, e: any) => s + Number(e.commission_usd), 0));

        // Fetch month earnings
        const monthStart = new Date(); monthStart.setDate(1);
        const { data: me } = await supabase
          .from("works_earnings").select("commission_usd").eq("works_id", works.id)
          .gte("period_date", monthStart.toISOString().split("T")[0]);
        setMonthEarnings((me || []).reduce((s: number, e: any) => s + Number(e.commission_usd), 0));
      } else {
        // Check pending request
        const { data: req } = await supabase
          .from("works_requests").select("status").eq("user_uuid", user.uuid)
          .eq("status", "pending").maybeSingle();
        setPendingRequest(!!req);
      }
    } catch { /* silent */ }
    setLoading(false);
  }, [user?.uuid]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const submitRequest = async () => {
    if (!user?.uuid || submitting) return;
    setSubmitting(true);
    try {
      await supabase.from("works_requests").insert({
        user_uuid: user.uuid, user_name: user.name || "", user_level: userLevel,
      } as any);
      toast.success("تم تقديم الطلب بنجاح ✅");
      setPendingRequest(true);
    } catch { toast.error("فشل تقديم الطلب"); }
    setSubmitting(false);
  };

  const sendInvitation = async () => {
    if (!memberUuid || !myWorks || sending) return;
    setSending(true);
    try {
      await supabase.from("works_members").insert({
        works_id: myWorks.id, member_uuid: memberUuid, member_type: memberType, status: "pending",
      } as any);
      await supabase.from("notifications").insert({
        user_uuid: memberUuid,
        title: "دعوة للانضمام لـ Works 🤝",
        body: `${user?.name || "مستخدم"} يدعوك للانضمام لفريقه كـ ${memberType === "supporter" ? "داعم" : "وكيل"}`,
        type: "works_invitation", is_read: false,
      } as any);
      toast.success("تم إرسال الدعوة ✅");
      setShowAddMember(false); setMemberUuid(""); setAcceptedTerms(false);
      fetchData();
    } catch (e: any) {
      toast.error(e.message?.includes("duplicate") ? "هذا العضو مسجل بالفعل" : "فشل الإرسال");
    }
    setSending(false);
  };

  const submitWithdraw = async () => {
    if (!myWorks || withdrawing) return;
    const amt = parseFloat(withdrawAmount);
    if (!amt || amt <= 0 || amt > Number(myWorks.balance_usd)) { toast.error("مبلغ غير صحيح"); return; }
    if (!recipientUuid.trim()) { toast.error("أدخل UUID المستلم"); return; }
    setWithdrawing(true);
    try {
      await supabase.from("works_withdrawals").insert({
        works_id: myWorks.id, user_uuid: user!.uuid, amount_usd: amt,
        amount_coins: Math.floor(amt * 8500), recipient_uuid: recipientUuid.trim(),
      } as any);
      toast.success("تم تقديم طلب السحب ✅");
      setShowWithdraw(false); setWithdrawAmount(""); setRecipientUuid("");
    } catch { toast.error("فشل تقديم الطلب"); }
    setWithdrawing(false);
  };

  const supporterCount = members.filter(m => m.member_type === "supporter").length;
  const agentCount = members.filter(m => m.member_type === "agent").length;
  const balance = Number(myWorks?.balance_usd || 0);
  const totalEarnings = Number(myWorks?.total_earnings_usd || 0);
  const supporterPct = Number(myWorks?.supporter_commission_pct || 2);
  const agentPct = Number(myWorks?.agent_commission_pct || 3);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
    </div>
  );

  // State 1: Level < 10
  if (userLevel < 10 && !myWorks) return (
    <div className="min-h-screen bg-background flex flex-col" dir="rtl">
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <button onClick={() => navigate(-1)}><ArrowRight className="w-6 h-6" /></button>
        <h1 className="text-lg font-bold">البيدي</h1>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center space-y-4">
        <Lock className="w-16 h-16 text-muted-foreground" />
        <p className="text-lg font-bold">نظام البيدي غير متاح</p>
        <p className="text-sm text-muted-foreground">يتطلب الوصول للمستوى 10 على الأقل</p>
        <p className="text-xs text-muted-foreground">مستواك الحالي: {userLevel}</p>
      </div>
      <BottomNav />
    </div>
  );

  // State 2: No works account
  if (!myWorks) return (
    <div className="min-h-screen bg-background flex flex-col" dir="rtl">
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <button onClick={() => navigate(-1)}><ArrowRight className="w-6 h-6" /></button>
        <h1 className="text-lg font-bold">البيدي</h1>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center space-y-4">
        <Briefcase className="w-16 h-16 text-emerald-400" />
        <p className="text-lg font-bold">انضم لنظام البيدي</p>
        <p className="text-sm text-muted-foreground">ادعُ أعضاء واحصل على عمولة من نشاطهم</p>
        {pendingRequest ? (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl px-6 py-3">
            <p className="text-sm text-amber-400 font-bold">طلبك قيد المراجعة ⏳</p>
          </div>
        ) : (
          <button onClick={submitRequest} disabled={submitting}
            className="bg-emerald-500 text-black px-8 py-3 rounded-2xl font-bold disabled:opacity-50">
            {submitting ? "جاري التقديم..." : "تقديم طلب"}
          </button>
        )}
      </div>
      <BottomNav />
    </div>
  );

  // State 3: Active works
  return (
    <div className="min-h-screen bg-background flex flex-col" dir="rtl">
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <button onClick={() => navigate(-1)}><ArrowRight className="w-6 h-6" /></button>
        <h1 className="text-lg font-bold">البيدي</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-24 space-y-4">
        {/* Works Code */}
        <div className="bg-emerald-500/10 border border-emerald-500/15 rounded-2xl p-4">
          <p className="text-[10px] text-muted-foreground">كود Works</p>
          <p className="text-lg font-mono font-bold text-emerald-400">{myWorks.works_code}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card border border-border rounded-2xl p-3 text-center">
            <p className="text-2xl font-mono font-bold text-green-400">${balance.toFixed(2)}</p>
            <p className="text-[9px] text-muted-foreground">الرصيد المتاح</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-3 text-center">
            <p className="text-2xl font-mono font-bold text-emerald-400">${totalEarnings.toFixed(2)}</p>
            <p className="text-[9px] text-muted-foreground">إجمالي الأرباح</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="bg-card border border-border rounded-xl p-2 text-center">
            <p className="text-lg font-mono font-bold text-amber-400">${todayEarnings.toFixed(2)}</p>
            <p className="text-[8px] text-muted-foreground">أرباح اليوم</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-2 text-center">
            <p className="text-lg font-mono font-bold text-blue-400">${monthEarnings.toFixed(2)}</p>
            <p className="text-[8px] text-muted-foreground">أرباح الشهر</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-2 text-center">
            <p className="text-lg font-mono font-bold">{supporterCount + agentCount}</p>
            <p className="text-[8px] text-muted-foreground">الأعضاء</p>
          </div>
        </div>

        {/* Supporters */}
        <div className="bg-card border border-border rounded-2xl p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-pink-400" />
            <span className="text-xs font-bold">الداعمين ({supporterCount})</span>
            <span className="text-[9px] text-muted-foreground mr-auto">عمولة {supporterPct}%</span>
          </div>
          {members.filter(m => m.member_type === "supporter").map(m => (
            <div key={m.id} className="flex items-center justify-between bg-background/50 rounded-xl px-3 py-2">
              <span className="text-xs">{m.member_name || m.member_uuid.slice(0, 8)}</span>
              <span className="text-[10px] text-muted-foreground">${Number(m.total_commission_usd || 0).toFixed(2)}</span>
            </div>
          ))}
        </div>

        {/* Agents */}
        <div className="bg-card border border-border rounded-2xl p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-orange-400" />
            <span className="text-xs font-bold">الوكلاء ({agentCount})</span>
            <span className="text-[9px] text-muted-foreground mr-auto">عمولة {agentPct}%</span>
          </div>
          {members.filter(m => m.member_type === "agent").map(m => (
            <div key={m.id} className="flex items-center justify-between bg-background/50 rounded-xl px-3 py-2">
              <span className="text-xs">{m.member_name || m.member_uuid.slice(0, 8)}</span>
              <span className="text-[10px] text-muted-foreground">${Number(m.total_commission_usd || 0).toFixed(2)}</span>
            </div>
          ))}
        </div>

        {/* Add member */}
        <button onClick={() => setShowAddMember(true)}
          className="w-full bg-emerald-500 text-black py-3 rounded-2xl font-bold flex items-center justify-center gap-2">
          <UserPlus className="w-5 h-5" /> إضافة عضو
        </button>

        {/* Withdraw */}
        {balance > 0 && (
          <button onClick={() => setShowWithdraw(true)}
            className="w-full bg-card border border-border py-3 rounded-2xl font-bold text-foreground flex items-center justify-center gap-2">
            <Wallet className="w-5 h-5" /> سحب الرصيد (${balance.toFixed(2)})
          </button>
        )}
      </div>

      {/* Add Member Dialog */}
      <Dialog open={showAddMember} onOpenChange={v => { if (!v) { setShowAddMember(false); setAcceptedTerms(false); } }}>
        <DialogContent className="max-w-sm">
          {!acceptedTerms ? (
            <div className="p-4 space-y-3" dir="rtl">
              <p className="text-sm font-bold">شروط إضافة عضو:</p>
              <ul className="text-[11px] text-muted-foreground space-y-1">
                <li>• الحساب يجب أن يكون جديد بالكامل</li>
                <li>• لا يمكن تسجيل حساب قديم أو مسجل لدى works آخر</li>
                <li>• لا يُقبل حسابات بمستوى أعلى من 0</li>
                <li>• الحساب بعد تاريخ 19/2/2026</li>
              </ul>
              <button onClick={() => setAcceptedTerms(true)}
                className="w-full bg-emerald-500 text-black py-2.5 rounded-xl font-bold">
                أوافق على الشروط
              </button>
            </div>
          ) : (
            <div className="p-4 space-y-3" dir="rtl">
              <Input placeholder="معرف المستخدم (UUID)" value={memberUuid}
                onChange={e => setMemberUuid(e.target.value)} dir="ltr" />
              <div className="flex gap-2">
                <button onClick={() => setMemberType("supporter")}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-colors ${memberType === "supporter" ? "bg-pink-500/20 text-pink-400 border border-pink-500/20" : "bg-muted text-muted-foreground"}`}>
                  داعم
                </button>
                <button onClick={() => setMemberType("agent")}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-colors ${memberType === "agent" ? "bg-orange-500/20 text-orange-400 border border-orange-500/20" : "bg-muted text-muted-foreground"}`}>
                  وكيل
                </button>
              </div>
              <button onClick={sendInvitation} disabled={!memberUuid || sending}
                className="w-full bg-emerald-500 text-black py-2.5 rounded-xl font-bold disabled:opacity-50">
                {sending ? "جاري الإرسال..." : "إرسال دعوة"}
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Withdraw Dialog */}
      <Dialog open={showWithdraw} onOpenChange={setShowWithdraw}>
        <DialogContent className="max-w-sm">
          <div className="p-4 space-y-3" dir="rtl">
            <p className="text-sm font-bold">سحب الرصيد</p>
            <p className="text-xs text-muted-foreground">الرصيد المتاح: ${balance.toFixed(2)}</p>
            <Input type="number" placeholder="المبلغ بالدولار" value={withdrawAmount}
              onChange={e => setWithdrawAmount(e.target.value)} dir="ltr" />
            {withdrawAmount && parseFloat(withdrawAmount) > 0 && (
              <p className="text-xs text-emerald-400">= {Math.floor(parseFloat(withdrawAmount) * 8500).toLocaleString()} كوينز</p>
            )}
            <Input placeholder="UUID المستلم" value={recipientUuid}
              onChange={e => setRecipientUuid(e.target.value)} dir="ltr" />
            <button onClick={submitWithdraw} disabled={withdrawing}
              className="w-full bg-emerald-500 text-black py-2.5 rounded-xl font-bold disabled:opacity-50">
              {withdrawing ? "جاري الإرسال..." : "تقديم طلب السحب"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default WorksPage;
