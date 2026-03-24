import React, { useState, useEffect, useCallback } from "react";
import FancyLoading from "@/components/FancyLoading";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Lock, Briefcase, Heart, Building2, UserPlus, Wallet, Loader2, ShieldAlert, CheckCircle, Copy, Send, HelpCircle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import BottomNav from "@/components/BottomNav";
import StatusModal from "@/components/StatusModal";
import { galaApi } from "@/services/galaApi";
import { getAvatar, handleAvatarError } from "@/lib/avatarHelper";
import WorksCountdown from "@/components/WorksCountdown";

/* ── Tooltip bubble component ── */
const InfoTip: React.FC<{ text: string }> = ({ text }) => {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="w-5 h-5 rounded-full bg-muted/60 flex items-center justify-center hover:bg-muted transition-colors"
      >
        <HelpCircle className="w-3 h-3 text-muted-foreground" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            className="absolute top-7 left-1/2 -translate-x-1/2 z-50 bg-card border border-border rounded-xl px-3 py-2 shadow-lg min-w-[180px]"
          >
            <button onClick={(e) => { e.stopPropagation(); setOpen(false); }} className="absolute top-1 left-1">
              <X className="w-3 h-3 text-muted-foreground" />
            </button>
            <p className="text-[11px] text-foreground leading-relaxed text-right">{text}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
};

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

const BAN_THRESHOLD = 4; // per-target attempts before ban
const COINS_PER_USD = 7500;

const toFiniteNumber = (value: unknown): number => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, "").trim());
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

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
  const [instructionModal, setInstructionModal] = useState<"supporter" | "agent" | null>(null);

  // Withdraw
  const [withdrawing, setWithdrawing] = useState(false);

  // Earnings
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [monthEarnings, setMonthEarnings] = useState(0);
  const [salaryLoading, setSalaryLoading] = useState(false);
  const [memberAvatars, setMemberAvatars] = useState<Record<string, string>>({});
  

  // StatusModal
  const [modal, setModal] = useState<{ type: "success" | "error" | "loading"; message: string; vibrate?: boolean } | null>(null);
  const [isBanned, setIsBanned] = useState(false);

  const userLevel = user?.level?.charger_level || 0;

  // Anti-abuse: handle failed attempt (per-target, daily reset)
  const handleFailedAttempt = useCallback(async (reason: string, targetId: string) => {
    if (!user?.uuid) return;

    // Get today's start (midnight UTC)
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const since = todayStart.toISOString();

    // Count attempts for THIS specific target today
    const { data: attempts } = await supabase
      .from("works_abuse_log")
      .select("id")
      .eq("user_uuid", user.uuid)
      .eq("action", `add_member_failed:${targetId}`)
      .gte("created_at", since);

    const count = (attempts?.length || 0) + 1;

    // Log attempt with target info
    await supabase.from("works_abuse_log").insert({
      user_uuid: user.uuid,
      action: `add_member_failed:${targetId}`,
      reason,
      attempt_number: count,
    } as any);

    if (count >= BAN_THRESHOLD) {
      // Submit ban request
      await supabase.from("works_ban_requests").insert({
        user_uuid: user.uuid,
        reason: `محاولة إضافة نفس العضو (${targetId}) ${count} مرات في يوم واحد`,
        attempts: count,
        status: "pending",
      } as any);

      setIsBanned(true);
      setModal({
        type: "error",
        message: `تم إيقاف حسابك مؤقتاً\n\nحاولت إضافة نفس العضو (${targetId}) ${count} مرات اليوم.\n\nالسبب: ${reason}`,
        vibrate: true,
      });
      if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 500]);

    } else if (count >= BAN_THRESHOLD - 1) {
      setModal({
        type: "error",
        message: `تحذير أخير!\n\nحاولت إضافة نفس العضو (${targetId}) ${count} مرات.\nمحاولة أخرى وسيتم حظرك!\n\nالسبب: ${reason}`,
        vibrate: true,
      });
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);

    } else {
      setModal({
        type: "error",
        message: `فشلت الإضافة\n\n${reason}\n\nتحذير ${count}/${BAN_THRESHOLD} لهذا الآيدي — بعد ${BAN_THRESHOLD} محاولات على نفس الآيدي اليوم سيتم حظرك`,
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

  // No more live API calls — earnings come from stored DB values only

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

        const now = new Date();
        const todayStartUtc = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0));
        const monthStartUtc = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1, 0, 0, 0));
        const todayDate = todayStartUtc.toISOString().slice(0, 10);
        const [{ data: m }, { data: todayRows }, { data: monthLogs }] = await Promise.all([
          supabase
            .from("works_members")
            .select("*")
            .eq("works_id", works.id)
            .eq("status", "active"),
          supabase
            .from("works_commission_logs" as any)
            .select("amount,created_at")
            .eq("bd_uuid", user.uuid)
            .gte("created_at", todayStartUtc.toISOString()),
          supabase
            .from("works_commission_logs" as any)
            .select("amount,member_uuid,source_amount,created_at")
            .eq("bd_uuid", user.uuid)
            .gte("created_at", monthStartUtc.toISOString()),
        ]);

        // Build per-member monthly data from commission logs
        const perMember: Record<string, { charges: number; salary: number; commission: number }> = {};
        for (const log of (monthLogs || []) as any[]) {
          const uuid = log.member_uuid;
          if (!uuid) continue;
          if (!perMember[uuid]) perMember[uuid] = { charges: 0, salary: 0, commission: 0 };
          perMember[uuid].charges += toFiniteNumber(log.source_amount);
          perMember[uuid].commission += toFiniteNumber(log.amount);
        }
        

        const rawMembers = (m || []) as any as MemberWithSalary[];
        // Enrich members with computed monthly data
        const enrichedMembers = rawMembers.map(member => ({
          ...member,
          monthly_charges: perMember[member.member_uuid]?.charges || toFiniteNumber(member.monthly_charges),
          commission: perMember[member.member_uuid]?.commission || toFiniteNumber(member.commission),
        }));
        setMembers(enrichedMembers);

        const todayUsd = (todayRows || []).reduce((sum: number, row: any) => {
          if (String(row?.created_at || "").slice(0, 10) !== todayDate) return sum;
          return sum + toFiniteNumber(row?.amount ?? 0);
        }, 0);
        setTodayEarnings(todayUsd);

        // Calculate month earnings from enriched data
        const totalCommissionUsd = enrichedMembers.reduce(
          (sum, member) => sum + toFiniteNumber(member.commission || member.total_commission_usd || 0), 0
        );
        setMonthEarnings(Math.floor(totalCommissionUsd * COINS_PER_USD));
        setSalaryLoading(false);
      } else {
        const { data: req } = await supabase
          .from("works_requests").select("status").eq("user_uuid", user.uuid)
          .eq("status", "pending").maybeSingle();
        setPendingRequest(!!req);
      }
    } catch { /* silent */ }
    setLoading(false);
  }, [user?.uuid, checkBanStatus]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const uuids = [...new Set(members.map((m) => m.member_uuid).filter(Boolean))];
    if (uuids.length === 0) return;

    let cancelled = false;
    const loadAvatars = async () => {
      const entries = await Promise.all(
        uuids.map(async (uuid) => [uuid, await getAvatar(uuid)] as const)
      );
      if (cancelled) return;
      setMemberAvatars((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
    };

    loadAvatars();
    return () => {
      cancelled = true;
    };
  }, [members]);

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
    try {
      const data = await galaApi.checkSupporter(uuid);

      if (!data.ok) {
        return { ok: false, reason: data.error || "المستخدم غير موجود" };
      }

      if (!data.data?.eligible) {
        return { ok: false, reason: "لا يمكن إضافة هذا المستخدم:\n" + (data.data?.reason || "غير مؤهل") };
      }

      // Check not registered with another BD
      const { data: existing } = await supabase
        .from("works_members").select("id")
        .eq("member_uuid", uuid).eq("status", "active").maybeSingle();
      if (existing) {
        return { ok: false, reason: "هذا المستخدم مسجّل بفريق بيدي آخر" };
      }

      return { ok: true, name: data.data.name };
    } catch {
      return { ok: false, reason: "فشل الاتصال بالسيرفر" };
    }
  };

  // Validate agent by agency code
  const validateAgent = async (agencyId: string): Promise<{ ok: boolean; reason?: string; name?: string; uuid?: string; agency_id?: string }> => {
    try {
      const data = await galaApi.checkAgency(agencyId);

      if (!data.ok) {
        return { ok: false, reason: data.error || "الوكالة غير موجودة — تأكد من الكود" };
      }

      if (data.data?.has_salary) {
        return { ok: false, reason: `هذه الوكالة قديمة (راتب: $${data.data.salary?.toFixed(2)})\nفقط الإدارة تقدر تضيفها` };
      }

      // Use owner_uuid from API (fixed by backend), fallback to owner_internal_id
      const ownerUuid = data.data.owner_uuid || String(data.data.owner_internal_id);
      if (!ownerUuid) {
        return { ok: false, reason: "لم يتم العثور على UUID صاحب الوكالة" };
      }

      // Check not registered with another BD
      const { data: existing } = await supabase
        .from("works_members").select("id")
        .eq("agency_id", agencyId).eq("status", "active").maybeSingle();
      if (existing) {
        return { ok: false, reason: "هذه الوكالة مسجّلة بفريق بيدي آخر" };
      }

      return { ok: true, uuid: ownerUuid, name: data.data.name, agency_id: agencyId };
    } catch {
      return { ok: false, reason: "فشل الاتصال بالسيرفر" };
    }
  };

  const sendInvitation = async () => {
    if (!memberInput.trim() || !myWorks || sending || isBanned) return;
    setSending(true);
    setModal({ type: "loading", message: memberType === "agent" ? "جاري التحقق من الوكالة..." : "جاري التحقق من المستخدم..." });

    try {
      if (memberType === "supporter") {
        const result = await validateSupporter(memberInput.trim());
        if (!result.ok) {
          await handleFailedAttempt(result.reason!, memberInput.trim());
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
          await handleFailedAttempt(result.reason!, memberInput.trim());
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

      setModal(null);
      setShowAddMember(false); setMemberInput(""); setAcceptedTerms(false);
      setInstructionModal(memberType);
      fetchData();
    } catch (e: any) {
      setModal({ type: "error", message: e.message?.includes("duplicate") ? "هذا العضو مسجل بالفعل" : "فشل الإرسال\nحاول مرة أخرى" });
    }
    setSending(false);
  };

  const submitWithdraw = async () => {
    if (!myWorks || withdrawing || !user?.uuid) return;
    const dayOfMonth = new Date().getDate();
    if (dayOfMonth > 5) {
      setModal({ type: "error", message: "الصرف متاح أول 5 أيام من الشهر الجديد فقط" });
      return;
    }
    if (monthEarnings <= 0) {
      setModal({ type: "error", message: "لا توجد أرباح لصرفها" });
      return;
    }
    setWithdrawing(true);
    setModal({ type: "loading", message: "جاري تقديم طلب صرف النسبة..." });

    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const withdrawMonth = lastMonth.toISOString().slice(0, 7);
    const usdAmount = monthEarnings / COINS_PER_USD;

    try {
      await (supabase.from("works_withdrawals" as any)).insert({
        bd_uuid: user.uuid,
        bd_name: user.name || "",
        amount: usdAmount,
        status: "pending",
        transfer_type: "commission",
        country: withdrawMonth,
        admin_note: `كوينز: ${monthEarnings.toLocaleString()} | شهر: ${withdrawMonth}`,
      });
      setModal({ type: "success", message: "تم إرسال طلبك — سيتم مراجعته" });
    } catch {
      setModal({ type: "error", message: "فشل تقديم الطلب\nحاول مرة أخرى" });
    }
    setWithdrawing(false);
  };

  const supporterCount = members.filter(m => m.member_type === "supporter").length;
  const agentCount = members.filter(m => m.member_type === "agent").length;
  const balance = Number(myWorks?.balance_usd || 0);
  const storedTotalEarningsUsd = Number(myWorks?.total_earnings_usd || 0);
  const monthEarningsUsd = monthEarnings / COINS_PER_USD;
  const totalEarningsUsd = Math.max(storedTotalEarningsUsd, monthEarningsUsd);
  const totalEarningsCoins = Math.floor(totalEarningsUsd * COINS_PER_USD);
  const supporterPct = Number(myWorks?.supporter_commission_pct || 2);
  const agentPct = Number(myWorks?.agent_commission_pct || 3);

  if (loading) return (
    <div className="min-h-screen bg-background">
      <FancyLoading
        title="جاري التحميل"
        subtitle="نجلب لك بيانات حسابك"
        tips={[
          "جاري جلب البيانات...",
          "نتحقق من حالة حسابك...",
          "ثواني ويظهر لك كل شي...",
        ]}
      />
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
  if (false) return (
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
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card/50 backdrop-blur-sm">
        <button onClick={() => navigate(-1)}><ArrowRight className="w-6 h-6 text-foreground" /></button>
        <h1 className="text-lg font-black font-cairo text-foreground">لوحة البيدي</h1>
        {salaryLoading && <Loader2 className="w-4 h-4 animate-spin text-primary mr-auto" />}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-28 space-y-5">

        {/* Works Code Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-muted-foreground mb-1">كود البيدي الخاص بك</p>
              <p className="text-2xl font-mono font-black text-primary tracking-wider">{myWorks.works_code}</p>
            </div>
            <InfoTip text="كود البيدي هو معرفك الفريد. شاركه مع الأعضاء الجدد للانضمام لفريقك" />
          </div>
          <div className="absolute -left-4 -bottom-4 w-20 h-20 rounded-full bg-primary/5 blur-xl" />
        </motion.div>

        {/* Financial Stats Grid */}
        <div className="space-y-3">
          <h2 className="text-sm font-black text-foreground">الإحصائيات المالية</h2>

          {/* Top row: Balance + Total Earnings */}
          <div className="grid grid-cols-2 gap-3">
            {/* الرصيد المتاح */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              onClick={() => { if (balance > 0) submitWithdraw(); }}
              className="rounded-2xl border border-border bg-card p-4 space-y-2"
              style={{ cursor: balance > 0 ? 'pointer' : 'default' }}
            >
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Wallet className="w-4 h-4 text-primary" />
                </div>
                <InfoTip text="الرصيد المتاح للسحب. يمكنك طلب سحبه في أول 5 أيام من كل شهر" />
              </div>
              <p className="text-2xl font-mono font-black text-foreground">${balance.toFixed(2)}</p>
              <p className="text-[10px] font-bold text-muted-foreground">{Math.round(balance * COINS_PER_USD).toLocaleString()} كوينز</p>
              <p className="text-xs font-black text-muted-foreground">الرصيد المتاح</p>
              {balance > 0 && <p className="text-[10px] text-primary font-black">اضغط لطلب سحب ←</p>}
            </motion.div>

            {/* إجمالي الأرباح */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-2xl border border-border bg-card p-4 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Briefcase className="w-4 h-4 text-primary" />
                </div>
                <InfoTip text="إجمالي جميع الأرباح التي حققتها منذ انضمامك لنظام البيدي" />
              </div>
              <p className="text-2xl font-mono font-black text-foreground">${totalEarningsUsd.toFixed(2)}</p>
              <p className="text-[10px] font-bold text-muted-foreground">{totalEarningsCoins.toLocaleString()} كوينز</p>
              <p className="text-xs font-black text-muted-foreground">إجمالي الأرباح</p>
            </motion.div>
          </div>

          {/* Bottom row: Today + Month + Members */}
          <div className="grid grid-cols-3 gap-2">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="rounded-xl border border-border bg-card p-3 space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black text-muted-foreground">أرباح اليوم</p>
                <InfoTip text="الأرباح المحققة اليوم فقط. تتصفر كل يوم جديد" />
              </div>
              <p className="text-lg font-mono font-black text-foreground">${todayEarnings.toFixed(2)}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-xl border border-border bg-card p-3 space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black text-muted-foreground">أرباح الشهر</p>
                <InfoTip text="عمولاتك هذا الشهر من جميع الأعضاء (بالكوينز)" />
              </div>
              <p className="text-lg font-mono font-black text-primary">{monthEarnings.toLocaleString()}</p>
              <p className="text-[8px] text-muted-foreground font-bold">كوينز</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="rounded-xl border border-border bg-card p-3 space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black text-muted-foreground">الأعضاء</p>
                <InfoTip text="عدد الأعضاء النشطين في فريقك (داعمين + وكلاء)" />
              </div>
              <p className="text-lg font-mono font-black text-foreground">{supporterCount + agentCount}</p>
              <p className="text-[8px] text-muted-foreground font-bold">{supporterCount} داعم · {agentCount} وكيل</p>
            </motion.div>
          </div>

          {/* Last updated + countdown */}
          {myWorks?.updated_at && (
            <WorksCountdown updatedAt={myWorks.updated_at} onExpire={fetchData} />
          )}
        </div>

        {/* ── Supporters Section ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl border border-border bg-card overflow-hidden"
        >
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/20">
            <Heart className="w-4 h-4 text-primary" />
            <span className="text-sm font-black text-foreground">الداعمين</span>
            <span className="text-xs font-bold text-muted-foreground">({supporterCount})</span>
            <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full mr-auto">عمولة {supporterPct}%</span>
          </div>
          <div className="p-3 space-y-2">
            {members.filter(m => m.member_type === "supporter").length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">لا يوجد داعمين بعد</p>
            )}
            {members.filter(m => m.member_type === "supporter").map((m, i) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 + i * 0.05 }}
                className="bg-muted/30 rounded-xl px-3 py-3 space-y-2"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={memberAvatars[m.member_uuid] || "/placeholder.svg"}
                    onError={handleAvatarError}
                    className="w-10 h-10 rounded-full object-cover shrink-0 border-2 border-primary/20"
                    alt={m.member_name || ""}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-foreground truncate">{m.member_name || m.member_uuid.slice(0, 8)}</p>
                    <p className="text-[10px] text-muted-foreground font-mono" dir="ltr">#{m.member_uuid}</p>
                  </div>
                  <div className="text-left shrink-0">
                    <p className="text-sm font-black text-primary">{toFiniteNumber(m.monthly_charges).toLocaleString()}</p>
                    <p className="text-[9px] text-muted-foreground">كوينز</p>
                  </div>
                </div>
                <div className="space-y-1 px-1 pt-1 border-t border-border/50">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground font-bold">شحنات الشهر: {toFiniteNumber(m.monthly_charges).toLocaleString()} كوينز</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground font-bold">عمولتك:</span>
                    <span className="text-emerald-400 font-black">${(toFiniteNumber(m.commission) > 0 ? toFiniteNumber(m.commission) : toFiniteNumber(m.total_commission_usd)).toFixed(2)}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ── Agents Section ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-2xl border border-border bg-card overflow-hidden"
        >
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/20">
            <Building2 className="w-4 h-4 text-primary" />
            <span className="text-sm font-black text-foreground">الوكلاء</span>
            <span className="text-xs font-bold text-muted-foreground">({agentCount})</span>
            <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full mr-auto">عمولة {agentPct}%</span>
          </div>
          <div className="p-3 space-y-2">
            {members.filter(m => m.member_type === "agent").length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">لا يوجد وكلاء بعد</p>
            )}
            {members.filter(m => m.member_type === "agent").map((m, i) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.45 + i * 0.05 }}
                className="bg-muted/30 rounded-xl px-3 py-3 space-y-2"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={memberAvatars[m.member_uuid] || "/placeholder.svg"}
                    onError={handleAvatarError}
                    className="w-10 h-10 rounded-full object-cover shrink-0 border-2 border-primary/20"
                    alt={m.member_name || ""}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-foreground truncate">{m.member_name || m.member_uuid.slice(0, 8)}</p>
                    <p className="text-[10px] text-muted-foreground font-mono" dir="ltr">#{m.member_uuid}</p>
                  </div>
                  <div className="text-left shrink-0">
                    <p className="text-sm font-black text-primary">${toFiniteNumber(m.agency_salary).toFixed(2)}</p>
                  </div>
                </div>
                <div className="space-y-1 px-1 pt-1 border-t border-border/50">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground font-bold">الراتب: ${toFiniteNumber(m.agency_salary).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground font-bold">عمولتك:</span>
                    <span className="text-emerald-400 font-black">${(toFiniteNumber(m.commission) > 0 ? toFiniteNumber(m.commission) : toFiniteNumber(m.total_commission_usd)).toFixed(2)}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowAddMember(true)}
            className="w-full bg-primary text-primary-foreground py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg"
          >
            <UserPlus className="w-5 h-5" /> إضافة عضو جديد
          </motion.button>

          {(() => {
            const dayOfMonth = new Date().getDate();
            const canWithdraw = dayOfMonth <= 5;
            const coinsAmount = Math.floor(monthEarnings);
            return canWithdraw ? (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 }}
                whileTap={{ scale: 0.97 }}
                onClick={submitWithdraw}
                disabled={withdrawing || monthEarnings <= 0}
                className="w-full bg-primary text-primary-foreground py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Wallet className="w-5 h-5" /> صرف نسبتي ({coinsAmount.toLocaleString()} كوينز)
              </motion.button>
            ) : (
              <div className="w-full bg-card border border-border py-3.5 rounded-2xl text-center space-y-1">
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Lock className="w-4 h-4" />
                  <span className="font-black text-sm">صرف نسبتي</span>
                </div>
                <p className="text-[10px] text-muted-foreground font-bold">يفتح بداية الشهر الجديد (أول 5 أيام)</p>
              </div>
            );
          })()}
        </div>
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
                  داعم (UUID)
                </button>
                <button onClick={() => { setMemberType("agent"); setMemberInput(""); }}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-colors ${memberType === "agent" ? "bg-orange-500/20 text-orange-400 border border-orange-500/20" : "bg-muted text-muted-foreground"}`}>
                  وكيل (كود الوكالة)
                </button>
              </div>

              <Input
                placeholder={memberType === "agent" ? "كود الوكالة (مثال: 2, 3, 5...)" : "معرف المستخدم (UUID)"}
                value={memberInput}
                onChange={e => setMemberInput(e.target.value)}
                dir="ltr"
              />

              <motion.button
                onClick={sendInvitation}
                disabled={!memberInput || sending}
                className="w-full bg-emerald-500 text-black py-2.5 rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2 overflow-hidden relative"
                whileTap={{ scale: 0.97 }}
              >
                <AnimatePresence mode="wait">
                  {sending ? (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex items-center gap-2"
                    >
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                      >
                        <Loader2 className="w-4 h-4" />
                      </motion.div>
                      <motion.span
                        animate={{ opacity: [1, 0.5, 1] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                      >
                        {memberType === "agent" ? "جاري التحقق من الوكالة..." : "جاري التحقق من المستخدم..."}
                      </motion.span>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="idle"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex items-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      <span>إرسال دعوة</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Instruction Modal after successful invitation */}
      <Dialog open={!!instructionModal} onOpenChange={() => setInstructionModal(null)}>
        <DialogContent className="max-w-sm">
          <div className="p-4 space-y-5 text-center" dir="rtl">
            {/* Animated success icon */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
              className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto"
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <CheckCircle className="w-8 h-8 text-emerald-400" />
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h3 className="text-lg font-black text-foreground mb-1">
                {instructionModal === "supporter" ? "تم إرسال الدعوة! 🎉" : "تم إرسال الطلب! 🎉"}
              </h3>
              <p className="text-xs text-muted-foreground">
                {instructionModal === "supporter"
                  ? "أرسل هذه الخطوات للداعم عشان يقبل الدعوة:"
                  : "أرسل هذه الخطوات لصاحب الوكالة عشان يقبل الدعوة:"}
              </p>
            </motion.div>

            {/* Steps with staggered animation */}
            <div className="bg-muted/20 border border-border rounded-2xl p-4 space-y-3 text-right">
              {[
                { icon: "🌐", text: "يفتح الرابط: galachatpay.lovable.app" },
                { icon: "🔑", text: "يسجّل دخول بـ UUID وكلمة المرور" },
                { icon: "🔔", text: instructionModal === "supporter"
                  ? "يروح الإشعارات — بيلاقي دعوة الانضمام للبيدي"
                  : "يروح الإشعارات — بيلاقي طلب انضمام الوكالة للبيدي" },
                { icon: "✅", text: 'يضغط "قبول" وينضم للفريق!' },
              ].map((step, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.15 }}
                  className="flex items-start gap-3 text-xs"
                >
                  <div className="w-7 h-7 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <span className="text-sm">{step.icon}</span>
                  </div>
                  <span className="text-muted-foreground leading-relaxed pt-1">{step.text}</span>
                </motion.div>
              ))}
            </div>

            {/* Copy link button */}
            <motion.button
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                navigator.clipboard.writeText("galachatpay.lovable.app");
                setModal({ type: "success", message: "تم نسخ الرابط ✅" });
                setTimeout(() => setModal(null), 1500);
              }}
              className="w-full flex items-center justify-center gap-2 bg-card border border-border rounded-xl py-3 text-xs font-bold text-foreground hover:bg-muted/30 transition-colors"
            >
              <Copy className="w-4 h-4 text-muted-foreground" />
              نسخ الرابط: galachatpay.lovable.app
            </motion.button>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.3 }}
              className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3"
            >
              <p className="text-[11px] text-emerald-400 font-bold leading-relaxed">
                {instructionModal === "supporter"
                  ? "💰 بعد القبول → نسبتك من شحنات الداعم تُحسب تلقائياً"
                  : "💰 بعد القبول → نسبتك من راتب الوكالة تُحسب تلقائياً"}
              </p>
            </motion.div>

            <motion.button
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.5 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setInstructionModal(null)}
              className="w-full bg-emerald-500 text-black py-3 rounded-xl font-bold text-sm"
            >
              فهمت 👍
            </motion.button>
          </div>
        </DialogContent>
      </Dialog>

      {modal && <StatusModal type={modal.type} message={modal.message} vibrate={modal.vibrate} onClose={() => setModal(null)} />}
      <BottomNav />
    </div>
  );
};

export default WorksPage;
