import React, { useState, useEffect } from "react";
import { useAdminSession } from "@/hooks/use-admin-session";
import AdminPageLayout from "@/components/AdminPageLayout";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Crown, Loader2, Star, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import AdminTopAgents from "@/components/AdminTopAgents";

const AdminVipPage: React.FC = () => {
  const { adminCall, handleLogout, isModeratorRole } = useAdminSession();
  const [loading, setLoading] = useState(false);
  const [vipRequests, setVipRequests] = useState<any[]>([]);
  const [subTab, setSubTab] = useState<"send" | "requests" | "top_agents">("send");

  // Send VIP form
  const [vipUuid, setVipUuid] = useState("");
  const [vipLevel, setVipLevel] = useState(1);
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

  return (
    <AdminPageLayout title="إدارة VIP" accentColor="#FFD700" onLogout={handleLogout}>
      <div className="max-w-2xl mx-auto p-4 space-y-4" dir="rtl">
        {/* Sub-tabs */}
        <div className="flex gap-1 bg-white/[0.03] rounded-xl p-1 border border-amber-500/10">
          {[
            { key: "send" as const, label: "إرسال VIP" },
            { key: "requests" as const, label: "الطلبات" },
            { key: "top_agents" as const, label: "TOP وكلاء" },
          ].map(t => (
            <button key={t.key} onClick={() => setSubTab(t.key)}
              className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-colors ${subTab === t.key ? "bg-amber-500/20 text-amber-400" : "text-muted-foreground"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {subTab === "send" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Crown className="w-6 h-6 text-amber-400" />
                <span className="text-sm font-bold text-amber-400">إرسال VIP</span>
              </div>
              <Input placeholder="معرف المستخدم (UUID)" value={vipUuid} onChange={e => setVipUuid(e.target.value)} className="font-mono" dir="ltr" />
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">مستوى VIP</label>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3, 4, 5, 6].map(lvl => (
                    <button key={lvl} onClick={() => setVipLevel(lvl)}
                      className={`py-3 rounded-xl border text-sm font-bold transition-all ${vipLevel === lvl ? "border-amber-500 bg-amber-500/15 text-amber-400" : "border-white/10 text-muted-foreground"}`}>
                      VIP {lvl}
                    </button>
                  ))}
                </div>
              </div>
              <Button onClick={sendVip} disabled={sending} className="w-full bg-amber-600 hover:bg-amber-700 text-white">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Crown className="w-4 h-4 ml-2" />إرسال VIP</>}
              </Button>
            </div>
          </motion.div>
        )}

        {subTab === "requests" && (
          <div className="space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-amber-400" /></div>
            ) : vipRequests.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground"><Crown className="w-10 h-10 mx-auto mb-2 opacity-50" /><p>لا توجد طلبات VIP</p></div>
            ) : vipRequests.map((req: any) => (
              <div key={req.id} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold">{req.user_name}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{req.user_uuid}</p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold">VIP {req.vip_level}</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">{req.request_month} • {new Date(req.created_at).toLocaleString("ar-EG")}</p>
              </div>
            ))}
          </div>
        )}

        {subTab === "top_agents" && (
          <AdminTopAgents readOnly={isModeratorRole} />
        )}
      </div>
    </AdminPageLayout>
  );
};

export default AdminVipPage;
