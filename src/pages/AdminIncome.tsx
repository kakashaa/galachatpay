import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu, TrendingUp, Download, Edit2, Banknote, Target,
  History, Gift, Diamond, Star, Search, BarChart3,
  MessageSquare, Users, Loader2, ChevronDown, ChevronLeft,
  ArrowUpRight, ArrowDownLeft, DollarSign, Crown, Zap, Eye
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// --- Types ---
interface TransactionItem {
  id: string;
  name: string;
  userId: string;
  type: string;
  amount: number;
  time: string;
  icon: "gift" | "diamond" | "star" | "crown";
}

interface UserIncomeData {
  uuid: string;
  name: string;
  totalDiamonds: number;
  salary: number;
  supportersCount: number;
  supportedCount: number;
  vipLevel: number;
}

// --- Mock Data (will be replaced by API) ---
const MOCK_TRANSACTIONS: TransactionItem[] = [
  { id: "1", name: "أحمد المحمدي", userId: "49283", type: "هدايا", amount: 500, time: "10:45 PM", icon: "gift" },
  { id: "2", name: "سارة خالد", userId: "12039", type: "بيع VIP", amount: 2400, time: "09:12 PM", icon: "diamond" },
  { id: "3", name: "مركز الدعم", userId: "SYSTEM", type: "اشتراكات", amount: 12000, time: "08:55 PM", icon: "star" },
  { id: "4", name: "خالد العمري", userId: "33102", type: "هدايا", amount: 800, time: "07:30 PM", icon: "gift" },
  { id: "5", name: "فاطمة حسن", userId: "20445", type: "VIP تجديد", amount: 3500, time: "06:15 PM", icon: "crown" },
];

const ICON_MAP = {
  gift: { icon: Gift, color: "text-[#34eb45]", bg: "bg-[#34eb45]/10" },
  diamond: { icon: Diamond, color: "text-[#0deafc]", bg: "bg-[#0deafc]/10" },
  star: { icon: Star, color: "text-[#ff7162]", bg: "bg-[#ff7162]/10" },
  crown: { icon: Crown, color: "text-[#FFD700]", bg: "bg-[#FFD700]/10" },
};

const AdminIncome: React.FC = () => {
  const navigate = useNavigate();
  const [activeNav, setActiveNav] = useState<"search" | "stats" | "chat">("stats");
  const [searchUuid, setSearchUuid] = useState("");
  const [searching, setSearching] = useState(false);
  const [userData, setUserData] = useState<UserIncomeData | null>(null);
  const [showUserPanel, setShowUserPanel] = useState(false);
  const [viewMode, setViewMode] = useState<"all" | "user">("all");

  // Animated counter
  const [displayTotal, setDisplayTotal] = useState(0);
  const totalDiamonds = 124580;

  useEffect(() => {
    let start = 0;
    const duration = 1500;
    const step = totalDiamonds / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= totalDiamonds) {
        setDisplayTotal(totalDiamonds);
        clearInterval(timer);
      } else {
        setDisplayTotal(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, []);

  const handleSearch = useCallback(async () => {
    if (!searchUuid.trim()) return;
    setSearching(true);
    // TODO: Replace with actual API call
    setTimeout(() => {
      setUserData({
        uuid: searchUuid,
        name: "أحمد المحمدي",
        totalDiamonds: 45200,
        salary: 1250,
        supportersCount: 34,
        supportedCount: 12,
        vipLevel: 4,
      });
      setShowUserPanel(true);
      setSearching(false);
    }, 1000);
  }, [searchUuid]);

  return (
    <div className="min-h-screen" style={{ background: '#080808', fontFamily: "'IBM Plex Sans Arabic', 'Inter', sans-serif" }} dir="rtl">
      {/* Top App Bar */}
      <header className="sticky top-0 z-50 flex justify-between items-center px-4 h-16 w-full" style={{ background: '#0e0e0e' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/admin/dashboard")} className="p-2 rounded-lg hover:bg-[#262626] active:scale-95 transition-all">
            <Menu className="w-5 h-5 text-[#34eb45]" />
          </button>
          <h1 className="text-xl font-black text-[#34eb45]">إدارة المداخيل</h1>
        </div>
        <div className="w-10 h-10 rounded-full border-2 border-[#34eb45]/20 overflow-hidden" style={{ background: '#262626' }}>
          <div className="w-full h-full flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-[#34eb45]" />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6 mb-28">
        {/* Income Overview Card */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative group"
        >
          <div className="absolute -inset-0.5 rounded-xl blur opacity-10 group-hover:opacity-20 transition duration-1000" style={{ background: 'linear-gradient(135deg, #34eb45, #00d632)' }} />
          <div className="relative rounded-xl p-8" style={{ background: '#131313', border: '1px solid rgba(72,72,71,0.1)' }}>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] text-white/40 uppercase tracking-[0.15em] font-bold mb-2">إجمالي الأرباح</p>
                <h2 className="text-5xl font-black text-[#34eb45] tracking-tighter leading-none mb-4">
                  {displayTotal.toLocaleString()} <span className="text-xl font-medium">الماس</span>
                </h2>
              </div>
              <div className="px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1" style={{ background: 'rgba(52,235,69,0.1)', color: '#34eb45' }}>
                <TrendingUp className="w-3.5 h-3.5" />
                <span>+12.4%</span>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button className="px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 active:scale-95 transition-all hover:scale-[1.02]" style={{ background: 'linear-gradient(135deg, #34eb45, #00d632)', color: '#00500c' }}>
                <Download className="w-4 h-4" />
                تصدير تقرير
              </button>
              <button className="px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 active:scale-95 transition-all" style={{ background: '#262626', color: 'white', border: '1px solid rgba(72,72,71,0.2)' }}>
                <Edit2 className="w-4 h-4" />
                تعديل يدوي
              </button>
            </div>
          </div>
        </motion.section>

        {/* Quick Stats Row */}
        <section className="grid grid-cols-2 gap-4">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-xl p-5 hover:scale-[1.02] transition-transform cursor-default"
            style={{ background: '#201f1f', border: '1px solid rgba(72,72,71,0.1)' }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded flex items-center justify-center" style={{ background: 'rgba(52,235,69,0.1)' }}>
                <Banknote className="w-5 h-5 text-[#34eb45]" />
              </div>
              <p className="text-[10px] text-white/40 uppercase tracking-[0.12em] font-bold">دخل اليوم</p>
            </div>
            <p className="text-2xl font-bold text-white tracking-tight">+4,210 <span className="text-xs font-normal text-white/40">الماس</span></p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-xl p-5 hover:scale-[1.02] transition-transform cursor-default"
            style={{ background: '#201f1f', border: '1px solid rgba(72,72,71,0.1)' }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded flex items-center justify-center" style={{ background: 'rgba(13,234,252,0.1)' }}>
                <Target className="w-5 h-5 text-[#0deafc]" />
              </div>
              <p className="text-[10px] text-white/40 uppercase tracking-[0.12em] font-bold">هدف الشهر</p>
            </div>
            <div className="space-y-2">
              <p className="text-2xl font-bold text-white tracking-tight">85%</p>
              <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: '#000' }}>
                <div className="h-full rounded-full" style={{ width: '85%', background: '#0deafc' }} />
              </div>
            </div>
          </motion.div>
        </section>

        {/* Search User Section */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl p-4 space-y-3"
          style={{ background: '#131313', border: '1px solid rgba(72,72,71,0.1)' }}
        >
          <div className="flex items-center gap-2 px-1">
            <Search className="w-4 h-4 text-[#34eb45]" />
            <h3 className="text-sm font-bold text-white">فحص مستخدم</h3>
          </div>
          <div className="flex gap-2">
            <Input
              value={searchUuid}
              onChange={(e) => setSearchUuid(e.target.value)}
              placeholder="أدخل UUID المستخدم..."
              className="flex-1 text-sm bg-black border-white/[0.06] text-white placeholder:text-white/20"
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <Button
              onClick={handleSearch}
              disabled={searching || !searchUuid.trim()}
              className="font-bold text-[#0e0e0e] px-5"
              style={{ background: 'linear-gradient(135deg, #34eb45, #00d632)' }}
            >
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Eye className="w-4 h-4 ml-1" />فحص</>}
            </Button>
          </div>
        </motion.section>

        {/* User Data Panel */}
        <AnimatePresence>
          {showUserPanel && userData && (
            <motion.section
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.97 }}
              className="rounded-xl overflow-hidden"
              style={{ background: '#131313', border: '1px solid rgba(52,235,69,0.15)' }}
            >
              {/* User Header */}
              <div className="p-5 flex items-center gap-4" style={{ background: 'linear-gradient(135deg, rgba(52,235,69,0.08), rgba(0,214,50,0.03))' }}>
                <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: '#262626', border: '2px solid rgba(52,235,69,0.3)' }}>
                  <Users className="w-6 h-6 text-[#34eb45]" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-black text-white">{userData.name}</h3>
                  <p className="text-[10px] text-white/30 font-mono">UUID: {userData.uuid}</p>
                </div>
                <button onClick={() => setShowUserPanel(false)} className="p-2 rounded-lg hover:bg-white/5 transition-colors">
                  <ChevronDown className="w-5 h-5 text-white/30" />
                </button>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-px" style={{ background: 'rgba(72,72,71,0.1)' }}>
                <div className="p-4" style={{ background: '#131313' }}>
                  <p className="text-[10px] text-white/30 uppercase tracking-[0.12em] font-bold mb-1">الراتب</p>
                  <p className="text-xl font-black text-[#34eb45]">${userData.salary.toLocaleString()}</p>
                </div>
                <div className="p-4" style={{ background: '#131313' }}>
                  <p className="text-[10px] text-white/30 uppercase tracking-[0.12em] font-bold mb-1">إجمالي الماس</p>
                  <p className="text-xl font-black text-[#0deafc]">{userData.totalDiamonds.toLocaleString()}</p>
                </div>
                <div className="p-4" style={{ background: '#131313' }}>
                  <p className="text-[10px] text-white/30 uppercase tracking-[0.12em] font-bold mb-1">الداعمين</p>
                  <div className="flex items-center gap-2">
                    <ArrowDownLeft className="w-4 h-4 text-[#34eb45]" />
                    <p className="text-xl font-black text-white">{userData.supportersCount}</p>
                  </div>
                </div>
                <div className="p-4" style={{ background: '#131313' }}>
                  <p className="text-[10px] text-white/30 uppercase tracking-[0.12em] font-bold mb-1">المدعومين</p>
                  <div className="flex items-center gap-2">
                    <ArrowUpRight className="w-4 h-4 text-[#ff7162]" />
                    <p className="text-xl font-black text-white">{userData.supportedCount}</p>
                  </div>
                </div>
              </div>

              {/* VIP Badge */}
              <div className="p-4 flex items-center justify-between" style={{ borderTop: '1px solid rgba(72,72,71,0.1)' }}>
                <div className="flex items-center gap-2">
                  <Crown className="w-4 h-4 text-[#FFD700]" />
                  <span className="text-xs font-bold text-white/60">مستوى VIP</span>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-black" style={{ background: 'rgba(255,215,0,0.1)', color: '#FFD700' }}>
                  VIP {userData.vipLevel}
                </span>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Transaction Log */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="space-y-3"
        >
          <div className="flex justify-between items-center px-1">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <History className="w-4 h-4 text-[#34eb45]" />
              سجل المداخيل الأخير
            </h3>
            <span className="text-[10px] text-white/40 uppercase tracking-[0.15em] font-bold hover:text-[#34eb45] cursor-pointer transition-colors">
              عرض الكل
            </span>
          </div>

          <div className="rounded-xl overflow-hidden" style={{ background: '#131313', border: '1px solid rgba(72,72,71,0.05)' }}>
            {MOCK_TRANSACTIONS.map((tx, i) => {
              const iconData = ICON_MAP[tx.icon];
              const IconComp = iconData.icon;
              return (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.05 }}
                  className="flex items-center justify-between p-4 hover:bg-[#201f1f] transition-colors group cursor-pointer"
                  style={i < MOCK_TRANSACTIONS.length - 1 ? { borderBottom: '1px solid rgba(72,72,71,0.05)' } : {}}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${iconData.bg} group-hover:${iconData.bg}`} style={{ background: '#000' }}>
                      <IconComp className={`w-5 h-5 ${iconData.color}`} style={{ fill: 'currentColor' }} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{tx.name}</p>
                      <p className="text-[10px] text-white/40 uppercase tracking-wide">ID: #{tx.userId} • {tx.type}</p>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-black text-[#34eb45]">+{tx.amount.toLocaleString()} الماس</p>
                    <p className="text-[10px] text-white/40">{tx.time}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.section>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-around items-center w-full h-20 px-6 rounded-t-xl" style={{ background: 'rgba(19,19,19,0.6)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderTop: '1px solid rgba(72,72,71,0.05)' }}>
        <button
          onClick={() => { setActiveNav("search"); navigate("/admin/dashboard"); }}
          className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all ${activeNav === "search" ? "text-[#34eb45] bg-[#34eb45]/10 scale-105" : "text-white/40 hover:text-white"}`}
        >
          <Search className="w-5 h-5" />
        </button>
        <button
          onClick={() => setActiveNav("stats")}
          className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all ${activeNav === "stats" ? "text-[#34eb45] bg-[#34eb45]/10 scale-105" : "text-white/40 hover:text-white"}`}
        >
          <BarChart3 className="w-5 h-5" />
        </button>
        <button
          onClick={() => setActiveNav("chat")}
          className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all ${activeNav === "chat" ? "text-[#34eb45] bg-[#34eb45]/10 scale-105" : "text-white/40 hover:text-white"}`}
        >
          <MessageSquare className="w-5 h-5" />
        </button>
      </nav>
    </div>
  );
};

export default AdminIncome;
