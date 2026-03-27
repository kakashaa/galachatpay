import React, { useState } from "react";
import { useAdminSession } from "@/hooks/use-admin-session";
import AdminPageLayout from "@/components/AdminPageLayout";
import { Loader2, Search, TrendingUp, TrendingDown, Wallet, Gift, CreditCard, Calendar, User, AlertTriangle } from "lucide-react";
import { galaApi } from "@/services/galaApi";
import { motion, AnimatePresence } from "framer-motion";

interface UserFinanceData {
  uuid: string;
  charges: any[];
  gifts: any[];
  totalCharged: number;
  totalGiftsReceived: number;
  totalGiftsSent: number;
  currentBalance: number;
  profit: number;
  isWinner: boolean;
}

const AdminUserFinancePage: React.FC = () => {
  const { handleLogout } = useAdminSession();
  const [uuid, setUuid] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<UserFinanceData | null>(null);
  const [error, setError] = useState("");
  
  // Date range - default to current month
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const [dateFrom, setDateFrom] = useState(monthStart);
  const [dateTo, setDateTo] = useState(today);

  const search = async () => {
    if (!uuid.trim()) return;
    setLoading(true);
    setError("");
    setData(null);
    
    try {
      // Fetch all data in parallel
      const [chargesRes, giftsReceivedRes, giftsSentRes, balanceRes] = await Promise.all([
        galaApi.chargesByUuid(uuid.trim(), dateFrom, dateTo).catch(() => ({ data: [] })),
        galaApi.giftsReceived(uuid.trim(), dateFrom, dateTo).catch(() => ({ data: [] })),
        galaApi.giftsSent(uuid.trim(), dateFrom, dateTo).catch(() => ({ data: [] })),
        galaApi.userDiamonds(uuid.trim()).catch(() => ({ data: { diamonds: 0 } })),
      ]);

      const charges = Array.isArray(chargesRes?.data) ? chargesRes.data : [];
      const giftsReceived = Array.isArray(giftsReceivedRes?.data) ? giftsReceivedRes.data : [];
      const giftsSent = Array.isArray(giftsSentRes?.data) ? giftsSentRes.data : [];
      
      const totalCharged = charges.reduce((sum: number, c: any) => sum + (parseFloat(c.amount) || parseFloat(c.coins) || 0), 0);
      const totalGiftsReceived = giftsReceived.reduce((sum: number, g: any) => sum + (parseFloat(g.coins) || parseFloat(g.amount) || 0), 0);
      const totalGiftsSent = giftsSent.reduce((sum: number, g: any) => sum + (parseFloat(g.coins) || parseFloat(g.amount) || 0), 0);
      const currentBalance = parseFloat(balanceRes?.data?.diamonds) || parseFloat(balanceRes?.data?.coins) || 0;
      
      // Support = gifts received, charge = what they paid
      // If support received > charged = winner, otherwise loser
      const profit = totalGiftsReceived - totalCharged;

      setData({
        uuid: uuid.trim(),
        charges,
        gifts: giftsReceived,
        totalCharged,
        totalGiftsReceived,
        totalGiftsSent,
        currentBalance,
        profit,
        isWinner: profit >= 0,
      });
    } catch (e: any) {
      setError(e.message || "فشل جلب البيانات");
    } finally {
      setLoading(false);
    }
  };

  const formatCoins = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
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
            <h3 className="text-sm font-bold text-foreground">بحث بـ UUID</h3>
          </div>
          
          <input
            value={uuid}
            onChange={e => setUuid(e.target.value)}
            onKeyDown={e => e.key === "Enter" && search()}
            placeholder="أدخل UUID المستخدم..."
            className="w-full bg-background/50 border border-border/30 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-purple-500/40"
          />
          
          <div className="flex items-center gap-2">
            <div className="flex-1 space-y-1">
              <label className="text-[10px] text-muted-foreground">من</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="w-full bg-background/50 border border-border/30 rounded-lg px-2 py-1.5 text-xs text-foreground" />
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-[10px] text-muted-foreground">إلى</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="w-full bg-background/50 border border-border/30 rounded-lg px-2 py-1.5 text-xs text-foreground" />
            </div>
          </div>

          {/* Quick period buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { label: "اليوم", from: today, to: today },
              { label: "هذا الشهر", from: monthStart, to: today },
              { label: "آخر 7 أيام", from: (() => { const d = new Date(); d.setDate(d.getDate()-7); return d.toISOString().slice(0,10); })(), to: today },
              { label: "آخر 30 يوم", from: (() => { const d = new Date(); d.setDate(d.getDate()-30); return d.toISOString().slice(0,10); })(), to: today },
            ].map(p => (
              <button key={p.label} onClick={() => { setDateFrom(p.from); setDateTo(p.to); }}
                className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors ${dateFrom === p.from && dateTo === p.to ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-muted/10 text-muted-foreground border border-border/20 hover:bg-muted/20'}`}>
                {p.label}
              </button>
            ))}
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
              
              {/* User Summary Card */}
              <div className="rounded-2xl p-4 space-y-3" style={{
                background: data.isWinner 
                  ? 'linear-gradient(145deg, rgba(34,197,94,0.12), rgba(34,197,94,0.03))'
                  : 'linear-gradient(145deg, rgba(239,68,68,0.12), rgba(239,68,68,0.03))',
                border: `1px solid ${data.isWinner ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
              }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">UUID: {data.uuid}</span>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${data.isWinner ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                    {data.isWinner ? "✅ كاسب" : "❌ خاسر"}
                  </span>
                </div>
                
                <div className="text-center py-2">
                  <p className="text-[10px] text-muted-foreground mb-1">صافي الربح/الخسارة</p>
                  <p className={`text-2xl font-black ${data.isWinner ? 'text-emerald-400' : 'text-red-400'}`}>
                    {data.profit >= 0 ? '+' : ''}{formatCoins(data.profit)}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    ≈ {data.profit >= 0 ? '+' : ''}{formatUsd(data.profit)}
                  </p>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-2">
                {/* Total Charged */}
                <div className="rounded-xl p-3 space-y-1" style={glassCard}>
                  <div className="flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-[10px] text-muted-foreground">إجمالي الشحن</span>
                  </div>
                  <p className="text-lg font-black text-blue-400">{formatCoins(data.totalCharged)}</p>
                  <p className="text-[10px] text-muted-foreground">≈ {formatUsd(data.totalCharged)}</p>
                  <p className="text-[10px] text-muted-foreground">{data.charges.length} عملية</p>
                </div>

                {/* Total Support Received */}
                <div className="rounded-xl p-3 space-y-1" style={glassCard}>
                  <div className="flex items-center gap-1.5">
                    <Gift className="w-3.5 h-3.5 text-pink-400" />
                    <span className="text-[10px] text-muted-foreground">إجمالي الدعم</span>
                  </div>
                  <p className="text-lg font-black text-pink-400">{formatCoins(data.totalGiftsReceived)}</p>
                  <p className="text-[10px] text-muted-foreground">≈ {formatUsd(data.totalGiftsReceived)}</p>
                  <p className="text-[10px] text-muted-foreground">{data.gifts.length} هدية</p>
                </div>

                {/* Gifts Sent */}
                <div className="rounded-xl p-3 space-y-1" style={glassCard}>
                  <div className="flex items-center gap-1.5">
                    <TrendingDown className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-[10px] text-muted-foreground">هدايا أرسلها</span>
                  </div>
                  <p className="text-lg font-black text-amber-400">{formatCoins(data.totalGiftsSent)}</p>
                  <p className="text-[10px] text-muted-foreground">≈ {formatUsd(data.totalGiftsSent)}</p>
                </div>

                {/* Current Balance */}
                <div className="rounded-xl p-3 space-y-1" style={glassCard}>
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
                    <CreditCard className="w-3.5 h-3.5 text-blue-400" /> سجل الشحن
                  </h4>
                  <div className="max-h-48 overflow-y-auto space-y-1.5">
                    {data.charges.slice(0, 20).map((c: any, i: number) => (
                      <div key={i} className="flex items-center justify-between py-1.5 border-b border-border/10 last:border-0">
                        <div>
                          <p className="text-[10px] text-muted-foreground">{new Date(c.created_at || c.date).toLocaleDateString('ar-SA')}</p>
                          <p className="text-[10px] text-muted-foreground">{c.method || c.type || '-'}</p>
                        </div>
                        <p className="text-xs font-bold text-blue-400">{formatCoins(parseFloat(c.amount) || parseFloat(c.coins) || 0)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Gift History */}
              {data.gifts.length > 0 && (
                <div className="rounded-2xl p-4 space-y-2" style={glassCard}>
                  <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
                    <Gift className="w-3.5 h-3.5 text-pink-400" /> سجل الدعم المستلم
                  </h4>
                  <div className="max-h-48 overflow-y-auto space-y-1.5">
                    {data.gifts.slice(0, 20).map((g: any, i: number) => (
                      <div key={i} className="flex items-center justify-between py-1.5 border-b border-border/10 last:border-0">
                        <div>
                          <p className="text-[10px] text-foreground">{g.sender_name || g.from_uuid || 'مجهول'}</p>
                          <p className="text-[10px] text-muted-foreground">{new Date(g.created_at || g.date).toLocaleDateString('ar-SA')}</p>
                        </div>
                        <p className="text-xs font-bold text-pink-400">+{formatCoins(parseFloat(g.coins) || parseFloat(g.amount) || 0)}</p>
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
