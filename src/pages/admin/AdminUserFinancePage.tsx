import React, { useState } from "react";
import { useAdminSession } from "@/hooks/use-admin-session";
import AdminPageLayout from "@/components/AdminPageLayout";
import { Loader2, Search, TrendingUp, TrendingDown, Wallet, Gift, CreditCard, Calendar, User, AlertTriangle, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

const AWS_API = "https://18.219.229.240/website/admin-actions.php";
const API_KEY = "ghala2026actions";

interface UserFinanceData {
  uuid: string;
  name: string;
  balance: number;       // di (current coins)
  chargerExp: number;    // total lifetime charges
  chargerLevel: number;
  senderLevel: number;
  receivedLevel: number;
  vip: number;
  createdAt: string;
  salaryRequests: any[];
}

const AdminUserFinancePage: React.FC = () => {
  const { handleLogout } = useAdminSession();
  const [uuid, setUuid] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<UserFinanceData | null>(null);
  const [error, setError] = useState("");

  const search = async () => {
    if (!uuid.trim()) return;
    setLoading(true);
    setError("");
    setData(null);
    
    try {
      // Fetch from AWS admin-actions (always works, has real production data)
      const [userRes, salaryRes] = await Promise.all([
        fetch(`${AWS_API}?key=${API_KEY}&action=user-info&uuid=${uuid.trim()}`).then(r => r.json()),
        supabase.from("salary_requests")
          .select("amount_usd, request_type, status, created_at")
          .eq("uuid", uuid.trim())
          .order("created_at", { ascending: false })
          .limit(20) as any,
      ]);

      if (!userRes?.ok || !userRes?.data) {
        throw new Error("المستخدم غير موجود أو UUID خطأ");
      }

      const u = userRes.data;

      setData({
        uuid: String(u.uuid),
        name: u.name || "—",
        balance: u.di || 0,
        chargerExp: u.charger_exp || 0,
        chargerLevel: u.charger_level || 0,
        senderLevel: u.sender_level || 0,
        receivedLevel: u.received_level || 0,
        vip: u.vip || 0,
        createdAt: u.created_at || "",
        salaryRequests: salaryRes?.data || [],
      });
    } catch (e: any) {
      setError(e.message || "فشل جلب البيانات");
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
            <h3 className="text-sm font-bold text-foreground">بحث بـ UUID</h3>
          </div>
          
          <input
            value={uuid}
            onChange={e => setUuid(e.target.value)}
            onKeyDown={e => e.key === "Enter" && search()}
            placeholder="أدخل UUID المستخدم..."
            className="w-full bg-background/50 border border-border/30 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-purple-500/40"
          />

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
              
              {/* User Info Header */}
              <div className="rounded-2xl p-4" style={{
                background: 'linear-gradient(145deg, rgba(168,85,247,0.12), rgba(168,85,247,0.03))',
                border: '1px solid rgba(168,85,247,0.2)',
              }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-purple-500/20">
                    <User className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">{data.name}</p>
                    <p className="text-[10px] text-muted-foreground">UUID: {data.uuid}</p>
                    <p className="text-[10px] text-muted-foreground">منذ: {data.createdAt ? new Date(data.createdAt).toLocaleDateString('ar-SA') : '—'}</p>
                  </div>
                  {data.vip > 0 && (
                    <span className="mr-auto px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold flex items-center gap-1">
                      <Star className="w-3 h-3" /> VIP
                    </span>
                  )}
                </div>
              </div>

              {/* Financial Stats */}
              <div className="grid grid-cols-2 gap-2">
                {/* Current Balance */}
                <div className="rounded-xl p-3 space-y-1 col-span-2" style={{
                  ...glassCard,
                  background: 'linear-gradient(145deg, rgba(34,197,94,0.08), rgba(34,197,94,0.02))',
                  borderColor: 'rgba(34,197,94,0.15)',
                }}>
                  <div className="flex items-center gap-1.5">
                    <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[10px] text-muted-foreground">رصيد المحفظة الحالي</span>
                  </div>
                  <p className="text-2xl font-black text-emerald-400">{formatCoins(data.balance)}</p>
                  <p className="text-[10px] text-muted-foreground">≈ {formatUsd(data.balance)}</p>
                </div>

                {/* Total Charged (Lifetime) */}
                <div className="rounded-xl p-3 space-y-1" style={glassCard}>
                  <div className="flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-[10px] text-muted-foreground">إجمالي الشحن</span>
                  </div>
                  <p className="text-lg font-black text-blue-400">{formatCoins(data.chargerExp)}</p>
                  <p className="text-[10px] text-muted-foreground">≈ {formatUsd(data.chargerExp)}</p>
                  <p className="text-[10px] text-muted-foreground">مستوى {data.chargerLevel}</p>
                </div>

                {/* Sender Level */}
                <div className="rounded-xl p-3 space-y-1" style={glassCard}>
                  <div className="flex items-center gap-1.5">
                    <Gift className="w-3.5 h-3.5 text-pink-400" />
                    <span className="text-[10px] text-muted-foreground">مستوى الإرسال</span>
                  </div>
                  <p className="text-lg font-black text-pink-400">LV {data.senderLevel}</p>
                  <p className="text-[10px] text-muted-foreground">الاستقبال: LV {data.receivedLevel}</p>
                </div>
              </div>

              {/* Analysis */}
              <div className="rounded-2xl p-4" style={{
                ...glassCard,
                background: data.chargerExp > 0 && data.balance < data.chargerExp * 0.1
                  ? 'linear-gradient(145deg, rgba(239,68,68,0.08), rgba(239,68,68,0.02))'
                  : 'linear-gradient(145deg, rgba(34,197,94,0.08), rgba(34,197,94,0.02))',
                borderColor: data.chargerExp > 0 && data.balance < data.chargerExp * 0.1
                  ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
              }}>
                <div className="flex items-center gap-2 mb-2">
                  {data.chargerExp > 0 && data.balance < data.chargerExp * 0.1 ? (
                    <TrendingDown className="w-4 h-4 text-red-400" />
                  ) : (
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                  )}
                  <span className="text-xs font-bold text-foreground">تحليل مالي</span>
                </div>
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">شحن إجمالي:</span>
                    <span className="text-blue-400 font-bold">{formatCoins(data.chargerExp)} ({formatUsd(data.chargerExp)})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">باقي بالمحفظة:</span>
                    <span className="text-emerald-400 font-bold">{formatCoins(data.balance)} ({formatUsd(data.balance)})</span>
                  </div>
                  <div className="flex justify-between border-t border-border/10 pt-1.5">
                    <span className="text-muted-foreground">مصروف/مُرسل:</span>
                    <span className="text-red-400 font-bold">{formatCoins(data.chargerExp - data.balance)} ({formatUsd(data.chargerExp - data.balance)})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">نسبة الاستهلاك:</span>
                    <span className={`font-bold ${data.chargerExp > 0 ? (((data.chargerExp - data.balance) / data.chargerExp) > 0.9 ? 'text-red-400' : 'text-amber-400') : 'text-muted-foreground'}`}>
                      {data.chargerExp > 0 ? `${(((data.chargerExp - data.balance) / data.chargerExp) * 100).toFixed(1)}%` : '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Salary Requests from Supabase */}
              {data.salaryRequests.length > 0 && (
                <div className="rounded-2xl p-4 space-y-2" style={glassCard}>
                  <h4 className="text-xs font-bold text-foreground">💵 طلبات الراتب ({data.salaryRequests.length})</h4>
                  <div className="max-h-48 overflow-y-auto space-y-1.5">
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
