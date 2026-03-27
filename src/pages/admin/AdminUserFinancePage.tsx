import React, { useState } from "react";
import { useAdminSession } from "@/hooks/use-admin-session";
import AdminPageLayout from "@/components/AdminPageLayout";
import { Loader2, Search, TrendingUp, TrendingDown, Wallet, Gift, CreditCard, Calendar, User, AlertTriangle, Star, ArrowDown, ArrowUp } from "lucide-react";
import { galaApi } from "@/services/galaApi";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

interface ChargeItem {
  id: number;
  amount: number;
  usd: number;
  charger_type: string;
  created_at: string;
}

interface UserFinanceData {
  uuid: string;
  name: string;
  vipLevel: number;
  senderLevel: number;
  chargerLevel: number;
  totalCharged: number;
  charges: ChargeItem[];
  totalGiftsReceived: number;
  totalGiftsSent: number;
  currentBalance: number;
  profit: number;
  isWinner: boolean;
  monthLabel: string;
  salaryRequests: any[];
}

const AdminUserFinancePage: React.FC = () => {
  const { handleLogout } = useAdminSession();
  const [uuid, setUuid] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<UserFinanceData | null>(null);
  const [error, setError] = useState("");
  
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);

  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long' });
    return { val, label };
  });

  const search = async () => {
    if (!uuid.trim()) return;
    setLoading(true);
    setError("");
    setData(null);
    
    try {
      // Fetch all data in parallel using WORKING APIs
      const [totalRes, chargesRes, giftsRecRes, giftsSentRes, userFullRes, salaryRes] = await Promise.all([
        // Total charges (charges + coin_logs) — same number as production dashboard
        galaApi.userTotalCharges(uuid.trim(), selectedMonth).catch(() => null),
        galaApi.userMonthlyCharges(uuid.trim(), selectedMonth).catch(() => null),
        galaApi.giftReceivedTotal(uuid.trim(), selectedMonth).catch(() => null),
        galaApi.giftSentTotal(uuid.trim(), selectedMonth).catch(() => null),
        galaApi.userFull(uuid.trim()).catch(() => null),
        supabase.from("salary_requests")
          .select("*")
          .eq("uuid", uuid.trim())
          .gte("created_at", `${selectedMonth}-01`)
          .lt("created_at", `${selectedMonth}-32`)
          .order("created_at", { ascending: false }),
      ]);

      // Total charges from production dashboard (charges + coin_logs)
      const totalData = totalRes?.data || {};
      const totalCharged = totalData.total_charges || 0;
      const currentBalance = totalData.balance || 0;
      
      // Detailed charges from monthly API
      const chargesData = chargesRes?.data || {};
      const charges: ChargeItem[] = chargesData.charges || [];
      
      // Gifts
      const userInfo = userFullRes?.data || {};
      const totalGiftsReceived = giftsRecRes?.data?.total_received || userInfo.total_received || 0;
      const totalGiftsSent = giftsSentRes?.data?.total_sent || userInfo.total_sent || 0;
      
      const profit = totalGiftsReceived - totalCharged;
      const monthDate = new Date(selectedMonth + "-01");
      const monthLabel = monthDate.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long' });

      setData({
        uuid: uuid.trim(),
        name: userInfo.name || "—",
        vipLevel: userInfo.vip_level || 0,
        senderLevel: userInfo.sender_level || 0,
        chargerLevel: userInfo.charger_level || 0,
        totalCharged,
        charges,
        totalGiftsReceived,
        totalGiftsSent,
        currentBalance,
        profit,
        isWinner: profit >= 0,
        monthLabel,
        salaryRequests: salaryRes?.data || [],
      });
    } catch (e: any) {
      setError(e.message || "فشل جلب البيانات — تأكد من UUID");
    } finally {
      setLoading(false);
    }
  };

  const formatCoins = (n: number) => {
    if (Math.abs(n) >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(0)}K`;
    return n.toLocaleString();
  };

  const formatUsd = (coins: number) => `$${(coins / 7500).toFixed(2)}`;

  const glassCard = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 4px 16px -4px rgba(0,0,0,0.3)' };

  return (
    <AdminPageLayout title="بحث مالي للمستخدم" accentColor="hsl(262 83% 58%)" onLogout={handleLogout}>
      <div className="max-w-[448px] mx-auto p-4 space-y-4" dir="rtl">
        
        {/* Search */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-4 space-y-3" style={glassCard}>
          
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(168,85,247,0.15)' }}>
              <Search className="w-4 h-4 text-purple-400" />
            </div>
            <h3 className="text-sm font-bold text-foreground">بحث مالي بـ UUID</h3>
          </div>
          
          <input
            value={uuid}
            onChange={e => setUuid(e.target.value)}
            onKeyDown={e => e.key === "Enter" && search()}
            placeholder="أدخل UUID المستخدم..."
            className="w-full bg-background/50 border border-border/30 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-purple-500/40"
          />
          
          {/* Month selector */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3" /> اختر الشهر
            </label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {months.map(m => (
                <button key={m.val} onClick={() => setSelectedMonth(m.val)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors ${selectedMonth === m.val ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-muted/10 text-muted-foreground border border-border/20 hover:bg-muted/20'}`}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <button onClick={search} disabled={loading || !uuid.trim()}
            className="w-full py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-all"
            style={{ background: 'linear-gradient(135deg, #a855f7, #7c3aed)' }}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "🔍 بحث"}
          </button>
        </motion.div>

        {error && (
          <div className="rounded-xl p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs text-center">{error}</div>
        )}

        {/* Results */}
        <AnimatePresence>
          {data && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="space-y-3">
              
              {/* User Header */}
              <div className="rounded-2xl p-4" style={{
                background: 'linear-gradient(145deg, rgba(168,85,247,0.12), rgba(168,85,247,0.03))',
                border: '1px solid rgba(168,85,247,0.2)',
              }}>
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-purple-500/20">
                    <User className="w-5 h-5 text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-foreground">{data.name}</p>
                    <p className="text-[10px] text-muted-foreground">UUID: {data.uuid} • {data.monthLabel}</p>
                  </div>
                  {data.vipLevel > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold flex items-center gap-1">
                      <Star className="w-3 h-3" /> VIP {data.vipLevel}
                    </span>
                  )}
                </div>
              </div>

              {/* Profit/Loss Summary */}
              <div className="rounded-2xl p-4 text-center" style={{
                background: data.isWinner 
                  ? 'linear-gradient(145deg, rgba(34,197,94,0.12), rgba(34,197,94,0.03))'
                  : 'linear-gradient(145deg, rgba(239,68,68,0.12), rgba(239,68,68,0.03))',
                border: `1px solid ${data.isWinner ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
              }}>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold mb-2 ${data.isWinner ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                  {data.isWinner ? "✅ كاسب" : "❌ خاسر"}
                </span>
                <p className={`text-3xl font-black ${data.isWinner ? 'text-emerald-400' : 'text-red-400'}`}>
                  {data.profit >= 0 ? '+' : ''}{formatCoins(data.profit)}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {data.profit >= 0 ? '+' : ''}{formatUsd(data.profit)} • الدعم - الشحن
                </p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl p-3 space-y-1" style={glassCard}>
                  <div className="flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-[10px] text-muted-foreground">شحن الشهر</span>
                  </div>
                  <p className="text-lg font-black text-blue-400">{formatCoins(data.totalCharged)}</p>
                  <p className="text-[10px] text-muted-foreground">≈ {formatUsd(data.totalCharged)}</p>
                  <p className="text-[10px] text-muted-foreground">{data.charges.length} عملية</p>
                </div>

                <div className="rounded-xl p-3 space-y-1" style={glassCard}>
                  <div className="flex items-center gap-1.5">
                    <ArrowDown className="w-3.5 h-3.5 text-pink-400" />
                    <span className="text-[10px] text-muted-foreground">دعم مستلم</span>
                  </div>
                  <p className="text-lg font-black text-pink-400">{formatCoins(data.totalGiftsReceived)}</p>
                  <p className="text-[10px] text-muted-foreground">≈ {formatUsd(data.totalGiftsReceived)}</p>
                </div>

                <div className="rounded-xl p-3 space-y-1" style={glassCard}>
                  <div className="flex items-center gap-1.5">
                    <ArrowUp className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-[10px] text-muted-foreground">هدايا أرسلها</span>
                  </div>
                  <p className="text-lg font-black text-amber-400">{formatCoins(data.totalGiftsSent)}</p>
                  <p className="text-[10px] text-muted-foreground">≈ {formatUsd(data.totalGiftsSent)}</p>
                </div>

                <div className="rounded-xl p-3 space-y-1" style={{
                  ...glassCard,
                  background: 'linear-gradient(145deg, rgba(34,197,94,0.08), rgba(34,197,94,0.02))',
                  borderColor: 'rgba(34,197,94,0.15)',
                }}>
                  <div className="flex items-center gap-1.5">
                    <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[10px] text-muted-foreground">رصيد المحفظة</span>
                  </div>
                  <p className="text-lg font-black text-emerald-400">{formatCoins(data.currentBalance)}</p>
                  <p className="text-[10px] text-muted-foreground">≈ {formatUsd(data.currentBalance)}</p>
                </div>
              </div>

              {/* Charge History */}
              {data.charges.length > 0 && (
                <div className="rounded-2xl p-4 space-y-2" style={glassCard}>
                  <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
                    <CreditCard className="w-3.5 h-3.5 text-blue-400" /> سجل الشحن ({data.charges.length})
                  </h4>
                  <div className="max-h-52 overflow-y-auto space-y-1.5">
                    {data.charges.map((c, i) => (
                      <div key={c.id || i} className="flex items-center justify-between py-1.5 border-b border-border/10 last:border-0">
                        <div>
                          <p className="text-[10px] text-muted-foreground">{(c.charger_type || '—').replace('freight forwarder', 'وكيل شحن').replace('admin', 'أدمن').replace('google', 'جوجل').replace('apple', 'آبل')}</p>
                          <p className="text-[10px] text-muted-foreground">{new Date(c.created_at).toLocaleString('ar-SA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-bold text-blue-400">{formatCoins(c.amount)}</p>
                          <p className="text-[10px] text-muted-foreground">≈ {formatUsd(c.amount)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Salary Requests */}
              {data.salaryRequests.length > 0 && (
                <div className="rounded-2xl p-4 space-y-2" style={glassCard}>
                  <h4 className="text-xs font-bold text-foreground">💵 طلبات الراتب ({data.salaryRequests.length})</h4>
                  <div className="max-h-40 overflow-y-auto space-y-1.5">
                    {data.salaryRequests.map((r: any, i: number) => (
                      <div key={i} className="flex items-center justify-between py-1.5 border-b border-border/10 last:border-0">
                        <div>
                          <p className="text-[10px] text-foreground">{r.request_type || '—'}</p>
                          <p className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString('ar-SA')}</p>
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-bold text-foreground">${r.amount_usd || 0}</p>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${r.status === 'approved' ? 'bg-emerald-500/15 text-emerald-400' : r.status === 'rejected' ? 'bg-red-500/15 text-red-400' : 'bg-amber-500/15 text-amber-400'}`}>
                            {r.status === 'approved' ? 'مقبول' : r.status === 'rejected' ? 'مرفوض' : 'معلق'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AdminPageLayout>
  );
};

export default AdminUserFinancePage;
