import React, { useState, useEffect } from "react";
import { useAdminSession } from "@/hooks/use-admin-session";
import AdminPageLayout from "@/components/AdminPageLayout";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Crown, Loader2, Send, Clock, Search, Filter, Star, ChevronLeft } from "lucide-react";
import AdminTopAgents from "@/components/AdminTopAgents";

const AdminVipPage: React.FC = () => {
  const { adminCall, handleLogout, isModeratorRole } = useAdminSession();
  const [loading, setLoading] = useState(false);
  const [vipRequests, setVipRequests] = useState<any[]>([]);

  // Send VIP form
  const [vipUuid, setVipUuid] = useState("");
  const [vipLevel, setVipLevel] = useState(3);
  const [vipDuration, setVipDuration] = useState("6months");
  const [sending, setSending] = useState(false);

  useEffect(() => {
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

  const getAvatarColor = (name: string) => {
    const colors = ["bg-amber-500", "bg-purple-500", "bg-sky-500", "bg-emerald-500", "bg-rose-500"];
    const idx = (name || "").charCodeAt(0) % colors.length;
    return colors[idx];
  };

  return (
    <AdminPageLayout title="إدارة VIP" accentColor="#FFD700" onLogout={handleLogout}>
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-6" dir="rtl">

        {/* ─── Page Title ─── */}
        <div className="text-center space-y-1.5">
          <h1 className="text-lg font-bold text-foreground">إدارة اشتراكات VIP</h1>
          <p className="text-[11px] text-muted-foreground">إدارة الطلبات المعلقة، منح العضويات، ومراجعة السجلات.</p>
        </div>

        {/* ─── Grant VIP Card ─── */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#1a1a2e]/60 p-5 space-y-4">
          {/* Card header */}
          <div className="flex items-center justify-center gap-2">
            <Star className="w-5 h-5 text-rose-400" fill="currentColor" />
            <h2 className="text-sm font-bold text-foreground">منح عضوية VIP جديدة</h2>
          </div>

          {/* UUID Input */}
          <div className="space-y-1.5">
            <label className="text-[11px] text-muted-foreground text-right block">معرف المستخدم (UUID)</label>
            <div className="relative">
              <Input
                placeholder="أدخل معرف المستخدم..."
                value={vipUuid}
                onChange={e => setVipUuid(e.target.value)}
                className="h-11 rounded-xl bg-[#0d0d1a] border-white/[0.08] font-mono text-sm pr-10 placeholder:text-muted-foreground/30 focus:border-rose-500/40 focus:ring-rose-500/20"
                dir="ltr"
              />
              <Search className="w-4 h-4 text-muted-foreground/30 absolute right-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* VIP Level */}
          <div className="space-y-1.5">
            <label className="text-[11px] text-muted-foreground text-right block">مستوى العضوية</label>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map(lvl => (
                <button key={lvl} onClick={() => setVipLevel(lvl)}
                  className={`py-2.5 rounded-xl text-xs font-bold transition-all
                    ${vipLevel === lvl
                      ? "bg-rose-500/90 text-white border border-rose-400/50"
                      : "bg-[#0d0d1a] border border-white/[0.08] text-muted-foreground hover:bg-white/[0.06]"}`}>
                  VIP {lvl}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[5, 6].map(lvl => (
                <button key={lvl} onClick={() => setVipLevel(lvl)}
                  className={`py-2.5 rounded-xl text-xs font-bold transition-all
                    ${vipLevel === lvl
                      ? "bg-rose-500/90 text-white border border-rose-400/50"
                      : "bg-[#0d0d1a] border border-white/[0.08] text-muted-foreground hover:bg-white/[0.06]"}`}>
                  VIP {lvl}
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div className="space-y-1.5">
            <label className="text-[11px] text-muted-foreground text-right block">مدة الاشتراك</label>
            <div className="grid grid-cols-4 gap-2">
              {durations.map(d => (
                <button key={d.key} onClick={() => setVipDuration(d.key)}
                  className={`py-2.5 rounded-xl text-[10px] font-bold transition-all
                    ${vipDuration === d.key
                      ? "bg-rose-500/90 text-white border border-rose-400/50"
                      : "bg-[#0d0d1a] border border-white/[0.08] text-muted-foreground hover:bg-white/[0.06]"}`}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <button onClick={sendVip} disabled={sending || !vipUuid.trim()}
            className="w-full h-12 rounded-2xl bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40 transition-all active:scale-[0.98]">
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4" />
                إرسال العضوية
              </>
            )}
          </button>
        </div>

        {/* ─── Pending Requests ─── */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#1a1a2e]/60 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-sky-400" />
              <h2 className="text-sm font-bold text-foreground">طلبات معلقة</h2>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-400 text-[10px] font-bold">
              {vipRequests.length} طلبات
            </span>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-rose-400" />
            </div>
          ) : vipRequests.length === 0 ? (
            <div className="text-center py-8">
              <Crown className="w-10 h-10 text-muted-foreground/20 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">لا توجد طلبات</p>
            </div>
          ) : (
            <div className="space-y-3">
              {vipRequests.slice(0, 5).map((req: any) => (
                <div key={req.id} className="rounded-xl border border-white/[0.06] bg-[#0d0d1a]/80 p-4">
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className={`w-10 h-10 rounded-full ${getAvatarColor(req.user_name)} flex items-center justify-center flex-shrink-0`}>
                      <span className="text-white text-sm font-bold">{(req.user_name || "?")[0]}</span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-foreground">{req.user_name || "—"}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">UUID: {req.user_uuid}</p>
                    </div>

                    {/* VIP badge + duration */}
                    <div className="text-left flex-shrink-0">
                      <p className="text-xs font-bold text-rose-400">VIP {req.vip_level}</p>
                      <p className="text-[10px] text-muted-foreground">{req.request_month}</p>
                    </div>
                  </div>

                  {req.recipient_uuid && (
                    <p className="text-[9px] text-amber-400/70 mt-2 mr-13">🎁 إهداء → {req.recipient_uuid}</p>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-2 mt-3">
                    <button className="flex-1 h-8 rounded-lg bg-sky-500/90 hover:bg-sky-400 text-white text-[11px] font-bold transition-colors">
                      قبول
                    </button>
                    <button className="flex-1 h-8 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 text-[11px] font-bold border border-rose-500/20 transition-colors">
                      رفض
                    </button>
                  </div>
                </div>
              ))}

              {vipRequests.length > 5 && (
                <button className="w-full flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground py-2 transition-colors">
                  عرض الكل
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* ─── Operations Log ─── */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#1a1a2e]/60 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-muted-foreground" />
              <h2 className="text-sm font-bold text-foreground">سجل العمليات الأخير</h2>
            </div>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[10px] text-muted-foreground hover:bg-white/[0.08] transition-colors">
              <Filter className="w-3 h-3" />
              فلترة
            </button>
          </div>

          {/* Table header */}
          <div className="grid grid-cols-[1fr_70px_60px_60px] gap-2 px-2 py-2 border-b border-white/[0.06]">
            <span className="text-[10px] text-muted-foreground font-medium">المستخدم</span>
            <span className="text-[10px] text-muted-foreground font-medium text-center">المستوى</span>
            <span className="text-[10px] text-muted-foreground font-medium text-center">المدة</span>
            <span className="text-[10px] text-muted-foreground font-medium text-center">بواسطة</span>
          </div>

          {/* Table rows */}
          {vipRequests.slice(0, 10).map((req: any) => (
            <div key={req.id} className="grid grid-cols-[1fr_70px_60px_60px] gap-2 items-center px-2 py-3 border-b border-white/[0.04] last:border-0">
              {/* User */}
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-8 h-8 rounded-lg ${getAvatarColor(req.user_name)} flex items-center justify-center flex-shrink-0`}>
                  <span className="text-white text-[11px] font-bold">{(req.user_name || "?")[0]}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-foreground truncate">{req.user_name || "—"}</p>
                  <p className="text-[9px] text-muted-foreground font-mono">UUID: {req.user_uuid}</p>
                </div>
              </div>

              {/* Level */}
              <p className="text-[11px] font-bold text-rose-400 text-center">VIP {req.vip_level}</p>

              {/* Duration */}
              <p className="text-[10px] text-muted-foreground text-center">{req.request_month}</p>

              {/* By */}
              <p className="text-[9px] text-muted-foreground text-center truncate">—</p>
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
