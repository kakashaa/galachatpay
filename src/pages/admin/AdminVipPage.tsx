import React, { useState, useEffect } from "react";
import { useAdminSession } from "@/hooks/use-admin-session";
import AdminPageLayout from "@/components/AdminPageLayout";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Star, Loader2, Check, X, Clock } from "lucide-react";
import { motion } from "framer-motion";
import AdminTopAgents from "@/components/AdminTopAgents";

const tabs = ["إرسال VIP", "الطلبات", "TOP وكلاء"];

const AdminVipPage: React.FC = () => {
  const { adminCall, handleLogout, isModeratorRole } = useAdminSession();
  const [loading, setLoading] = useState(false);
  const [vipRequests, setVipRequests] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState(0);

  // Send VIP form
  const [vipUuid, setVipUuid] = useState("");
  const [vipLevel, setVipLevel] = useState(1);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (activeTab === 1) loadRequests();
  }, [activeTab]);

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
    <AdminPageLayout title="إدارة VIP" onLogout={handleLogout}>
      <div className="max-w-[448px] mx-auto px-4 pt-4 space-y-4" dir="rtl">
        {/* Tabs */}
        <div className="flex gap-1 bg-muted rounded-xl p-1">
          {tabs.map((tab, i) => (
            <button
              key={tab}
              onClick={() => setActiveTab(i)}
              className={`flex-1 h-9 rounded-lg text-xs font-bold transition-all ${
                activeTab === i ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Send VIP Tab */}
        {activeTab === 0 && (
          <div className="space-y-4">
            <input
              value={vipUuid}
              onChange={(e) => setVipUuid(e.target.value)}
              placeholder="رقم UUID"
              className="w-full h-12 bg-muted rounded-xl pr-4 pl-4 text-sm placeholder:text-muted-foreground border border-border focus:outline-none focus:border-admin-amber transition-colors tabular-nums"
              dir="ltr"
            />
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">مستوى VIP</p>
              <div className="grid grid-cols-6 gap-2">
                {[1, 2, 3, 4, 5, 6].map((level) => (
                  <button
                    key={level}
                    onClick={() => setVipLevel(level)}
                    className={`h-11 rounded-xl text-sm font-bold transition-all ${
                      vipLevel === level
                        ? "bg-admin-amber text-background"
                        : "bg-muted text-muted-foreground border border-border"
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={sendVip}
              disabled={sending}
              className="w-full h-12 bg-admin-amber rounded-xl text-background font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {sending ? <Loader2 size={18} className="animate-spin" /> : <><Star size={18} /> إرسال VIP</>}
            </motion.button>
          </div>
        )}

        {/* Requests Tab */}
        {activeTab === 1 && (
          <div className="space-y-2">
            {loading ? (
              <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-admin-amber" /></div>
            ) : vipRequests.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground"><Star className="w-10 h-10 mx-auto mb-2 opacity-50" /><p>لا توجد طلبات VIP</p></div>
            ) : vipRequests.map((req: any) => (
              <motion.div
                key={req.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card rounded-xl border border-border p-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-admin-amber/10 flex items-center justify-center">
                      <Star size={18} className="text-admin-amber" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">{req.user_name}</p>
                      <p className="text-[10px] text-muted-foreground tabular-nums">#{req.user_uuid} · VIP {req.vip_level}</p>
                    </div>
                  </div>
                  <span className="px-2 py-1 bg-admin-amber/10 text-admin-amber text-[10px] font-bold rounded-lg border border-admin-amber/20">
                    VIP {req.vip_level}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2 tabular-nums">
                  {req.request_month} · {new Date(req.created_at).toLocaleString("ar-EG")}
                </p>
              </motion.div>
            ))}
          </div>
        )}

        {/* Top Agents Tab */}
        {activeTab === 2 && (
          <AdminTopAgents readOnly={isModeratorRole} />
        )}
      </div>
    </AdminPageLayout>
  );
};

export default AdminVipPage;
