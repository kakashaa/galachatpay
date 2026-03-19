import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Lock, Briefcase, Heart, Building2, UserPlus, Wallet, Loader2, ShieldAlert } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import BottomNav from "@/components/BottomNav";
import StatusModal from "@/components/StatusModal";

interface MemberWithSalary {
  id: string;
  member_uuid: string;
  member_name: string | null;
  member_type: string;
  agency_id?: string | null;
  total_commission_usd: number | null;
  status: string | null;
  works_id: string | null;
  monthly_charges?: number;
  agency_salary?: number;
  commission?: number;
}

const WARN_THRESHOLD = 3;
const BAN_THRESHOLD = 5;

const WorksPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [myWorks, setMyWorks] = useState<any>(null);
  const [members, setMembers] = useState<MemberWithSalary[]>([]);
  const [pendingRequest, setPendingRequest] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Add member dialog
  const [showAddMember, setShowAddMember] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [memberInput, setMemberInput] = useState("");
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
  const [salaryLoading, setSalaryLoading] = useState(false);

  // StatusModal
  const [modal, setModal] = useState<{ type: "success" | "error" | "loading"; message: string; vibrate?: boolean } | null>(null);
  const [isBanned, setIsBanned] = useState(false);

  const userLevel = user?.level?.charger_level || 0;

  // Anti-abuse: handle failed attempt
  const handleFailedAttempt = useCallback(async (reason: string) => {
    if (!user?.uuid) return;

    // Get attempts in last 24h
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: attempts } = await supabase
      .from("works_abuse_log")
      .select("id")
      .eq("user_uuid", user.uuid)
      .gte("created_at", since);

    const count = (attempts?.length || 0) + 1;

    // Log attempt
    await supabase.from("works_abuse_log").insert({
      user_uuid: user.uuid,
      action: "add_member_failed",
      reason,
      attempt_number: count,
    } as any);

    if (count >= BAN_THRESHOLD) {
      // Submit ban request for owner review
      await supabase.from("works_ban_requests").insert({
        user_uuid: user.uuid,
        reason: `محاولة إضافة أعضاء غير مؤهلين ${count} مرات خلال 24 ساعة`,
        attempts: count,
        status: "pending",
      } as any);

      setIsBanned(true);
      setModal({
        type: "error",
        message: `تم إيقاف حسابك مؤقتاً\n\nحاولت إضافة أعضاء غير مؤهلين ${count} مرات.\nتم إرسال طلب حظر للإدارة.\n\nالسبب: ${reason}`,
        vibrate: true,
      });
      if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 500]);

    } else if (count >= WARN_THRESHOLD) {
      setModal({
        type: "error",
        message: `تحذير أخير!\n\nحاولت ${count} مرات إضافة أعضاء غير مؤهلين.\nمحاولة أخرى وسيتم حظرك!\n\nالسبب: ${reason}`,
        vibrate: true,
      });
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);

    } else {
      setModal({
        type: "error",
        message: `فشلت الإضافة\n\n${reason}\n\nتحذير ${count}/5 — بعد 5 محاولات سيتم حظرك`,
      });
    }
  }, [user?.uuid]);

  // Check if user is banned
  const checkBanStatus = useCallback(async () => {
    if (!user?.uuid) return false;
    const { data: ban } = await supabase
      .from("works_ban_requests")
      .select("id")
      .eq("user_uuid", user.uuid)
      .eq("status", "pending")
      .maybeSingle();
    if (ban) {
      setIsBanned(true);
      return true;
    }
    return false;
  }, [user?.uuid]);

  // Auto-fetch salary data for all members
  const fetchSalaryData = useCallback(async (worksId: string, membersList: MemberWithSalary[]) => {
    const month = new Date().toISOString().slice(0, 7);
    const year = new Date().getFullYear();
    const monthNum = new Date().getMonth() + 1;

    let totalMonthCommission = 0;
    const updatedMembers = [...membersList];

    for (let i = 0; i < updatedMembers.length; i++) {
      const member = updatedMembers[i];
      try {
        if (member.member_type === "supporter") {
          const res = await fetch(
            `https://galachat.site/project-z/api.php?action=user_monthly_charges&admin_key=ghala2026owner&uuid=${member.member_uuid}&month=${month}`
          );
          const data = await res.json();
          const charges = data.total_charges || 0;
          const commission = charges * 0.02;
          updatedMembers[i] = { ...member, monthly_charges: charges, commission };
          totalMonthCommission += commission;
        }

        if (member.member_type === "agent" && member.agency_id) {
          const res = await fetch(
            `https://galachat.site/project-z/api.php?action=agency_salary&admin_key=ghala2026owner&agency_id=${member.agency_id}&year=${year}&month=${monthNum}`
          );
          const data = await res.json();
          const salary = data.salary || 0;
          const commission = salary * 0.02;
          updatedMembers[i] = { ...member, agency_salary: salary, commission };
          totalMonthCommission += commission;
        }
      } catch { /* silent */ }
    }

    return { totalMonthCommission, updatedMembers };
  }, []);

  const fetchData = useCallback(async () => {
    if (!user?.uuid) return;
    setLoading(true);
    try {
      // Check ban status first
      const banned = await checkBanStatus();
      if (banned) { setLoading(false); return; }

      const { data: works } = await supabase
        .from("works_accounts").select("*")
        .eq("user_uuid", user.uuid).eq("status", "active").maybeSingle();

      if (works) {
        setMyWorks(works);
        const { data: m } = await supabase
          .from("works_members").select("*").eq("works_id", works.id).eq("status", "active");
        const rawMembers = (m || []) as any as MemberWithSalary[];
        setMembers(rawMembers);

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

        // Auto-fetch salary data
        if (rawMembers.length > 0) {
          setSalaryLoading(true);
          try {
            const { totalMonthCommission, updatedMembers } = await fetchSalaryData(works.id, rawMembers);
            setMembers(updatedMembers);
            if (totalMonthCommission > 0) {
              setMonthEarnings(prev => Math.max(prev, totalMonthCommission));
            }
          } catch { /* silent */ }
          setSalaryLoading(false);
        }
      } else {
        const { data: req } = await supabase
          .from("works_requests").select("status").eq("user_uuid", user.uuid)
          .eq("status", "pending").maybeSingle();
        setPendingRequest(!!req);
      }
    } catch { /* silent */ }
    setLoading(false);
  }, [user?.uuid, fetchSalaryData, checkBanStatus]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const submitRequest = async () => {
    if (!user?.uuid || submitting) return;
    setSubmitting(true);
    setModal({ type: "loading", message: "جاري تقديم الطلب..." });
    try {
      await supabase.from("works_requests").insert({
        user_uuid: user.uuid, user_name: user.name || "", user_level: userLevel,
      } as any);
      setModal({ type: "success", message: "تم تقديم الطلب بنجاح\nسيتم مراجعته من الإدارة" });
      setPendingRequest(true);
    } catch {
      setModal({ type: "error", message: "فشل تقديم الطلب\nحاول مرة أخرى" });
    }
    setSubmitting(false);
  };

  // Validate supporter
  const validateSupporter = async (uuid: string): Promise<{ ok: boolean; reason?: string; name?: string }> => {
    const userRes = await fetch(
      `https://galachat.site/project-z/api.php?action=admin_user_info&admin_key=ghala2026owner&uuid=${uuid}`
    );
    const userData = await userRes.json();

    if (!userData.success || !userData.name) {
      return { ok: false, reason: "المستخدم غير موجود" };
    }

    if (userData.sender_level > 0 || userData.receiver_level > 0 || userData.charger_level > 0) {
      return { ok: false, reason: `لا يمكن إضافة هذا المستخدم\nمستوى حسابه: إرسال ${userData.sender_level} / استقبال ${userData.receiver_level} / شحن ${userData.charger_level}\nلازم يكون مستوى 0` };
    }

    const minDate = new Date("2026-02-19T00:00:00");
    if (new Date(userData.created_at) < minDate) {
      return { ok: false, reason: `لا يمكن إضافة هذا المستخدم\nتاريخ إنشاء الحساب: ${new Date(userData.created_at).toLocaleDateString("ar-SA")}\nلازم يكون حساب جديد (بعد 19/2/2026)` };
    }

    if (userData.agency_id > 0) {
      return { ok: false, reason: `لا يمكن إضافة هذا المستخدم\nمسجّل بوكالة (ID: ${userData.agency_id})` };
    }

    const { data: existingMember } = await supabase
      .from("works_members").select("id, works_id")
      .eq("member_uuid", uuid).eq("status", "active").maybeSingle();
    if (existingMember) {
      return { ok: false, reason: `هذا المستخدم مسجّل بفريق بيدي آخر` };
    }

    const { data: otherSupporter } = await supabase
      .from("works_members").select("id")
      .eq("member_uuid", uuid).eq("member_type", "supporter").maybeSingle();
    if (otherSupporter) {
      return { ok: false, reason: "هذا المستخدم مسجّل كداعم عند شخص ثاني" };
    }

    return { ok: true, name: userData.name };
  };

  // Validate agent by agency code
  const validateAgent = async (agencyId: string): Promise<{ ok: boolean; reason?: string; name?: string; uuid?: string; agency_id?: string }> => {
    const agencyRes = await fetch(
      `https://galachat.site/project-z/api.php?action=agency_detail&admin_key=ghala2026owner&agency_id=${agencyId}`
    );
    const agencyData = await agencyRes.json();

    if (!agencyData.success) {
      return { ok: false, reason: "الوكالة غير موجودة" };
    }

    const ownerUuid = agencyData.owner_uuid;

    const { data: existingAgent } = await supabase
      .from("works_members").select("id, works_id")
      .eq("agency_id", agencyId).eq("status", "active").maybeSingle();
    if (existingAgent) {
      return { ok: false, reason: `هذه الوكالة مسجّلة بفريق بيدي آخر` };
    }

    const memberCheck = await validateSupporter(ownerUuid);
    if (!memberCheck.ok) {
      return { ok: false, reason: `صاحب الوكالة (${ownerUuid}):\n${memberCheck.reason}` };
    }

    return { ok: true, uuid: ownerUuid, name: memberCheck.name || agencyData.name, agency_id: agencyId };
  };

  const sendInvitation = async () => {
    if (!memberInput.trim() || !myWorks || sending || isBanned) return;
    setSending(true);
    setModal({ type: "loading", message: memberType === "agent" ? "جاري التحقق من الوكالة..." : "جاري التحقق من المستخدم..." });

    try {
      if (memberType === "supporter") {
        const result = await validateSupporter(memberInput.trim());
        if (!result.ok) {
          await handleFailedAttempt(result.reason!);
          setSending(false);
          return;
        }

        const { data: alreadyInTeam } = await supabase
          .from("works_members").select("id")
          .eq("works_id", myWorks.id).eq("member_uuid", memberInput.trim()).maybeSingle();
        if (alreadyInTeam) {
          setModal({ type: "error", message: "هذا المستخدم موجود بفريقك بالفعل" });
          setSending(false);
          return;
        }

        await supabase.from("works_members").insert({
          works_id: myWorks.id, member_uuid: memberInput.trim(), member_name: result.name,
          member_type: "supporter", status: "pending",
        } as any);
        await supabase.from("notifications").insert({
          user_uuid: memberInput.trim(),
          title: "دعوة للانضمام لـ البيدي 🤝",
          body: `${user?.name || "مستخدم"} يدعوك للانضمام لفريقه كـ داعم`,
          type: "works_invitation", is_read: false,
        } as any);
      } else {
        const result = await validateAgent(memberInput.trim());
        if (!result.ok) {
          await handleFailedAttempt(result.reason!);
          setSending(false);
          return;
        }

        const { data: alreadyInTeam } = await supabase
          .from("works_members").select("id")
          .eq("works_id", myWorks.id).eq("member_uuid", result.uuid!).maybeSingle();
        if (alreadyInTeam) {
          setModal({ type: "error", message: "هذه الوكالة موجودة بفريقك بالفعل" });
          setSending(false);
          return;
        }

        await supabase.from("works_members").insert({
          works_id: myWorks.id, member_uuid: result.uuid!, member_name: result.name,
          member_type: "agent", status: "pending", agency_id: result.agency_id,
        } as any);
        await supabase.from("notifications").insert({
          user_uuid: result.uuid!,
          title: "دعوة للانضمام لـ البيدي 🤝",
          body: `${user?.name || "مستخدم"} يدعوك للانضمام لفريقه كـ وكيل`,
          type: "works_invitation", is_read: false,
        } as any);
      }

      setModal({ type: "success", message: "تم إرسال الدعوة بنجاح" });
      setShowAddMember(false); setMemberInput(""); setAcceptedTerms(false);
      fetchData();
    } catch (e: any) {
      setModal({ type: "error", message: e.message?.includes("duplicate") ? "هذا العضو مسجل بالفعل" : "فشل الإرسال\nحاول مرة أخرى" });
    }
    setSending(false);
  };

  const submitWithdraw = async () => {
    if (!myWorks || withdrawing) return;
    const amt = parseFloat(withdrawAmount);
    if (!amt || amt <= 0 || amt > Number(myWorks.balance_usd)) {
      setModal({ type: "error", message: "مبلغ غير صحيح" });
      return;
    }
    if (!recipientUuid.trim()) {
      setModal({ type: "error", message: "أدخل UUID المستلم" });
      return;
    }
    setWithdrawing(true);
    setModal({ type: "loading", message: "جاري تقديم طلب السحب..." });
    try {
      await supabase.from("works_withdrawals").insert({
        works_id: myWorks.id, user_uuid: user!.uuid, amount_usd: amt,
        amount_coins: Math.floor(amt * 8500), recipient_uuid: recipientUuid.trim(),
      } as any);
      setModal({ type: "success", message: `تم تقديم طلب السحب\n$${amt.toFixed(2)} = ${Math.floor(amt * 8500).toLocaleString()} كوينز` });
      setShowWithdraw(false); setWithdrawAmount(""); setRecipientUuid("");
    } catch {
      setModal({ type: "error", message: "فشل تقديم الطلب\nحاول مرة أخرى" });
    }
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

  // Banned state
  if (isBanned) return (
    <div className="min-h-screen bg-background flex flex-col" dir="rtl">
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <button onClick={() => navigate(-1)}><ArrowRight className="w-6 h-6" /></button>
        <h1 className="text-lg font-bold">البيدي</h1>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center space-y-4">
        <ShieldAlert className="w-16 h-16 text-destructive" />
        <p className="text-lg font-bold text-destructive">تم إيقاف حسابك مؤقتاً</p>
        <p className="text-sm text-muted-foreground">تم رصد محاولات متكررة لإضافة أعضاء غير مؤهلين.</p>
        <p className="text-xs text-muted-foreground">طلب الحظر بانتظار مراجعة الإدارة.</p>
      </div>
      <BottomNav />
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
            <p className="text-sm text-amber-400 font-bold">طلبك قيد المراجعة</p>
          </div>
        ) : (
          <button onClick={submitRequest} disabled={submitting}
            className="bg-emerald-500 text-black px-8 py-3 rounded-2xl font-bold disabled:opacity-50">
            {submitting ? "جاري التقديم..." : "تقديم طلب"}
          </button>
        )}
      </div>
      {modal && <StatusModal type={modal.type} message={modal.message} vibrate={modal.vibrate} onClose={() => setModal(null)} />}
      <BottomNav />
    </div>
  );

  // State 3: Active works
  return (
    <div className="min-h-screen bg-background flex flex-col" dir="rtl">
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <button onClick={() => navigate(-1)}><ArrowRight className="w-6 h-6" /></button>
        <h1 className="text-lg font-bold">البيدي</h1>
        {salaryLoading && <Loader2 className="w-4 h-4 animate-spin text-emerald-400 mr-auto" />}
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-24 space-y-4">
        {/* Works Code */}
        {/* Works Code */}
        <div className="bg-emerald-500/10 border border-emerald-500/15 rounded-2xl p-4">
          <p className="text-[10px] text-muted-foreground">كود البيدي</p>
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
            <p className="text-[7px] text-muted-foreground">~{Math.floor(monthEarnings * 7500).toLocaleString()} عملة</p>
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
            <div key={m.id} className="bg-background/50 rounded-xl px-3 py-2 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs">{m.member_name || m.member_uuid.slice(0, 8)}</span>
                <span className="text-[10px] text-muted-foreground">${Number(m.total_commission_usd || 0).toFixed(2)}</span>
              </div>
              {m.monthly_charges !== undefined && (
                <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                  <span>شحن الشهر: {m.monthly_charges?.toLocaleString()} عملة</span>
                  <span className="text-emerald-400">${(m.commission || 0).toFixed(2)} عمولة</span>
                </div>
              )}
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
            <div key={m.id} className="bg-background/50 rounded-xl px-3 py-2 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs">{m.member_name || m.member_uuid.slice(0, 8)}</span>
                <span className="text-[10px] text-muted-foreground">${Number(m.total_commission_usd || 0).toFixed(2)}</span>
              </div>
              {m.agency_salary !== undefined && (
                <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                  <span>راتب الوكالة: ${m.agency_salary?.toFixed(2)}</span>
                  <span className="text-emerald-400">${(m.commission || 0).toFixed(2)} عمولة</span>
                </div>
              )}
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
      <Dialog open={showAddMember} onOpenChange={v => { if (!v) { setShowAddMember(false); setAcceptedTerms(false); setMemberInput(""); } }}>
        <DialogContent className="max-w-sm">
          {!acceptedTerms ? (
            <div className="p-4 space-y-3" dir="rtl">
              <p className="text-sm font-bold">شروط إضافة عضو:</p>
              <ul className="text-[11px] text-muted-foreground space-y-1">
                <li>• الحساب يجب أن يكون جديد بالكامل</li>
                <li>• لا يمكن تسجيل حساب قديم أو مسجل لدى بيدي آخر</li>
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
              <div className="flex gap-2">
                <button onClick={() => { setMemberType("supporter"); setMemberInput(""); }}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-colors ${memberType === "supporter" ? "bg-pink-500/20 text-pink-400 border border-pink-500/20" : "bg-muted text-muted-foreground"}`}>
                  داعم
                </button>
                <button onClick={() => { setMemberType("agent"); setMemberInput(""); }}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-colors ${memberType === "agent" ? "bg-orange-500/20 text-orange-400 border border-orange-500/20" : "bg-muted text-muted-foreground"}`}>
                  وكيل
                </button>
              </div>

              <Input
                placeholder={memberType === "agent" ? "كود الوكالة (Agency ID)" : "معرف المستخدم (UUID)"}
                value={memberInput}
                onChange={e => setMemberInput(e.target.value)}
                dir="ltr"
              />

              <button onClick={sendInvitation} disabled={!memberInput || sending}
                className="w-full bg-emerald-500 text-black py-2.5 rounded-xl font-bold disabled:opacity-50">
                {sending ? "جاري التحقق..." : "إرسال دعوة"}
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

      {modal && <StatusModal type={modal.type} message={modal.message} vibrate={modal.vibrate} onClose={() => setModal(null)} />}
      <BottomNav />
    </div>
  );
};

export default WorksPage;
