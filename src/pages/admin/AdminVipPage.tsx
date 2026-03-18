import React, { useState, useEffect } from "react";
import { useAdminSession } from "@/hooks/use-admin-session";
import AdminPageLayout from "@/components/AdminPageLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, ChevronLeft } from "lucide-react";
import AdminTopAgents from "@/components/AdminTopAgents";

/* ── Material icon helper (uses Google Material Symbols loaded via <link>) ── */
const MI: React.FC<{ icon: string; className?: string; filled?: boolean }> = ({ icon, className = "", filled }) => (
  <span className={`material-symbols-outlined ${className}`} style={filled ? { fontVariationSettings: "'FILL' 1" } : {}}>
    {icon}
  </span>
);

const AdminVipPage: React.FC = () => {
  const { adminCall, handleLogout, isModeratorRole } = useAdminSession();
  const [loading, setLoading] = useState(false);
  const [vipRequests, setVipRequests] = useState<any[]>([]);

  const [vipUuid, setVipUuid] = useState("");
  const [vipLevel, setVipLevel] = useState(3);
  const [vipDuration, setVipDuration] = useState("6months");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    // Load Material Symbols font
    if (!document.querySelector('link[href*="Material+Symbols"]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap";
      document.head.appendChild(link);
    }
    loadRequests();
  }, []);

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

  const avatarColors = ["#f59e0b", "#a855f7", "#3b82f6", "#10b981", "#ef4444", "#ec4899"];
  const getAvatarColor = (name: string) => avatarColors[(name || "").charCodeAt(0) % avatarColors.length];

  return (
    <AdminPageLayout title="إدارة VIP" accentColor="#FFD700" onLogout={handleLogout}>
      <div className="max-w-lg mx-auto px-4 py-5 space-y-6" dir="rtl">

        {/* ─── Page Title ─── */}
        <div className="text-center space-y-1">
          <h1 className="text-[17px] font-bold text-foreground tracking-tight">إدارة اشتراكات VIP</h1>
          <p className="text-[11px] text-muted-foreground/70">إدارة الطلبات المعلقة، منح العضويات، ومراجعة السجلات.</p>
        </div>

        {/* ═══════════════════════════════════════════
            ██  GRANT VIP CARD
            ═══════════════════════════════════════════ */}
        <div className="rounded-2xl bg-[#161625] border border-white/[0.07] p-5 space-y-4">
          <div className="flex items-center justify-center gap-2">
            <MI icon="stars" filled className="text-[22px] text-rose-400" />
            <h2 className="text-[13px] font-bold text-foreground">منح عضوية VIP جديدة</h2>
          </div>

          {/* UUID */}
          <div className="space-y-1.5">
            <label className="text-[11px] text-muted-foreground/70 block text-right">معرف المستخدم (UUID)</label>
            <div className="relative">
              <MI icon="person_search" className="text-[18px] text-muted-foreground/30 absolute right-3 top-1/2 -translate-y-1/2 z-10" />
              <input
                placeholder="أدخل معرف المستخدم..."
                value={vipUuid}
                onChange={e => setVipUuid(e.target.value)}
                dir="ltr"
                className="w-full h-11 rounded-xl bg-[#0c0c18] border border-white/[0.07] text-sm text-foreground font-mono pr-10 pl-4 placeholder:text-muted-foreground/25 focus:outline-none focus:border-rose-500/40 transition-colors"
              />
            </div>
          </div>

          {/* VIP Level */}
          <div className="space-y-1.5">
            <label className="text-[11px] text-muted-foreground/70 block text-right">مستوى العضوية</label>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map(lvl => (
                <button key={lvl} onClick={() => setVipLevel(lvl)}
                  className={`h-10 rounded-xl text-xs font-bold transition-all ${
                    vipLevel === lvl
                      ? "bg-[#e8594f] text-white"
                      : "bg-[#0c0c18] border border-white/[0.07] text-muted-foreground/60 hover:text-muted-foreground"
                  }`}>
                  VIP {lvl}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[5, 6].map(lvl => (
                <button key={lvl} onClick={() => setVipLevel(lvl)}
                  className={`h-10 rounded-xl text-xs font-bold transition-all ${
                    vipLevel === lvl
                      ? "bg-[#e8594f] text-white"
                      : "bg-[#0c0c18] border border-white/[0.07] text-muted-foreground/60 hover:text-muted-foreground"
                  }`}>
                  VIP {lvl}
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div className="space-y-1.5">
            <label className="text-[11px] text-muted-foreground/70 block text-right">مدة الاشتراك</label>
            <div className="grid grid-cols-4 gap-2">
              {durations.map(d => (
                <button key={d.key} onClick={() => setVipDuration(d.key)}
                  className={`h-10 rounded-xl text-[10px] font-bold transition-all ${
                    vipDuration === d.key
                      ? "bg-[#e8594f] text-white"
                      : "bg-[#0c0c18] border border-white/[0.07] text-muted-foreground/60 hover:text-muted-foreground"
                  }`}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <button onClick={sendVip} disabled={sending || !vipUuid.trim()}
            className="w-full h-[52px] rounded-2xl bg-[#e8594f] hover:bg-[#d44d43] text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-30 transition-all active:scale-[0.98]">
            {sending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <MI icon="send" className="text-[20px]" />
                إرسال العضوية
              </>
            )}
          </button>
        </div>

        {/* ═══════════════════════════════════════════
            ██  PENDING REQUESTS
            ═══════════════════════════════════════════ */}
        <div className="rounded-2xl bg-[#161625] border border-white/[0.07] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MI icon="pending_actions" filled className="text-[22px] text-sky-400" />
              <h2 className="text-[13px] font-bold text-foreground">طلبات معلقة</h2>
            </div>
            <span className="px-2 py-0.5 rounded-md bg-[#e8594f]/20 text-[#e8594f] text-[10px] font-bold">
              {vipRequests.length} طلبات
            </span>
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-[#e8594f]" />
            </div>
          ) : vipRequests.length === 0 ? (
            <div className="text-center py-10">
              <MI icon="crown" className="text-[40px] text-muted-foreground/15 mx-auto block" />
              <p className="text-xs text-muted-foreground/50 mt-2">لا توجد طلبات</p>
            </div>
          ) : (
            <div className="space-y-3">
              {vipRequests.slice(0, 5).map((req: any) => (
                <div key={req.id} className="rounded-xl bg-[#0c0c18] border border-white/[0.05] p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: getAvatarColor(req.user_name) }}>
                      <span className="text-white text-sm font-bold">{(req.user_name || "?")[0]}</span>
                    </div>

                    {/* Name + UUID */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-bold text-foreground">{req.user_name || "—"}</p>
                      <p className="text-[10px] text-muted-foreground/50 font-mono">UUID: {req.user_uuid}</p>
                    </div>

                    {/* VIP + duration */}
                    <div className="text-left flex-shrink-0 space-y-0.5">
                      <p className="text-[12px] font-bold text-[#e8594f]">VIP {req.vip_level}</p>
                      <p className="text-[10px] text-muted-foreground/50">{req.request_month}</p>
                    </div>
                  </div>

                  {req.recipient_uuid && (
                    <p className="text-[9px] text-amber-400/60 mr-[52px]">🎁 إهداء → {req.recipient_uuid}</p>
                  )}

                  {/* Accept / Reject */}
                  <div className="flex gap-2">
                    <button className="flex-1 h-9 rounded-lg bg-[#4a9fd5] hover:bg-[#5ab0e6] text-white text-[11px] font-bold transition-colors">
                      قبول
                    </button>
                    <button className="flex-1 h-9 rounded-lg bg-[#e8594f]/15 hover:bg-[#e8594f]/25 text-[#e8594f] text-[11px] font-bold transition-colors">
                      رفض
                    </button>
                  </div>
                </div>
              ))}

              {vipRequests.length > 5 && (
                <button className="w-full flex items-center justify-center gap-1 text-[11px] text-muted-foreground/50 hover:text-muted-foreground py-2 transition-colors">
                  عرض الكل
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════
            ██  OPERATIONS LOG
            ═══════════════════════════════════════════ */}
        <div className="rounded-2xl bg-[#161625] border border-white/[0.07] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MI icon="history" className="text-[22px] text-muted-foreground/70" />
              <h2 className="text-[13px] font-bold text-foreground">سجل العمليات الأخير</h2>
            </div>
            <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[10px] text-muted-foreground/60 hover:bg-white/[0.07] transition-colors">
              <MI icon="filter_alt" className="text-[14px]" />
              فلترة
            </button>
          </div>

          {/* Table header */}
          <div className="grid grid-cols-[1fr_60px_55px_55px] gap-2 px-1 pb-2 border-b border-white/[0.06]">
            <span className="text-[10px] text-muted-foreground/50 font-medium">المستخدم</span>
            <span className="text-[10px] text-muted-foreground/50 font-medium text-center">المستوى</span>
            <span className="text-[10px] text-muted-foreground/50 font-medium text-center">المدة</span>
            <span className="text-[10px] text-muted-foreground/50 font-medium text-center">بواسطة</span>
          </div>

          {vipRequests.slice(0, 10).map((req: any, idx: number) => (
            <div key={req.id}
              className={`grid grid-cols-[1fr_60px_55px_55px] gap-2 items-center px-1 py-3 ${
                idx < Math.min(vipRequests.length, 10) - 1 ? "border-b border-white/[0.04]" : ""
              }`}>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: getAvatarColor(req.user_name) }}>
                  <span className="text-white text-[11px] font-bold">{(req.user_name || "?")[0]}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-foreground truncate">{req.user_name || "—"}</p>
                  <p className="text-[9px] text-muted-foreground/40 font-mono">UUID: {req.user_uuid}</p>
                </div>
              </div>
              <p className="text-[11px] font-bold text-[#e8594f] text-center">VIP {req.vip_level}</p>
              <p className="text-[9px] text-muted-foreground/50 text-center leading-tight">{req.request_month}</p>
              <p className="text-[9px] text-muted-foreground/40 text-center">—</p>
            </div>
          ))}
        </div>

        {/* ─── Top Agents ─── */}
        <AdminTopAgents readOnly={isModeratorRole} />
      </div>
    </AdminPageLayout>
  );
};

export default AdminVipPage;
