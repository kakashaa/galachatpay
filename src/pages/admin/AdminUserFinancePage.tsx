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
  const [dateFrom, setDateFrom] = useState(now.toISOString().slice(0, 10));
  const [dateTo, setDateTo] = useState(now.toISOString().slice(0, 10));
  const [searchMode, setSearchMode] = useState<"month" | "date">("month");

  const months = Array.from({ length: 12 }, (_, i) => {
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
      // Direct call to wares-api (bypasses gala-proxy which may not have the action yet)
      const waresUrl = "https://hola-chat.com/wares-api.php";
      const waresKey = "ghala2026actions";
      
      // Build the finance API URL based on search mode
      const financeBase = "https://hola-chat.com/user-finance-api.php";
      const financeParams = searchMode === "date" && dateFrom
        ? `key=${waresKey}&uuid=${uuid.trim()}&from=${dateFrom}&to=${dateTo || dateFrom}`
        : `key=${waresKey}&uuid=${uuid.trim()}&month=${selectedMonth}`;
      
      const [financeRes, chargesRes, salaryRes] = await Promise.all([
        // Combined finance API (charges + gifts + balance in one call)
        fetch(`${financeBase}?${financeParams}`).then(r => r.json()).catch(() => null),
        // Monthly charges detail (for the charge list)
        fetch(`${waresUrl}?key=${waresKey}&action=user-monthly-charges&uuid=${uuid.trim()}&month=${searchMode === "date" && dateFrom ? dateFrom.slice(0,7) : selectedMonth}`).then(r => r.json()).catch(() => null),
        // (user info included in finance API)
        (supabase as any).from("salary_requests")
          .select("*")
          .eq("user_uuid", uuid.trim())
          .gte("created_at", `${selectedMonth}-01`)
          .lt("created_at", `${selectedMonth}-32`)
          .order("created_at", { ascending: false }),
      ]);

      // All data from combined finance API
      const fd = financeRes?.data || {};
      const totalCharged = fd.total_charges || 0;
      const totalGiftsSent = fd.total_gifts_sent || 0;
      const currentBalance = fd.balance || 0;
      const realLoss = fd.loss ?? (totalCharged - totalGiftsSent - currentBalance);
      const profit = -realLoss;
      
      // Detailed charges from monthly API
      const chargesData = chargesRes?.data || {};
      let charges: ChargeItem[] = chargesData.charges || [];
      
      // If date mode, filter charges by date range
      if (searchMode === "date" && dateFrom) {
        charges = charges.filter(c => {
          const cDate = c.created_at?.slice(0, 10) || "";
          return cDate >= dateFrom && cDate <= (dateTo || dateFrom);
        });
      }
      const monthDate = new Date(selectedMonth + "-01");
      const monthLabel = monthDate.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long' });

      setData({
        uuid: uuid.trim(),
        name: fd.name || "—",
        vipLevel: fd.vip || 0,
        senderLevel: fd.sender_level || 0,
        chargerLevel: fd.charger_level || 0,
        totalCharged,
        charges,
        totalGiftsReceived,
        totalGiftsSent,
        currentBalance,
        profit,
        isWinner: fd.is_winner ?? realLoss <= 0,
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

  const formatUsd = (coins: number) => `$${(coins / 8500).toFixed(2)}`;

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
          
          {/* Search mode toggle */}
          <div className="flex items-center gap-2">
            <button onClick={() => setSearchMode("month")}
              className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${searchMode === "month" ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-muted/10 text-muted-foreground border border-border/20'}`}>
              📅 بالشهر
            </button>
            <button onClick={() => setSearchMode("date")}
              className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${searchMode === "date" ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-muted/10 text-muted-foreground border border-border/20'}`}>
              📆 بالتاريخ
            </button>
          </div>

          {searchMode === "month" ? (
            <div className="space-y-1.5">
              <label className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" /> اختر الشهر
              </label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {months.slice(0, 6).map(m => (
                  <button key={m.val} onClick={() => setSelectedMonth(m.val)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors ${selectedMonth === m.val ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-muted/10 text-muted-foreground border border-border/20 hover:bg-muted/20'}`}>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground">من تاريخ</label>
                  <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                    className="w-full bg-background/50 border border-border/30 rounded-lg px-2 py-1.5 text-xs text-foreground" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground">إلى تاريخ</label>
                  <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                    className="w-full bg-background/50 border border-border/30 rounded-lg px-2 py-1.5 text-xs text-foreground" />
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {[
                  { label: "اليوم", from: now.toISOString().slice(0,10), to: now.toISOString().slice(0,10) },
                  { label: "أمس", from: (() => { const d = new Date(); d.setDate(d.getDate()-1); return d.toISOString().slice(0,10); })(), to: (() => { const d = new Date(); d.setDate(d.getDate()-1); return d.toISOString().slice(0,10); })() },
                  { label: "آخر 7 أيام", from: (() => { const d = new Date(); d.setDate(d.getDate()-7); return d.toISOString().slice(0,10); })(), to: now.toISOString().slice(0,10) },
                  { label: "هذا الأسبوع", from: (() => { const d = new Date(); d.setDate(d.getDate()-d.getDay()); return d.toISOString().slice(0,10); })(), to: now.toISOString().slice(0,10) },
                ].map(p => (
                  <button key={p.label} onClick={() => { setDateFrom(p.from); setDateTo(p.to); }}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors ${dateFrom === p.from && dateTo === p.to ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-muted/10 text-muted-foreground border border-border/20'}`}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

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
                  {data.profit >= 0 ? '+' : ''}{data.profit.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {data.profit >= 0 ? '+' : ''}{formatUsd(data.profit)}
                </p>
                <p className="text-[10px] text-muted-foreground">الشحن - الهدايا - الرصيد</p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl p-3 space-y-1" style={glassCard}>
                  <div className="flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-[10px] text-muted-foreground">شحن الشهر</span>
                  </div>
                  <p className="text-lg font-black text-blue-400">{data.totalCharged.toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground">≈ {formatUsd(data.totalCharged)}</p>
                  {data.charges.length > 0 && <p className="text-[10px] text-muted-foreground">{data.charges.length} عملية تفصيلية</p>}
                </div>

                <div className="rounded-xl p-3 space-y-1" style={glassCard}>
                  <div className="flex items-center gap-1.5">
                    <Gift className="w-3.5 h-3.5 text-pink-400" />
                    <span className="text-[10px] text-muted-foreground">هدايا أرسلها (دعم)</span>
                  </div>
                  <p className="text-lg font-black text-pink-400">{data.totalGiftsSent.toLocaleString()}</p>
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
                  <p className="text-lg font-black text-emerald-400">{data.currentBalance.toLocaleString()}</p>
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
                          <p className="text-xs font-bold text-blue-400">{c.amount.toLocaleString()}</p>
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
