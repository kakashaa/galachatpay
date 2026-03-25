import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Loader2, RefreshCw, CheckCircle, XCircle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { galaApi } from "@/services/galaApi";
import { motion, AnimatePresence } from "framer-motion";

type TestStatus = "idle" | "running" | "pass" | "fail";
interface TestResult {
  name: string;
  status: TestStatus;
  ms?: number;
  error?: string;
}

const TESTS: { name: string; fn: () => Promise<unknown> }[] = [
  { name: "admin_session_token", fn: async () => { if (!localStorage.getItem("admin_session_token")) throw new Error("missing"); return true; } },
  { name: "admin_api_token", fn: async () => { if (!localStorage.getItem("admin_api_token")) throw new Error("missing"); return true; } },
  { name: "Supabase: support_tickets", fn: () => supabase.from("support_tickets").select("id").limit(1).then(r => { if (r.error) throw r.error; }) },
  { name: "Supabase: vip_requests", fn: () => supabase.from("vip_requests").select("id").limit(1).then(r => { if (r.error) throw r.error; }) },
  { name: "Supabase: admin_shifts", fn: () => supabase.from("admin_shifts").select("admin_username").limit(1).then(r => { if (r.error) throw r.error; }) },
  { name: "Supabase: admin_accounts", fn: () => supabase.from("admin_accounts").select("id").limit(1).then(r => { if (r.error) throw r.error; }) },
  { name: "API: user-info (1000)", fn: () => galaApi.getUserInfo("1000") },
  { name: "API: salary_report (1000)", fn: () => galaApi.salaryReport("1000") },
  { name: "API: withdraw-status (1000)", fn: () => galaApi.withdrawStatus("1000") },
  { name: "API: salary_withdraw_list", fn: () => galaApi.salaryWithdrawList(new Date().toISOString().slice(0, 7)) },
  { name: "API: list-requests", fn: () => galaApi.listRequests() },
  { name: "hola-chat health", fn: () => fetch("https://hola-chat.com/health.php", { signal: AbortSignal.timeout(8000) }).then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); }) },
  { name: "GCS storage", fn: () => fetch("https://storage.googleapis.com/galalivechat-bucket-01/gifts/country_220.jpg", { method: "HEAD", signal: AbortSignal.timeout(8000) }).then(r => { if (!r.ok) throw new Error(`${r.status}`); }) },
];

const AdminHealthCheck: React.FC = () => {
  const navigate = useNavigate();
  const [results, setResults] = useState<TestResult[]>(TESTS.map(t => ({ name: t.name, status: "idle" })));
  const [running, setRunning] = useState(false);

  const runAll = useCallback(async () => {
    setRunning(true);
    const newResults: TestResult[] = TESTS.map(t => ({ name: t.name, status: "running" as TestStatus }));
    setResults([...newResults]);

    for (let i = 0; i < TESTS.length; i++) {
      const t = TESTS[i];
      const start = performance.now();
      try {
        await t.fn();
        const ms = Math.round(performance.now() - start);
        newResults[i] = { name: t.name, status: "pass", ms };
      } catch (e: any) {
        const ms = Math.round(performance.now() - start);
        newResults[i] = { name: t.name, status: "fail", ms, error: e?.message || "unknown" };
      }
      setResults([...newResults]);
    }
    setRunning(false);
  }, []);

  const passCount = results.filter(r => r.status === "pass").length;
  const failCount = results.filter(r => r.status === "fail").length;
  const allDone = results.every(r => r.status === "pass" || r.status === "fail");

  return (
    <div className="mobile-container min-h-screen bg-background p-4 pb-20 admin-theme" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate("/admin/dashboard")} className="p-2 rounded-xl bg-white/5 border border-white/10">
          <ArrowRight className="w-5 h-5 text-muted-foreground" />
        </button>
        <h1 className="text-xl font-bold text-foreground">🩺 فحص النظام</h1>
      </div>

      {/* Summary */}
      {allDone && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-2xl mb-4 text-center font-bold text-lg ${failCount === 0 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
          {failCount === 0 ? `✅ كل شي شغال (${passCount}/${TESTS.length})` : `❌ ${failCount} فحص فاشل من ${TESTS.length}`}
        </motion.div>
      )}

      {/* Run button */}
      <button onClick={runAll} disabled={running}
        className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-bold text-lg mb-6 flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-95">
        {running ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
        {running ? "جاري الفحص..." : "ابدأ الفحص"}
      </button>

      {/* Results */}
      <div className="space-y-2">
        <AnimatePresence>
          {results.map((r, i) => (
            <motion.div key={r.name} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
              className={`flex items-center justify-between p-3 rounded-xl border ${
                r.status === "pass" ? "bg-emerald-500/5 border-emerald-500/20" :
                r.status === "fail" ? "bg-red-500/5 border-red-500/20" :
                r.status === "running" ? "bg-yellow-500/5 border-yellow-500/20" :
                "bg-white/5 border-white/10"
              }`}>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {r.status === "pass" && <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
                {r.status === "fail" && <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />}
                {r.status === "running" && <Loader2 className="w-4 h-4 text-yellow-400 animate-spin flex-shrink-0" />}
                {r.status === "idle" && <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{r.name}</p>
                  {r.error && <p className="text-xs text-red-400 truncate">{r.error}</p>}
                </div>
              </div>
              {r.ms !== undefined && (
                <span className={`text-xs font-mono flex-shrink-0 ${r.ms > 3000 ? "text-red-400" : r.ms > 1000 ? "text-yellow-400" : "text-emerald-400"}`}>
                  {r.ms}ms
                </span>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AdminHealthCheck;
