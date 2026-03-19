import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Search, ArrowRight, Loader2, ShieldBan, ShieldCheck, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import MobileLayout from "@/components/MobileLayout";

const STORAGE_KEY = "ban-check-history";
const MAX_HISTORY = 5;

interface BanEntry {
  reason: string;
  type: string;
  duration_hours: number | null;
  is_permanent: boolean;
  is_active: boolean;
  created_at: string;
  expires_at: string | null;
}

interface BanSummary {
  active_bans: number;
  total_bans: number;
  has_device_ban: boolean;
  has_ip_ban: boolean;
  has_normal_ban: boolean;
}

interface BanCheckResult {
  is_banned: boolean;
  uuid: string;
  summary: BanSummary;
  bans: BanEntry[];
  error?: string;
}

const getHistory = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
};

const saveHistory = (uuid: string) => {
  const history = getHistory().filter((h) => h !== uuid);
  history.unshift(uuid);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
};

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
};

const BanCheckPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [uuid, setUuid] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<BanCheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>(getHistory());

  const doSearch = async (searchUuid: string) => {
    const trimmed = searchUuid.trim();
    if (!trimmed) {
      toast.error("يرجى إدخال الآيدي");
      return;
    }
    if (!/^\d+$/.test(trimmed)) {
      toast.error("الآيدي يجب أن يكون أرقام فقط");
      return;
    }

    setIsLoading(true);
    setResult(null);
    setError(null);

    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/ban-check?uuid=${encodeURIComponent(trimmed)}`,
        {
          headers: {
            Authorization: `Bearer ${anonKey}`,
            apikey: anonKey,
          },
        }
      );

      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error || "حدث خطأ في الاستعلام");
        return;
      }

      setResult(data);
      saveHistory(trimmed);
      setHistory(getHistory());
    } catch (err) {
      console.error("Ban check error:", err);
      setError("حدث خطأ في الاتصال بالخادم");
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-search from query param
  useEffect(() => {
    const paramUuid = searchParams.get("uuid");
    if (paramUuid && /^\d+$/.test(paramUuid)) {
      setUuid(paramUuid);
      doSearch(paramUuid);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    doSearch(uuid);
  };

  return (
    <MobileLayout>
      <div className="min-h-screen bg-background p-4 pb-24" dir="rtl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-muted-foreground">
            <ArrowRight className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">فحص الحظر</h1>
            <p className="text-xs text-muted-foreground">ابحث عن حالة حظر أي مستخدم</p>
          </div>
        </div>

        {/* Search */}
        <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
          <Input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="ادخل الآيدي..."
            value={uuid}
            onChange={(e) => setUuid(e.target.value.replace(/\D/g, ""))}
            className="flex-1 bg-card border-border text-foreground placeholder:text-muted-foreground"
          />
          <Button type="submit" disabled={isLoading} className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5">
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            بحث
          </Button>
        </form>

        {/* History chips */}
        {history.length > 0 && (
          <div className="mb-6">
            <p className="text-xs text-muted-foreground mb-2">عمليات بحث سابقة</p>
            <div className="flex flex-wrap gap-2">
              {history.map((h) => (
                <button
                  key={h}
                  onClick={() => {
                    setUuid(h);
                    doSearch(h);
                  }}
                  className="px-3 py-1 rounded-full bg-muted text-foreground text-xs hover:bg-muted/80 transition-colors"
                >
                  {h}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading */}
        <AnimatePresence mode="wait">
          {isLoading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-16 gap-3"
            >
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-muted-foreground text-sm">جاري البحث...</p>
            </motion.div>
          )}

          {/* Error */}
          {!isLoading && error && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-5 text-center"
            >
              <AlertTriangle className="w-10 h-10 text-yellow-500 mx-auto mb-2" />
              <p className="text-yellow-400 font-semibold text-sm">{error}</p>
            </motion.div>
          )}

          {/* Result */}
          {!isLoading && !error && result && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {/* Main status card */}
              {result.is_banned ? (
                <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <ShieldBan className="w-8 h-8 text-destructive" />
                    <span className="text-lg font-bold text-destructive">محظور</span>
                  </div>
                  <div className="space-y-1.5 text-sm text-foreground">
                    <p>الآيدي: <span className="font-mono text-muted-foreground">{result.uuid}</span></p>
                    <p>عدد الحظرات الفعالة: <span className="font-bold text-destructive">{result.summary?.active_bans ?? 0}</span></p>
                    <p>عدد الحظرات الكلي: <span className="font-bold">{result.summary?.total_bans ?? 0}</span></p>
                  </div>

                  {/* Ban type badges */}
                   <div className="flex flex-wrap gap-2 mt-4">
                     <span className={`px-3 py-1 rounded-full text-xs font-medium ${result.summary?.has_device_ban ? "bg-destructive/20 text-destructive" : "bg-muted text-muted-foreground"}`}>
                       حظر كامل
                     </span>
                     <span className={`px-3 py-1 rounded-full text-xs font-medium ${result.summary?.has_ip_ban ? "bg-destructive/20 text-destructive" : "bg-muted text-muted-foreground"}`}>
                       حظر IP
                     </span>
                     <span className={`px-3 py-1 rounded-full text-xs font-medium ${result.summary?.has_normal_ban ? "bg-destructive/20 text-destructive" : "bg-muted text-muted-foreground"}`}>
                       حظر عناصر
                     </span>
                   </div>
                </div>
              ) : (
                <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <ShieldCheck className="w-8 h-8 text-emerald-500" />
                    <span className="text-lg font-bold text-emerald-400">غير محظور</span>
                  </div>
                  <p className="text-sm text-foreground">الآيدي: <span className="font-mono text-muted-foreground">{result.uuid}</span></p>
                  <p className="text-sm text-muted-foreground mt-1">هذا المستخدم ليس لديه أي حظر فعال</p>

                  {(result.summary?.total_bans ?? 0) > 0 && (result.summary?.active_bans ?? 0) === 0 && (
                    <div className="mt-3 p-3 rounded-lg bg-accent/10 border border-accent/20">
                      <p className="text-xs text-accent">ℹ يوجد {result.summary.total_bans} حظر سابق منتهي الصلاحية</p>
                    </div>
                  )}
                </div>
              )}

              {/* Bans table */}
              {result.bans && result.bans.length > 0 && (
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="p-3 border-b border-border">
                    <h3 className="text-sm font-semibold text-foreground">سجل الحظرات ({result.bans.length})</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border text-muted-foreground">
                          <th className="px-3 py-2 text-right">السبب</th>
                          <th className="px-3 py-2 text-right">النوع</th>
                          <th className="px-3 py-2 text-right">المدة</th>
                          <th className="px-3 py-2 text-right">تاريخ الحظر</th>
                          <th className="px-3 py-2 text-right">تاريخ الانتهاء</th>
                          <th className="px-3 py-2 text-right">الحالة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.bans.map((ban, i) => (
                          <tr
                            key={i}
                            className={`border-b border-border/50 ${ban.is_active ? "bg-destructive/5" : "bg-muted/30"}`}
                          >
                            <td className="px-3 py-2.5 text-foreground">{ban.reason || "—"}</td>
                            <td className="px-3 py-2.5 text-foreground">{ban.type || "—"}</td>
                            <td className="px-3 py-2.5 text-foreground">
                              {ban.is_permanent ? (
                                <span className="text-destructive font-semibold">أبدي</span>
                              ) : ban.duration_hours ? (
                                `${ban.duration_hours} ساعة`
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{formatDate(ban.created_at)}</td>
                            <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{formatDate(ban.expires_at)}</td>
                            <td className="px-3 py-2.5">
                              {ban.is_active ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400">فعال</span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-muted text-muted-foreground">منتهي</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MobileLayout>
  );
};

export default BanCheckPage;
