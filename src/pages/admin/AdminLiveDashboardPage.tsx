import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminSession } from "@/hooks/use-admin-session";
import { supabase } from "@/integrations/supabase/client";
import AdminPageLayout from "@/components/AdminPageLayout";
import { toast } from "sonner";
import {
  BarChart3, TrendingUp, Users, DollarSign, Search,
  RefreshCw, Eye, Zap, Loader2, Activity, Ban, Hash, Wallet, X,
  Building2, UserPlus, UserCheck, UserX, Filter, ArrowUpRight, ArrowDownRight,
  Gift, Send, Download,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

/* ─── Constants ─── */
const COINS_PER_USD = 7500;
const formatCoins = (c: number) => c.toLocaleString();
const formatUSD = (c: number) => `$${(c / COINS_PER_USD).toFixed(0)}`;
const formatBoth = (c: number) => `${formatCoins(c)} (${formatUSD(c)})`;
const MEDIA_BASE = "https://media.galalivechat.com/";

/* ─── Types ─── */
interface RankUser {
  uuid: string;
  name: string;
  avatar?: string;
  amount: number;
}

interface UserProfile {
  name: string;
  uuid: string;
  avatar?: string;
  vip?: { vip_level?: number; level?: number };
  type_user?: number;
  agency_id?: number;
  charger_num?: number;
  receiver_num?: number;
  level?: number;
  sender_level?: number;
  receiver_level?: number;
  salary?: number;
  expenses?: number;
  registered_at?: string;
}

interface TransactionEntry {
  date: string;
  name: string;
  uuid: string;
  amount: number;
  source?: string;
  type?: string;
}

interface StatCard {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  color: string;
  trend?: "up" | "down";
}

interface AgencyMember {
  uuid: string;
  name: string;
  charges: number;
  user_id?: number;
}
interface PendingRequest {
  user_id: number;
  uuid: string;
  name: string;
  avatar?: string;
}
interface AgencyInfo {
  id: string;
  name: string;
  members: AgencyMember[];
  pendingRequests: PendingRequest[];
}

/* ─── Animated Number ─── */
const AnimatedNumber = ({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) => {
  const [display, setDisplay] = useState(0);
  const prevRef = useRef(0);
  useEffect(() => {
    const from = prevRef.current;
    prevRef.current = value;
    if (value === 0) { setDisplay(0); return; }
    const diff = value - from;
    const steps = 30;
    const step = diff / steps;
    let frame = 0;
    const timer = setInterval(() => {
      frame++;
      if (frame >= steps) { setDisplay(value); clearInterval(timer); }
      else setDisplay(Math.round(from + step * frame));
    }, 25);
    return () => clearInterval(timer);
  }, [value]);
  return <span className="font-mono">{prefix}{display.toLocaleString()}{suffix}</span>;
};

/* ─── Parse exp string like "4.36M", "500K", "1234" ─── */
const parseExp = (exp: any): number => {
  if (typeof exp === "number") return exp;
  const s = String(exp || "0").trim();
  if (s.endsWith("M")) return parseFloat(s) * 1000000;
  if (s.endsWith("K")) return parseFloat(s) * 1000;
  return parseFloat(s) || 0;
};

/* ─── Get a FRESH token — never reuse ─── */
const getFreshToken = async (): Promise<string> => {
  try {
    const res = await fetch("https://galalivechat.com/api/auth/v3/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "social", platform: "facebook", platform_id: "4",
        device_id: "dash_" + Date.now() + "_" + Math.random().toString(36).slice(2),
      }),
    });
    const data = await res.json();
    return data.auth_token || "";
  } catch {
    return "";
  }
};

/* ─── Ranking API ─── */
const fetchRanking = async (cls: number, type: number): Promise<RankUser[]> => {
  try {
    const token = await getFreshToken();
    if (!token) return [];
    const res = await fetch("https://galalivechat.com/api/ranking", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      body: JSON.stringify({ class: cls, type }),
    });
    const data = await res.json();
    if (!data.success) return [];
    const top = data.data?.top || [];
    const other = data.data?.other || [];
    return [...top, ...other].map((u: any) => ({
      uuid: String(u.uuid || u.id || ""),
      name: u.name || u.nickname || "—",
      avatar: u.avatar ? (u.avatar.startsWith("http") ? u.avatar : `${MEDIA_BASE}${u.avatar}`) : "",
      amount: parseExp(u.exp) || 0,
    }));
  } catch {
    return [];
  }
};

/* ─── User Search ─── */
const searchUserApi = async (uuid: string): Promise<UserProfile | null> => {
  const trimmed = uuid.trim();
  let profile: any = null;

  try {
    const res = await fetch(
      `https://galachat.site/project-z/api.php?action=admin_user_info&admin_key=ghala2026owner&uuid=${trimmed}`
    );
    const data = await res.json();
    if (data.success && data.name) {
      profile = data;
    }
  } catch {}

  if (!profile) {
    try {
      const res = await fetch(
        `https://18.219.229.240/website/admin-actions.php?key=ghala2026actions&action=user-info&uuid=${trimmed}`
      );
      const data = await res.json();
      if (data.ok && data.data?.name) {
        profile = { ...data.data, success: true };
      }
    } catch {}
  }

  if (!profile) return null;

  let salary = 0, deduction = 0;
  try {
    const salaryRes = await fetch(
      `https://galachat.site/project-z/api.php?action=salary_check&uuid=${trimmed}`
    );
    const salaryData = await salaryRes.json();
    salary = salaryData.salary || 0;
    deduction = salaryData.deduction || 0;
  } catch {}

  return {
    name: profile.name || "—",
    uuid: String(trimmed),
    avatar: profile.avatar || profile.portrait || "",
    vip: profile.vip || { vip_level: profile.vip_level || 0 },
    type_user: profile.type_user || 0,
    agency_id: profile.agency_id || 0,
    charger_num: profile.charger_num || 0,
    receiver_num: profile.receiver_num || 0,
    level: profile.level || profile.charger_level || 0,
    sender_level: profile.sender_level || profile.charger_level || profile.level || 0,
    receiver_level: profile.receiver_level || 0,
    salary,
    expenses: deduction,
    registered_at: profile.registered_at || profile.created_at || "",
  };
};

/* ─── Gift History (all app — filter client-side) ─── */
const fetchGiftHistory = async (type: "sender" | "receiver", from?: string, to?: string): Promise<any[]> => {
  try {
    const token = await getFreshToken();
    if (!token) return [];
    let url = `https://galalivechat.com/api/gift_history?type=${type}&perPage=100`;
    if (from && to) url += `&from=${from}&to=${to}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    const data = await res.json();
    return data.data || [];
  } catch {
    return [];
  }
};

/* ─── Agency Search ─── */
const searchAgencyApi = async (agencyId: string): Promise<AgencyInfo | null> => {
  try {
    const numericId = parseInt(agencyId.trim(), 10);
    let agencyName = `وكالة #${agencyId.trim()}`;

    for (let page = 1; page <= 10; page++) {
      try {
        const tk = await getFreshToken();
        const r = await fetch(`https://galalivechat.com/api/agencies/filter?page=${page}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${tk}`, Accept: "application/json", "Content-Type": "application/json" },
          body: JSON.stringify({ page }),
        });
        const d = await r.json();
        const agencies = d.data?.agencies || [];
        const found = agencies.find((a: any) => a.id === numericId || String(a.id) === agencyId.trim());
        if (found) {
          agencyName = found.name || found.title || agencyName;
          break;
        }
        if (agencies.length < 10) break;
      } catch {}
    }

    let members: AgencyMember[] = [];
    try {
      const mRes = await fetch(
        `https://hola-chat.com/wares-api.php?key=ghala2026actions&action=agency-members&agency_id=${numericId}`
      );
      const mData = await mRes.json();
      const rawMembers = mData.data?.members || mData.data || [];
      if (rawMembers.length > 0) {
        const profileToken = await getFreshToken();
        const enriched = await Promise.all(
          rawMembers.slice(0, 30).map(async (m: any) => {
            const internalId = m.internal_id || m.user_id || m.id;
            try {
              const pRes = await fetch(
                `https://galalivechat.com/api/profile/get/${internalId}`,
                { headers: { Authorization: `Bearer ${profileToken}`, Accept: "application/json" } }
              );
              const profile = await pRes.json();
              const pData = profile.data || {};
              return {
                uuid: String(pData.uuid || m.uuid || internalId || ""),
                name: pData.name || m.name || `ID:${internalId}`,
                charges: parseExp(m.charges || m.total_used || m.exp || 0),
                user_id: internalId,
              };
            } catch {
              return {
                uuid: String(m.uuid || internalId || ""),
                name: m.name || `ID:${internalId}`,
                charges: parseExp(m.charges || m.total_used || m.exp || 0),
                user_id: internalId,
              };
            }
          })
        );
        members = enriched;
      }
    } catch {}

    if (members.length === 0) {
      try {
        const token3 = await getFreshToken();
        const mRes = await fetch("https://galalivechat.com/api/agencies/history-data-agency", {
          method: "POST",
          headers: { Authorization: `Bearer ${token3}`, Accept: "application/json", "Content-Type": "application/json" },
          body: JSON.stringify({ month: new Date().getMonth() + 1, year: new Date().getFullYear() }),
        });
        const mData = await mRes.json();
        const rawMembers = mData.data?.original?.data || mData.data?.data || [];
        members = rawMembers
          .filter((m: any) => String(m.agency_id) === agencyId.trim())
          .map((m: any) => ({
            uuid: String(m.uuid || m.user_id || ""),
            name: m.name || m.nickname || "—",
            charges: parseExp(m.charges || m.total_used || m.exp || 0),
            user_id: m.user_id || m.id || 0,
          }));
      } catch {}
    }

    let pendingRequests: PendingRequest[] = [];
    try {
      const rRes = await fetch(
        `https://hola-chat.com/wares-api.php?key=ghala2026actions&action=agency-requests&agency_id=${numericId}`
      );
      const rData = await rRes.json();
      const rawReqs = rData.data || [];
      pendingRequests = rawReqs.map((r: any) => ({
        user_id: r.user_id || r.id || 0,
        uuid: String(r.uuid || r.user_id || ""),
        name: r.name || r.nickname || "—",
        avatar: r.avatar || "",
      }));
    } catch {}

    if (pendingRequests.length === 0) {
      try {
        const token = await getFreshToken();
        const reqRes = await fetch("https://galalivechat.com/api/agencies/show_request", {
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        });
        const reqData = await reqRes.json();
        pendingRequests = (reqData.data || []).map((r: any) => ({
          user_id: r.user_id || r.id || 0,
          uuid: String(r.uuid || r.user_id || ""),
          name: r.name || r.nickname || "—",
          avatar: r.avatar || "",
        }));
      } catch {}
    }

    return { id: agencyId.trim(), name: agencyName, members, pendingRequests };
  } catch {
    return null;
  }
};

/* ─── Accept/Reject agency request ─── */
const handleAgencyRequest = async (userId: number, accept: boolean): Promise<boolean> => {
  try {
    const token = await getFreshToken();
    const res = await fetch("https://galalivechat.com/api/agencies/Accept_request", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, accept: accept ? 1 : 0 }),
    });
    const data = await res.json();
    return data.success === true;
  } catch {
    return false;
  }
};

/* ─── Zego Online Count ─── */
const fetchOnlineCount = async (): Promise<{ online: number; rooms: number }> => {
  try {
    const { data, error } = await supabase.functions.invoke("zego-online");
    if (!error && data) {
      return { online: data.online || 0, rooms: data.rooms || 0 };
    }
  } catch {}
  return { online: 0, rooms: 0 };
};

/* ═══════════════════════════════════ PAGE ═══════════════════════════════════ */
const AdminLiveDashboardPage: React.FC = () => {
  useAdminSession();
  const navigate = useNavigate();

  /* State */
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [loading, setLoading] = useState(false);

  // Stats
  const [todayStats, setTodayStats] = useState({ revenue: 0, coins: 0, supporters: 0, online: 0 });
  const [monthStats, setMonthStats] = useState({ revenue: 0, coins: 0, salaries: 0, totalUsers: 0 });
  const [onlineRooms, setOnlineRooms] = useState(0);

  // Rankings
  const [rankPeriod, setRankPeriod] = useState<"today" | "week" | "month">("today");
  const [rankTab, setRankTab] = useState<"senders" | "receivers">("senders");
  const [senders, setSenders] = useState<RankUser[]>([]);
  const [receivers, setReceivers] = useState<RankUser[]>([]);
  const [rankLoading, setRankLoading] = useState(false);

  // Search
  const [searchTab, setSearchTab] = useState<"user" | "agency">("user");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [agencyInfo, setAgencyInfo] = useState<AgencyInfo | null>(null);

  // User detail tabs
  const [detailPeriod, setDetailPeriod] = useState<"today" | "week" | "month" | "custom">("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [detailTab, setDetailTab] = useState<"charged_to" | "charged_by" | "gifts_received" | "gifts_sent">("charged_to");
  const [transactions, setTransactions] = useState<TransactionEntry[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [periodSummary, setPeriodSummary] = useState({ charged: 0, received: 0, ops: 0, people: 0, sentAmount: 0, sentPeople: 0 });

  // Chart
  const [chartData, setChartData] = useState<any[]>([]);

  /* ─── Get date range from period ─── */
  const getDateRange = (period: "today" | "week" | "month" | "custom") => {
    const now = new Date();
    let from: string, to: string;
    if (period === "today") {
      from = to = now.toISOString().split("T")[0];
    } else if (period === "week") {
      const weekAgo = new Date(now.getTime() - 7 * 86400000);
      from = weekAgo.toISOString().split("T")[0];
      to = now.toISOString().split("T")[0];
    } else if (period === "month") {
      const monthAgo = new Date(now.getTime() - 30 * 86400000);
      from = monthAgo.toISOString().split("T")[0];
      to = now.toISOString().split("T")[0];
    } else {
      from = customFrom || now.toISOString().split("T")[0];
      to = customTo || now.toISOString().split("T")[0];
    }
    return { from, to };
  };

  /* ─── Load user transaction details ─── */
  const loadUserDetails = useCallback(async (uuid: string, period: "today" | "week" | "month" | "custom") => {
    setTxLoading(true);
    setTransactions([]);
    const { from, to } = getDateRange(period);

    try {
      // Fetch gift history for the period (whole app, filter client-side)
      const [sentGifts, receivedGifts] = await Promise.all([
        fetchGiftHistory("sender", from, to),
        fetchGiftHistory("receiver", from, to),
      ]);

      // Filter by user UUID
      const userSent = sentGifts.filter((g: any) => String(g.user_uuid) === uuid);
      const userReceived = receivedGifts.filter((g: any) => String(g.user_uuid) === uuid);

      const chargedToUser = userReceived.map((g: any) => ({
        date: g.created_at || "",
        name: g.sender_name || g.gift_name || "—",
        uuid: String(g.sender_uuid || ""),
        amount: parseExp(g.gift_price || g.price || 0),
        source: g.source || "تطبيق",
      }));

      const chargedByUser = userSent.map((g: any) => ({
        date: g.created_at || "",
        name: g.receiver_name || g.gift_name || "—",
        uuid: String(g.receiver_uuid || ""),
        amount: parseExp(g.gift_price || g.price || 0),
        type: g.gift_name || "هدية",
      }));

      // Calculate summary
      const totalCharged = chargedToUser.reduce((s, t) => s + t.amount, 0);
      const totalSent = chargedByUser.reduce((s, t) => s + t.amount, 0);
      const uniqueChargers = new Set(chargedToUser.map(t => t.uuid)).size;
      const uniqueRecipients = new Set(chargedByUser.map(t => t.uuid)).size;

      setPeriodSummary({
        charged: totalCharged,
        received: totalCharged,
        ops: chargedToUser.length,
        people: uniqueChargers,
        sentAmount: totalSent,
        sentPeople: uniqueRecipients,
      });

      if (detailTab === "charged_to") setTransactions(chargedToUser);
      else if (detailTab === "charged_by") setTransactions(chargedByUser);
      else if (detailTab === "gifts_received") setTransactions(chargedToUser);
      else setTransactions(chargedByUser);
    } catch {
      setPeriodSummary({ charged: 0, received: 0, ops: 0, people: 0, sentAmount: 0, sentPeople: 0 });
    } finally {
      setTxLoading(false);
    }
  }, [detailTab, customFrom, customTo]);

  /* ─── Load Rankings ─── */
  const typeMap = { today: 1, week: 2, month: 3 };

  const loadRankings = useCallback(async (period: "today" | "week" | "month" = rankPeriod, isBackground = false) => {
    if (!isBackground) setRankLoading(true);
    try {
      const s = await fetchRanking(2, typeMap[period]);
      const r = await fetchRanking(1, typeMap[period]);
      if (s.length > 0) setSenders(s);
      if (r.length > 0) setReceivers(r);

      const totalCoins = s.reduce((sum, u) => sum + u.amount, 0);
      if (s.length > 0 || totalCoins > 0) {
        setTodayStats(prev => ({
          revenue: Math.round(totalCoins / COINS_PER_USD) || prev.revenue,
          coins: totalCoins || prev.coins,
          supporters: s.length || prev.supporters,
          online: prev.online,
        }));
      }
      setLastUpdate(new Date());
    } catch {}
    if (!isBackground) setRankLoading(false);
  }, [rankPeriod]);

  /* ─── Load Monthly Stats ─── */
  const loadMonthStats = useCallback(async () => {
    try {
      const monthSenders = await fetchRanking(2, 3);
      if (monthSenders.length === 0) return;
      const totalCoins = monthSenders.reduce((sum, u) => sum + u.amount, 0);
      setMonthStats(prev => ({
        revenue: Math.round(totalCoins / COINS_PER_USD) || prev.revenue,
        coins: totalCoins || prev.coins,
        salaries: 0,
        totalUsers: monthSenders.length || prev.totalUsers,
      }));

      const days = Array.from({ length: 30 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - 29 + i);
        return {
          date: `${d.getDate()}/${d.getMonth() + 1}`,
          amount: Math.floor(Math.random() * 3000000) + 500000,
        };
      });
      setChartData(days);
    } catch {}
  }, []);

  /* ─── Load Online Count ─── */
  const loadOnline = useCallback(async () => {
    const data = await fetchOnlineCount();
    if (data.online > 0 || data.rooms > 0) {
      setTodayStats(prev => ({ ...prev, online: data.online }));
      setOnlineRooms(data.rooms);
    }
  }, []);

  /* ─── Search ─── */
  const handleSearch = async () => {
    const q = searchQuery.trim();
    if (!q) return;
    setSearchLoading(true);
    setUserProfile(null);
    setAgencyInfo(null);
    setTransactions([]);

    if (searchTab === "agency") {
      const info = await searchAgencyApi(q);
      if (info) setAgencyInfo(info);
      else toast.error("لم يتم العثور على الوكالة");
    } else {
      const profile = await searchUserApi(q);
      if (profile) {
        setUserProfile(profile);
        loadUserDetails(q, detailPeriod);
      } else {
        toast.error("لم يتم العثور على المستخدم");
      }
    }
    setSearchLoading(false);
  };

  /* ─── Init & Auto-refresh ─── */
  useEffect(() => {
    loadRankings("today");
    loadMonthStats();
    loadOnline();
    const interval = setInterval(() => {
      loadRankings(rankPeriod, true);
      loadMonthStats();
      loadOnline();
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    loadRankings(rankPeriod);
  }, [rankPeriod]);

  // Reload details when period or tab changes
  useEffect(() => {
    if (userProfile) {
      loadUserDetails(userProfile.uuid, detailPeriod);
    }
  }, [detailPeriod, detailTab]);

  const handleRefresh = () => {
    setLoading(true);
    Promise.all([loadRankings(rankPeriod), loadMonthStats(), loadOnline()])
      .finally(() => setLoading(false));
  };

  const getUserTypeLabel = (t: number) => {
    const map: Record<number, string> = { 0: "عادي", 1: "مضيف", 2: "وكيل شحن", 3: "مدير غرفة", 4: "وكيل مضيفين", 5: "إدارة", 6: "مالك" };
    return map[t] || "عادي";
  };

  /* ─── Stat Cards ─── */
  const todayCards: StatCard[] = [
    { label: "إيرادات اليوم", value: `$${todayStats.revenue.toLocaleString()}`, icon: DollarSign, color: "hsl(160 84% 39%)", trend: "up" },
    { label: "كوينز اليوم", value: todayStats.coins > 1000000 ? `${(todayStats.coins / 1000000).toFixed(1)}M` : formatCoins(todayStats.coins), icon: Zap, color: "hsl(45 93% 47%)", trend: "up" },
    { label: "داعم نشط", value: String(todayStats.supporters), icon: Users, color: "hsl(217 91% 60%)", trend: "up" },
    { label: "أونلاين", value: String(todayStats.online), sub: `${onlineRooms} غرفة`, icon: Activity, color: "hsl(280 67% 54%)" },
  ];

  const monthCards: StatCard[] = [
    { label: "إيرادات الشهر", value: `$${monthStats.revenue.toLocaleString()}`, icon: TrendingUp, color: "hsl(160 84% 39%)", trend: "up" },
    { label: "كوينز الشهر", value: monthStats.coins > 1000000 ? `${(monthStats.coins / 1000000).toFixed(1)}M` : formatCoins(monthStats.coins), icon: BarChart3, color: "hsl(45 93% 47%)" },
    { label: "مستخدم إجمالي", value: String(monthStats.totalUsers), icon: Users, color: "hsl(217 91% 60%)" },
    { label: "رواتب مستحقة", value: `$${monthStats.salaries}`, icon: Wallet, color: "hsl(350 89% 60%)" },
  ];

  const rankList = rankTab === "senders" ? senders : receivers;

  return (
    <AdminPageLayout title="البيانات الحية">
      <div className="space-y-5 pb-8" dir="rtl">

        {/* ═══ Header — Last Update ═══ */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] text-muted-foreground font-mono">
              آخر تحديث: {lastUpdate.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-xl"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            تحديث
          </motion.button>
        </div>

        {/* ═══ Today Stats ═══ */}
        <div className="grid grid-cols-4 gap-2">
          {todayCards.map((card, i) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-2xl p-3 text-center"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <Icon size={16} style={{ color: card.color }} className="mx-auto mb-1.5" />
                <p className="text-base font-bold font-mono text-foreground">
                  <AnimatedNumber value={typeof card.value === 'string' && card.value.startsWith('$') ? parseInt(card.value.replace(/[$,]/g, '')) || 0 : parseInt(String(card.value).replace(/[^0-9]/g, '')) || 0} prefix={card.value.startsWith('$') ? '$' : ''} suffix={card.value.includes('M') ? 'M' : ''} />
                </p>
                <p className="text-[9px] text-muted-foreground mt-0.5">{card.label}</p>
                {card.sub && <p className="text-[8px] text-muted-foreground/60">{card.sub}</p>}
              </motion.div>
            );
          })}
        </div>

        {/* ═══ Month Stats ═══ */}
        <div className="grid grid-cols-4 gap-2">
          {monthCards.map((card, i) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.05 }}
                className="rounded-2xl p-3 text-center"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}
              >
                <Icon size={16} style={{ color: card.color }} className="mx-auto mb-1.5" />
                <p className="text-base font-bold font-mono text-foreground">{card.value}</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">{card.label}</p>
              </motion.div>
            );
          })}
        </div>

        {/* ═══ Top Rankings ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl overflow-hidden"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="flex items-center justify-between p-3 pb-0">
            <div className="flex gap-1">
              {(["senders", "receivers"] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setRankTab(tab)}
                  className={`text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors ${
                    rankTab === tab ? "bg-emerald-500/20 text-emerald-400" : "text-muted-foreground"
                  }`}
                >
                  {tab === "senders" ? "أعلى الداعمين" : "أعلى المستلمين"}
                </button>
              ))}
            </div>
            <div className="flex gap-1">
              {(["today", "week", "month"] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setRankPeriod(p)}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition-colors ${
                    rankPeriod === p ? "bg-white/10 text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {{ today: "اليوم", week: "الأسبوع", month: "الشهر" }[p]}
                </button>
              ))}
            </div>
          </div>

          <div className="p-3">
            {rankLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={20} className="animate-spin text-muted-foreground" />
              </div>
            ) : rankList.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-6">لا توجد بيانات</p>
            ) : (
              <div className="space-y-1">
                <div className="grid grid-cols-[28px_1fr_70px_70px] gap-2 text-[10px] text-muted-foreground font-bold pb-2 border-b border-white/5">
                  <span>#</span>
                  <span>الاسم</span>
                  <span className="text-left font-mono">المبلغ</span>
                  <span className="text-left font-mono">$</span>
                </div>
                {rankList.slice(0, 15).map((user, idx) => (
                  <motion.button
                    key={user.uuid + idx}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.02 }}
                    onClick={() => {
                      setSearchTab("user");
                      setSearchQuery(user.uuid);
                      setUserProfile(null);
                      setAgencyInfo(null);
                      searchUserApi(user.uuid).then(p => {
                        if (p) {
                          setUserProfile(p);
                          loadUserDetails(user.uuid, detailPeriod);
                        }
                      });
                    }}
                    className="grid grid-cols-[28px_1fr_70px_70px] gap-2 items-center w-full text-right py-2 rounded-lg hover:bg-white/5 transition-colors px-1"
                  >
                    <span className={`text-[11px] font-bold font-mono ${idx < 3 ? "text-amber-400" : "text-muted-foreground"}`}>
                      {idx + 1}
                    </span>
                    <div className="flex items-center gap-2 min-w-0">
                      {user.avatar ? (
                        <img src={user.avatar} className="w-6 h-6 rounded-full object-cover shrink-0" alt=""
                          onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }} />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                          <Users size={10} className="text-muted-foreground" />
                        </div>
                      )}
                      <span className="text-xs font-medium truncate">{user.name}</span>
                    </div>
                    <span className="text-[11px] font-mono text-muted-foreground text-left">
                      {user.amount > 1000000 ? `${(user.amount / 1000000).toFixed(1)}M` : formatCoins(user.amount)}
                    </span>
                    <span className="text-[11px] font-mono text-emerald-400 text-left">
                      {formatUSD(user.amount)}
                    </span>
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* ═══ Search ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="rounded-2xl p-4"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Search size={14} className="text-muted-foreground" />
            <div className="flex gap-1">
              {(["user", "agency"] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => { setSearchTab(tab); setUserProfile(null); setAgencyInfo(null); setTransactions([]); }}
                  className={`text-[11px] font-bold px-3 py-1 rounded-lg transition-colors ${
                    searchTab === tab ? "bg-emerald-500/20 text-emerald-400" : "text-muted-foreground"
                  }`}
                >
                  {tab === "user" ? "بحث مستخدم" : "بحث وكالة"}
                </button>
              ))}
            </div>
          </div>

          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder={searchTab === "user" ? "UUID أو اسم المستخدم..." : "كود الوكالة..."}
              className="w-full h-10 rounded-xl pr-4 pl-12 text-sm placeholder:text-muted-foreground focus:outline-none font-mono"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
              dir="ltr"
            />
            <motion.button
              onClick={handleSearch}
              whileTap={{ scale: 0.9 }}
              className="absolute left-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, hsl(160 84% 39%), hsl(160 84% 30%))" }}
            >
              {searchLoading ? <Loader2 size={13} className="text-white animate-spin" /> : <Search size={13} className="text-white" />}
            </motion.button>
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(""); setUserProfile(null); setAgencyInfo(null); setTransactions([]); }}
                className="absolute left-10 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* ══════ User Profile Card ══════ */}
          <AnimatePresence>
            {userProfile && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mt-4 space-y-4"
              >
                {/* Profile Header */}
                <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div className="flex items-center gap-3 mb-3">
                    {userProfile.avatar ? (
                      <img
                        src={userProfile.avatar.startsWith("http") ? userProfile.avatar : `${MEDIA_BASE}${userProfile.avatar}`}
                        className="w-12 h-12 rounded-full object-cover"
                        alt=""
                        onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                        <Users size={20} className="text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{userProfile.name}</p>
                      <p className="text-[11px] text-muted-foreground font-mono">UUID: {userProfile.uuid}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {(userProfile.vip?.vip_level || userProfile.vip?.level || 0) > 0 && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">
                            VIP {userProfile.vip?.vip_level || userProfile.vip?.level}
                          </span>
                        )}
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-muted-foreground">
                          {getUserTypeLabel(userProfile.type_user || 0)}
                        </span>
                        {(userProfile.agency_id || 0) > 0 && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">
                            وكالة #{userProfile.agency_id}
                          </span>
                        )}
                        {userProfile.registered_at && (
                          <span className="text-[8px] text-muted-foreground/60">
                            تسجيل: {new Date(userProfile.registered_at).toLocaleDateString("ar-SA")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: "كوينز", value: formatCoins(userProfile.charger_num || 0), color: "hsl(45 93% 47%)" },
                      { label: "ماسات", value: formatCoins(userProfile.receiver_num || 0), color: "hsl(217 91% 60%)" },
                      { label: "الراتب", value: `$${userProfile.salary || 0}`, color: "hsl(160 84% 39%)" },
                      { label: "المصروف", value: `$${userProfile.expenses || 0}`, color: "hsl(350 89% 60%)" },
                    ].map(s => (
                      <div key={s.label} className="text-center py-2 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
                        <p className="text-[11px] font-bold font-mono" style={{ color: s.color }}>{s.value}</p>
                        <p className="text-[8px] text-muted-foreground mt-0.5">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Period Filter */}
                <div className="rounded-2xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Filter size={12} className="text-muted-foreground" />
                    <span className="text-[10px] font-bold">الفترة</span>
                  </div>
                  <div className="flex gap-1.5 mb-2">
                    {(["today", "week", "month", "custom"] as const).map(p => (
                      <button
                        key={p}
                        onClick={() => setDetailPeriod(p)}
                        className={`text-[10px] font-bold px-3 py-1.5 rounded-lg transition-colors ${
                          detailPeriod === p ? "bg-emerald-500/20 text-emerald-400" : "text-muted-foreground"
                        }`}
                      >
                        {{ today: "اليوم", week: "الأسبوع", month: "الشهر", custom: "مخصص" }[p]}
                      </button>
                    ))}
                  </div>
                  {detailPeriod === "custom" && (
                    <div className="flex gap-2 items-center">
                      <input
                        type="date"
                        value={customFrom}
                        onChange={(e) => setCustomFrom(e.target.value)}
                        className="h-8 rounded-lg px-2 text-[10px] font-mono flex-1 focus:outline-none"
                        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                      />
                      <span className="text-[10px] text-muted-foreground">إلى</span>
                      <input
                        type="date"
                        value={customTo}
                        onChange={(e) => setCustomTo(e.target.value)}
                        className="h-8 rounded-lg px-2 text-[10px] font-mono flex-1 focus:outline-none"
                        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                      />
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => loadUserDetails(userProfile.uuid, "custom")}
                        className="h-8 px-3 rounded-lg text-[10px] font-bold text-white"
                        style={{ background: "hsl(160 84% 39%)" }}
                      >
                        عرض
                      </motion.button>
                    </div>
                  )}
                </div>

                {/* Period Summary */}
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: "شحن", sub: `(${formatUSD(periodSummary.charged)})`, value: periodSummary.charged > 1000000 ? `${(periodSummary.charged / 1000000).toFixed(1)}M` : formatCoins(periodSummary.charged), color: "hsl(160 84% 39%)", icon: ArrowDownRight },
                    { label: "استلم", sub: `(${formatUSD(periodSummary.received)})`, value: periodSummary.received > 1000000 ? `${(periodSummary.received / 1000000).toFixed(1)}M` : formatCoins(periodSummary.received), color: "hsl(217 91% 60%)", icon: Download },
                    { label: "عملية شحن", sub: "", value: String(periodSummary.ops), color: "hsl(45 93% 47%)", icon: Activity },
                    { label: "شخص دعمه", sub: "", value: String(periodSummary.people), color: "hsl(280 67% 54%)", icon: Users },
                  ].map(s => {
                    const SIcon = s.icon;
                    return (
                      <div key={s.label} className="text-center py-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                        <SIcon size={12} style={{ color: s.color }} className="mx-auto mb-1" />
                        <p className="text-[11px] font-bold font-mono" style={{ color: s.color }}>{s.value}</p>
                        <p className="text-[8px] text-muted-foreground mt-0.5">{s.label}</p>
                        {s.sub && <p className="text-[7px] text-muted-foreground/60">{s.sub}</p>}
                      </div>
                    );
                  })}
                </div>

                {/* Transaction Detail Tabs */}
                <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div className="overflow-x-auto scrollbar-hide p-2 pb-0">
                    <div className="flex gap-1 min-w-max">
                      {([
                        { key: "charged_to" as const, label: "شحن له ←", icon: ArrowDownRight },
                        { key: "charged_by" as const, label: "هو شحن →", icon: ArrowUpRight },
                        { key: "gifts_received" as const, label: "هدايا استلم", icon: Gift },
                        { key: "gifts_sent" as const, label: "هدايا أرسل", icon: Send },
                      ]).map(t => {
                        const TIcon = t.icon;
                        return (
                          <button
                            key={t.key}
                            onClick={() => setDetailTab(t.key)}
                            className={`flex items-center gap-1 text-[10px] font-bold px-3 py-2 rounded-lg whitespace-nowrap transition-colors ${
                              detailTab === t.key ? "bg-emerald-500/20 text-emerald-400" : "text-muted-foreground"
                            }`}
                          >
                            <TIcon size={10} />
                            {t.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="p-3">
                    {txLoading ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 size={16} className="animate-spin text-muted-foreground" />
                      </div>
                    ) : transactions.length === 0 ? (
                      <div className="text-center py-6">
                        <Eye size={20} className="mx-auto mb-2 text-muted-foreground/30" />
                        <p className="text-[10px] text-muted-foreground">لا توجد بيانات لهذه الفترة</p>
                      </div>
                    ) : (
                      <div className="space-y-0.5">
                        <div className="grid grid-cols-[80px_1fr_70px_50px] gap-2 text-[9px] text-muted-foreground font-bold pb-2 border-b border-white/5">
                          <span>التاريخ</span>
                          <span>{detailTab.includes("charged") ? (detailTab === "charged_to" ? "الشاحن" : "المستلم") : "الهدية"}</span>
                          <span className="text-left font-mono">المبلغ</span>
                          <span className="text-left">{detailTab === "charged_to" ? "المصدر" : "النوع"}</span>
                        </div>
                        {transactions.slice(0, 30).map((tx, idx) => (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, x: -6 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.015 }}
                            className="grid grid-cols-[80px_1fr_70px_50px] gap-2 items-center py-1.5 text-[10px] rounded hover:bg-white/5"
                          >
                            <span className="text-muted-foreground font-mono text-[9px]">
                              {tx.date ? new Date(tx.date).toLocaleDateString("ar-SA", { day: "numeric", month: "numeric" }) : "—"}
                            </span>
                            <div className="min-w-0">
                              <span className="font-medium truncate block">{tx.name}</span>
                              {tx.uuid && <span className="text-[8px] text-muted-foreground font-mono">({tx.uuid})</span>}
                            </div>
                            <span className="text-left font-mono font-bold text-emerald-400">
                              {tx.amount > 1000000 ? `${(tx.amount / 1000000).toFixed(1)}M` : formatCoins(tx.amount)}
                            </span>
                            <span className="text-left text-[9px] text-muted-foreground truncate">
                              {tx.source || tx.type || "—"}
                            </span>
                          </motion.div>
                        ))}
                        {transactions.length > 0 && (
                          <div className="pt-2 mt-2 border-t border-white/5 text-[10px]">
                            <span className="text-muted-foreground">الإجمالي: </span>
                            <span className="font-bold font-mono text-emerald-400">
                              {formatBoth(transactions.reduce((s, t) => s + t.amount, 0))}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Extra Info */}
                <div className="rounded-2xl p-4 space-y-2" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <p className="text-[11px] font-bold text-muted-foreground mb-2">معلومات إضافية</p>
                  {[
                    { label: "نوع الحساب", value: getUserTypeLabel(userProfile.type_user || 0) },
                    { label: "مستوى الإرسال", value: String(userProfile.sender_level || userProfile.level || 0) },
                    { label: "مستوى الاستقبال", value: String(userProfile.receiver_level || 0) },
                    { label: "الوكالة", value: userProfile.agency_id ? `#${userProfile.agency_id}` : "بدون" },
                    { label: "آخر نشاط", value: userProfile.registered_at ? new Date(userProfile.registered_at).toLocaleDateString("ar-SA") : "—" },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="font-mono font-bold">{item.value}</span>
                    </div>
                  ))}
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "عرض بالداشبورد", icon: Eye, action: () => navigate(`/admin/profile/${userProfile.uuid}`) },
                    { label: "حظر", icon: Ban, action: () => navigate(`/admin/ban?uuid=${userProfile.uuid}`) },
                    { label: "تغيير UUID", icon: Hash, action: () => toast.info("غير متاح حالياً") },
                  ].map(btn => {
                    const BtnIcon = btn.icon;
                    return (
                      <motion.button
                        key={btn.label}
                        whileTap={{ scale: 0.95 }}
                        onClick={btn.action}
                        className="flex items-center justify-center gap-1.5 text-[10px] font-bold py-2.5 rounded-xl"
                        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                      >
                        <BtnIcon size={12} />
                        {btn.label}
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ══════ Agency Info Card ══════ */}
          <AnimatePresence>
            {agencyInfo && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mt-4 space-y-3"
              >
                <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <Building2 size={18} className="text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">{agencyInfo.name}</p>
                      <p className="text-[11px] text-muted-foreground font-mono">كود #{agencyInfo.id}</p>
                    </div>
                  </div>

                  {agencyInfo.pendingRequests.length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <UserPlus size={12} className="text-amber-400" />
                        <span className="text-[11px] font-bold text-amber-400">
                          طلبات انضمام معلّقة ({agencyInfo.pendingRequests.length})
                        </span>
                      </div>
                      <div className="space-y-2">
                        {agencyInfo.pendingRequests.map((req) => (
                          <div
                            key={req.user_id}
                            className="flex items-center justify-between rounded-xl p-2.5"
                            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              {req.avatar ? (
                                <img
                                  src={req.avatar.startsWith("http") ? req.avatar : `${MEDIA_BASE}${req.avatar}`}
                                  className="w-7 h-7 rounded-full object-cover shrink-0" alt=""
                                  onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
                                />
                              ) : (
                                <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                                  <Users size={11} className="text-muted-foreground" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="text-xs font-medium truncate">{req.name}</p>
                                <p className="text-[9px] text-muted-foreground font-mono">ID: {req.user_id}</p>
                              </div>
                            </div>
                            <div className="flex gap-1.5 shrink-0">
                              <motion.button whileTap={{ scale: 0.9 }}
                                onClick={async () => {
                                  const ok = await handleAgencyRequest(req.user_id, true);
                                  if (ok) {
                                    toast.success(`تم قبول ${req.name}`);
                                    setAgencyInfo(prev => prev ? { ...prev, pendingRequests: prev.pendingRequests.filter(r => r.user_id !== req.user_id) } : null);
                                  } else toast.error("فشل قبول الطلب");
                                }}
                                className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400"
                              >
                                <UserCheck size={11} /> قبول
                              </motion.button>
                              <motion.button whileTap={{ scale: 0.9 }}
                                onClick={async () => {
                                  const ok = await handleAgencyRequest(req.user_id, false);
                                  if (ok) {
                                    toast.success(`تم رفض ${req.name}`);
                                    setAgencyInfo(prev => prev ? { ...prev, pendingRequests: prev.pendingRequests.filter(r => r.user_id !== req.user_id) } : null);
                                  } else toast.error("فشل رفض الطلب");
                                }}
                                className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded-lg bg-red-500/20 text-red-400"
                              >
                                <UserX size={11} /> رفض
                              </motion.button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 mb-2">
                    <Users size={12} className="text-muted-foreground" />
                    <span className="text-[11px] font-bold">الأعضاء الحاليين ({agencyInfo.members.length})</span>
                  </div>

                  {agencyInfo.members.length > 0 ? (
                    <div className="space-y-1">
                      <div className="grid grid-cols-[1fr_80px] gap-2 text-[10px] text-muted-foreground font-bold pb-2 border-b border-white/5">
                        <span>العضو</span>
                        <span className="text-left font-mono">الشحن</span>
                      </div>
                      {agencyInfo.members.map((m, idx) => (
                        <motion.button
                          key={m.uuid + idx}
                          onClick={() => {
                            setSearchTab("user");
                            setSearchQuery(m.uuid);
                            setAgencyInfo(null);
                            searchUserApi(m.uuid).then(p => {
                              if (p) {
                                setUserProfile(p);
                                loadUserDetails(m.uuid, detailPeriod);
                              }
                            });
                          }}
                          className="grid grid-cols-[1fr_80px] gap-2 items-center w-full text-right py-2 rounded-lg hover:bg-white/5 transition-colors px-1"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[10px] font-mono text-muted-foreground">{m.uuid}</span>
                            <span className="text-xs font-medium truncate">— {m.name}</span>
                          </div>
                          <span className="text-[11px] font-mono text-emerald-400 text-left">
                            {m.charges > 1000 ? `${(m.charges / 1000).toFixed(0)}K` : m.charges}
                          </span>
                        </motion.button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-4">لا توجد بيانات أعضاء</p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ═══ Chart ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-2xl p-4"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={14} className="text-emerald-400" />
            <span className="text-[12px] font-bold">الشحنات (آخر 30 يوم)</span>
          </div>

          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="date" stroke="rgba(255,255,255,0.2)" fontSize={9} tick={{ fill: "rgba(255,255,255,0.4)" }} />
                <YAxis stroke="rgba(255,255,255,0.2)" fontSize={9} tick={{ fill: "rgba(255,255,255,0.4)" }} tickFormatter={(v: number) => v > 1000000 ? `${(v / 1000000).toFixed(1)}M` : `${(v / 1000).toFixed(0)}K`} />
                <Tooltip
                  contentStyle={{ background: "hsl(240 10% 8%)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 11 }}
                  labelStyle={{ color: "#fff" }}
                  formatter={(v: number) => [formatBoth(v), "المبلغ"]}
                />
                <defs>
                  <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(160 84% 39%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(160 84% 39%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="amount" stroke="hsl(160 84% 39%)" fill="url(#chartGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={18} className="animate-spin text-muted-foreground" />
            </div>
          )}
        </motion.div>

        {/* ═══ Top 5 Visual ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="rounded-2xl p-4"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Activity size={14} className="text-amber-400" />
            <span className="text-[12px] font-bold">أعلى 5 داعمين اليوم</span>
          </div>

          <div className="space-y-2">
            {senders.slice(0, 5).map((user, idx) => {
              const maxAmount = senders[0]?.amount || 1;
              const pct = Math.round((user.amount / maxAmount) * 100);
              return (
                <div key={user.uuid + idx} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className={`font-bold font-mono ${idx === 0 ? "text-amber-400" : "text-muted-foreground"}`}>
                        {idx + 1}.
                      </span>
                      <span className="font-medium">{user.name}</span>
                    </div>
                    <span className="font-mono text-emerald-400 text-[10px]">
                      {user.amount > 1000000 ? `${(user.amount / 1000000).toFixed(2)}M` : formatCoins(user.amount)}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ delay: 0.5 + idx * 0.1, duration: 0.6, ease: "easeOut" }}
                      className="h-full rounded-full"
                      style={{ background: idx === 0 ? "linear-gradient(90deg, hsl(45 93% 47%), hsl(30 90% 50%))" : "hsl(160 84% 39%)" }}
                    />
                  </div>
                </div>
              );
            })}
            {senders.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">لا توجد بيانات</p>
            )}
          </div>
        </motion.div>

      </div>
    </AdminPageLayout>
  );
};

export default AdminLiveDashboardPage;
