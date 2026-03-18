import React, { useState, useEffect } from "react";
import { useAdminSession } from "@/hooks/use-admin-session";
import AdminPageLayout from "@/components/AdminPageLayout";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Crown, Loader2, Send, Clock, Search, Filter, Star } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AdminTopAgents from "@/components/AdminTopAgents";

const AdminVipPage: React.FC = () => {
  const { adminCall, handleLogout, isModeratorRole } = useAdminSession();
  const [loading, setLoading] = useState(false);
  const [vipRequests, setVipRequests] = useState<any[]>([]);
  const [subTab, setSubTab] = useState<"send" | "requests" | "top_agents">("send");

  // Send VIP form
  const [vipUuid, setVipUuid] = useState("");
  const [vipLevel, setVipLevel] = useState(1);
  const [vipDuration, setVipDuration] = useState("1month");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (subTab === "requests") loadRequests();
  }, [subTab]);

  const loadRequests = async () => {
    setLoading(true);
    const { data } = await supabase.from("vip_requests").select("*").order("created_at", { ascending: false }).limit(100);
    setVipRequests(data || []);
    setLoading(false);
  };

  const sendVip = async () => {
    if (!vipUuid.trim()) { toast.error("يرجى إدخال UUID"); return; }
    setSending(true);
    try {
      await adminCall("admin_give_vip", { uuid: vipUuid.trim(), vip_level: vipLevel });
      toast.success(`تم إرسال VIP ${vipLevel} بنجاح`);
      setVipUuid("");
    } catch (err: any) { toast.error(err?.message || "فشل الإرسال"); }
    finally { setSending(false); }
  };

  const durations = [
    { key: "1month", label: "شهر واحد" },
    { key: "3months", label: "3 أشهر" },
    { key: "6months", label: "6 أشهر" },
    { key: "1year", label: "سنة كاملة" },
  ];

  const getVipBadgeColor = (level: number) => {
    if (level >= 5) return "bg-amber-500/20 text-amber-300 border-amber-500/30";
    if (level >= 3) return "bg-purple-500/20 text-purple-300 border-purple-500/30";
    return "bg-sky-500/20 text-sky-300 border-sky-500/30";
  };

  return (
    <AdminPageLayout title="إدارة VIP" accentColor="#FFD700" onLogout={handleLogout}>
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-5" dir="rtl">

        {/* Page description */}
        <p className="text-xs text-muted-foreground leading-relaxed">
          إدارة الطلبات المعلقة، منح العضويات، ومراجعة السجلات.
        </p>

        {/* Sub-tabs — pill style */}
        <div className="flex gap-1 p-1 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
          {[
            { key: "send" as const, label: "منح عضوية", icon: <Star className="w-3.5 h-3.5" /> },
            { key: "requests" as const, label: "الطلبات", icon: <Clock className="w-3.5 h-3.5" /> },
            { key: "top_agents" as const, label: "TOP وكلاء", icon: <Crown className="w-3.5 h-3.5" /> },
          ].map(t => (
            <button key={t.key} onClick={() => setSubTab(t.key)}
              className={`flex-1 py-2.5 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1.5
                ${subTab === t.key
                  ? "bg-gradient-to-b from-amber-500/20 to-amber-600/10 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.1)]"
                  : "text-muted-foreground hover:text-foreground/70"}`}>
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* ─── SEND VIP TAB ─── */}
          {subTab === "send" && (
            <motion.div key="send" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="space-y-5">
              {/* Grant VIP Card */}
              <div className="rounded-2xl border border-amber-500/15 bg-gradient-to-br from-amber-500/[0.06] to-transparent p-5 space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/30 to-amber-600/10 flex items-center justify-center">
                    <Star className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-foreground">منح عضوية VIP جديدة</h2>
                    <p className="text-[10px] text-muted-foreground">أدخل معرف المستخدم واختر المستوى</p>
                  </div>
                </div>

                {/* UUID Input */}
                <div className="space-y-1.5">
                  <label className="text-[11px] text-muted-foreground font-medium">معرف المستخدم (UUID)</label>
                  <div className="relative">
                    <Input
                      placeholder="أدخل المعرف..."
                      value={vipUuid}
                      onChange={e => setVipUuid(e.target.value)}
                      className="h-11 rounded-xl bg-white/[0.04] border-white/[0.08] font-mono text-sm pr-10 placeholder:text-muted-foreground/40 focus:border-amber-500/40 focus:ring-amber-500/20"
                      dir="ltr"
                    />
                    <Search className="w-4 h-4 text-muted-foreground/40 absolute right-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                {/* VIP Level Grid */}
                <div className="space-y-2">
                  <label className="text-[11px] text-muted-foreground font-medium">مستوى العضوية</label>
                  <div className="grid grid-cols-6 gap-1.5">
                    {[1, 2, 3, 4, 5, 6].map(lvl => (
                      <button key={lvl} onClick={() => setVipLevel(lvl)}
                        className={`py-3 rounded-xl text-[11px] font-bold transition-all
                          ${vipLevel === lvl
                            ? "bg-gradient-to-b from-amber-500/25 to-amber-600/10 text-amber-300 border border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.15)]"
                            : "bg-white/[0.03] border border-white/[0.06] text-muted-foreground hover:bg-white/[0.06] hover:text-foreground/80"}`}>
                        VIP {lvl}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Duration */}
                <div className="space-y-2">
                  <label className="text-[11px] text-muted-foreground font-medium">مدة الاشتراك</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {durations.map(d => (
                      <button key={d.key} onClick={() => setVipDuration(d.key)}
                        className={`py-2.5 rounded-xl text-[10px] font-bold transition-all
                          ${vipDuration === d.key
                            ? "bg-gradient-to-b from-amber-500/25 to-amber-600/10 text-amber-300 border border-amber-500/40"
                            : "bg-white/[0.03] border border-white/[0.06] text-muted-foreground hover:bg-white/[0.06]"}`}>
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Submit */}
                <Button onClick={sendVip} disabled={sending || !vipUuid.trim()}
                  className="w-full h-11 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold text-sm shadow-[0_4px_20px_rgba(245,158,11,0.25)] transition-all">
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4 ml-2" />
                      إرسال العضوية
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}

          {/* ─── REQUESTS TAB ─── */}
          {subTab === "requests" && (
            <motion.div key="requests" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="space-y-4">

              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-600/5 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-orange-400" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-foreground">سجل الطلبات</h2>
                    <p className="text-[10px] text-muted-foreground">{vipRequests.length} طلب</p>
                  </div>
                </div>
                <button onClick={loadRequests} className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] transition-colors">
                  <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
                </div>
              ) : vipRequests.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 rounded-2xl bg-white/[0.03] flex items-center justify-center mx-auto mb-3">
                    <Crown className="w-8 h-8 text-muted-foreground/30" />
                  </div>
                  <p className="text-sm text-muted-foreground">لا توجد طلبات VIP</p>
                </div>
              ) : (
                /* Requests as table-like cards */
                <div className="rounded-2xl border border-white/[0.06] overflow-hidden">
                  {/* Table header */}
                  <div className="grid grid-cols-[1fr_auto_auto] gap-3 px-4 py-2.5 bg-white/[0.02] border-b border-white/[0.04]">
                    <span className="text-[10px] text-muted-foreground font-medium">المستخدم</span>
                    <span className="text-[10px] text-muted-foreground font-medium">المستوى</span>
                    <span className="text-[10px] text-muted-foreground font-medium">التاريخ</span>
                  </div>

                  {vipRequests.map((req: any, idx: number) => (
                    <div key={req.id}
                      className={`grid grid-cols-[1fr_auto_auto] gap-3 items-center px-4 py-3 transition-colors hover:bg-white/[0.02]
                        ${idx < vipRequests.length - 1 ? "border-b border-white/[0.04]" : ""}`}>
                      {/* User info */}
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">{req.user_name || "—"}</p>
                        <p className="text-[10px] text-muted-foreground font-mono truncate">{req.user_uuid}</p>
                        {req.recipient_uuid && (
                          <p className="text-[9px] text-amber-400/70 mt-0.5">🎁 → {req.recipient_uuid}</p>
                        )}
                      </div>

                      {/* VIP badge */}
                      <span className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold ${getVipBadgeColor(req.vip_level)}`}>
                        VIP {req.vip_level}
                      </span>

                      {/* Date */}
                      <div className="text-left">
                        <p className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {new Date(req.created_at).toLocaleDateString("ar-EG", { day: "numeric", month: "short" })}
                        </p>
                        <p className="text-[9px] text-muted-foreground/60">
                          {req.request_month}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ─── TOP AGENTS TAB ─── */}
          {subTab === "top_agents" && (
            <motion.div key="top_agents" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
              <AdminTopAgents readOnly={isModeratorRole} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AdminPageLayout>
  );
};

export default AdminVipPage;
