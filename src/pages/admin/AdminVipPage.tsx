import React, { useState, useEffect } from "react";
import { useAdminSession } from "@/hooks/use-admin-session";
import AdminPageLayout from "@/components/AdminPageLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Star, Loader2, Crown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AdminTopAgents from "@/components/AdminTopAgents";
import { sendUserNotification } from "@/utils/sendUserNotification";

const tabs = ["إرسال VIP", "الطلبات", "TOP وكلاء"];

const AdminVipPage: React.FC = () => {
  const { adminCall, handleLogout, isModeratorRole } = useAdminSession();
  const [loading, setLoading] = useState(false);
  const [vipRequests, setVipRequests] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [vipUuid, setVipUuid] = useState("");
  const [vipLevel, setVipLevel] = useState(1);
  const [sending, setSending] = useState(false);

  useEffect(() => { if (activeTab === 1) loadRequests(); }, [activeTab]);

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
        <div className="flex gap-1 rounded-2xl p-1" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(245,158,11,0.1)' }}>
          {tabs.map((tab, i) => (
            <motion.button
              key={tab}
              onClick={() => setActiveTab(i)}
              whileTap={{ scale: 0.96 }}
              className={`flex-1 h-10 rounded-xl text-xs font-bold transition-all ${
                activeTab === i ? "text-admin-amber" : "text-muted-foreground"
              }`}
              style={activeTab === i ? { background: 'rgba(245,158,11,0.15)', boxShadow: '0 2px 8px rgba(245,158,11,0.15)' } : {}}
            >
              {tab}
            </motion.button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Send VIP Tab */}
          {activeTab === 0 && (
            <motion.div key="send" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
              <motion.div
                className="rounded-2xl p-5 space-y-4"
                style={{ background: 'linear-gradient(145deg, rgba(245,158,11,0.08), rgba(245,158,11,0.02))', border: '1px solid rgba(245,158,11,0.12)', boxShadow: '0 8px 32px -8px rgba(245,158,11,0.1)' }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.15)' }}>
                    <Crown size={18} className="text-admin-amber" />
                  </div>
                  <span className="text-sm font-bold text-admin-amber">إرسال VIP</span>
                </div>

                <input
                  value={vipUuid}
                  onChange={(e) => setVipUuid(e.target.value)}
                  placeholder="رقم UUID"
                  className="w-full h-12 rounded-xl pr-4 pl-4 text-sm placeholder:text-muted-foreground focus:outline-none transition-all tabular-nums"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                  dir="ltr"
                />

                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">مستوى VIP</p>
                  <div className="grid grid-cols-6 gap-2">
                    {[1, 2, 3, 4, 5, 6].map((level, i) => (
                      <motion.button
                        key={level}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.04 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setVipLevel(level)}
                        className="h-11 rounded-xl text-sm font-bold transition-all"
                        style={vipLevel === level
                          ? { background: 'linear-gradient(135deg, hsl(38 92% 50%), hsl(38 92% 40%))', color: '#000', boxShadow: '0 4px 12px rgba(245,158,11,0.4)' }
                          : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: 'hsl(var(--muted-foreground))' }
                        }
                      >
                        {level}
                      </motion.button>
                    ))}
                  </div>
                </div>
              </motion.div>

              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={sendVip}
                disabled={sending}
                className="w-full h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, hsl(38 92% 50%), hsl(38 92% 40%))', color: '#000', boxShadow: '0 4px 16px rgba(245,158,11,0.35)' }}
              >
                {sending ? <Loader2 size={18} className="animate-spin" /> : <><Star size={18} /> إرسال VIP</>}
              </motion.button>
            </motion.div>
          )}

          {/* Requests Tab */}
          {activeTab === 1 && (
            <motion.div key="reqs" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-2">
              {loading ? (
                <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-admin-amber" /></div>
              ) : vipRequests.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground"><Star className="w-10 h-10 mx-auto mb-2 opacity-50" /><p>لا توجد طلبات VIP</p></div>
              ) : vipRequests.map((req: any, i: number) => (
                <motion.div
                  key={req.id}
                  initial={{ opacity: 0, y: 12, rotateX: 5 }}
                  animate={{ opacity: 1, y: 0, rotateX: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.4 }}
                  className="rounded-2xl p-3.5"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 4px 16px -4px rgba(0,0,0,0.3)' }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.12)' }}>
                        <Star size={18} className="text-admin-amber" />
                      </div>
                      <div>
                        <p className="text-sm font-bold">{req.user_name}</p>
                        <p className="text-[10px] text-muted-foreground tabular-nums">#{req.user_uuid} · VIP {req.vip_level}</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold" style={{ background: 'rgba(245,158,11,0.12)', color: 'hsl(38 92% 50%)', border: '1px solid rgba(245,158,11,0.2)' }}>
                      VIP {req.vip_level}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2 tabular-nums">
                    {req.request_month} · {new Date(req.created_at).toLocaleString("ar-EG")}
                  </p>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Top Agents Tab */}
          {activeTab === 2 && (
            <motion.div key="top" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <AdminTopAgents readOnly={isModeratorRole} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AdminPageLayout>
  );
};

export default AdminVipPage;
