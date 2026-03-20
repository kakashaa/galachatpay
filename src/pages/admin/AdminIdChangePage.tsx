import React, { useState, useEffect } from "react";
import { useAdminSession } from "@/hooks/use-admin-session";
import AdminPageLayout from "@/components/AdminPageLayout";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Hash, Loader2, ArrowLeftRight, ClipboardList, ScrollText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { sendUserNotification } from "@/utils/sendUserNotification";
import { useConfirmModal } from "@/hooks/use-confirm-modal";
import { galaApi } from "@/services/galaApi";

const AdminIdChangePage: React.FC = () => {
  const { adminCall, handleLogout } = useAdminSession();
  const [loading, setLoading] = useState(false);
  const [idChanges, setIdChanges] = useState<any[]>([]);
  const [subTab, setSubTab] = useState<"change" | "requests" | "history">("change");
  const [oldUuid, setOldUuid] = useState("");
  const [newUuid, setNewUuid] = useState("");
  const [changing, setChanging] = useState(false);

  useEffect(() => { if (subTab === "requests" || subTab === "history") loadData(); }, [subTab]);

  const loadData = async () => {
    setLoading(true);
    const { data } = await supabase.from("id_changes").select("*").order("created_at", { ascending: false }).limit(100);
    setIdChanges(data || []);
    setLoading(false);
  };

  const { confirm, ConfirmDialog } = useConfirmModal();

  const executeChange = async () => {
    if (!oldUuid.trim() || !newUuid.trim()) { toast.error("يرجى ملء الحقلين"); return; }
    const ok = await confirm({ title: "تأكيد تغيير الآيدي", message: `هل أنت متأكد من تغيير UUID ${oldUuid} إلى ${newUuid}؟`, danger: true, confirmText: "تنفيذ التغيير" });
    if (!ok) return;
    setChanging(true);
    const t = toast.loading("جاري تغيير الآيدي...");
    try {
      const data = await galaApi.changeUuid(oldUuid.trim(), newUuid.trim());
      if (!data.success) throw new Error(data.error || "فشل التغيير");
      await sendUserNotification(
        newUuid.trim(),
        "تم تغيير المعرف",
        `تم تغيير معرفك إلى ${newUuid.trim()} بنجاح!`
      );
      toast.dismiss(t);
      toast.success("تم تغيير الآيدي بنجاح");
      setOldUuid(""); setNewUuid("");
    } catch (err: any) { toast.dismiss(t); toast.error(err?.message || "فشل التغيير"); }
    finally { setChanging(false); }
  };

  const glassCard = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 4px 16px -4px rgba(0,0,0,0.3)' };

  return (
    <>
    {ConfirmDialog}
    <AdminPageLayout title="تغيير آيدي" accentColor="hsl(271 81% 56%)" onLogout={handleLogout}>
      <div className="max-w-[448px] mx-auto p-4 space-y-4" dir="rtl">
        <div className="flex gap-1 rounded-2xl p-1" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(139,92,246,0.1)' }}>
          {[
            { key: "change" as const, label: "تغيير آيدي", icon: Hash },
            { key: "requests" as const, label: "الطلبات", icon: ClipboardList },
            { key: "history" as const, label: "السجل", icon: ScrollText },
          ].map(t => {
            const Icon = t.icon;
            return (
              <motion.button key={t.key} onClick={() => setSubTab(t.key)} whileTap={{ scale: 0.96 }}
                className={`flex-1 py-2.5 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1 ${subTab === t.key ? "text-admin-purple" : "text-muted-foreground"}`}
                style={subTab === t.key ? { background: 'rgba(139,92,246,0.12)', boxShadow: '0 2px 8px rgba(139,92,246,0.15)' } : {}}>
                <Icon className="w-4 h-4" />{t.label}
              </motion.button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {subTab === "change" && (
            <motion.div key="change" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="rounded-2xl p-5 space-y-4"
              style={{ background: 'linear-gradient(145deg, rgba(139,92,246,0.08), rgba(139,92,246,0.02))', border: '1px solid rgba(139,92,246,0.12)', boxShadow: '0 8px 32px -8px rgba(139,92,246,0.1)' }}>
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.15)' }}>
                  <Hash className="w-5 h-5 text-admin-purple" />
                </div>
                <span className="text-sm font-bold text-admin-purple">تغيير UUID</span>
              </div>
              <input placeholder="UUID القديم" value={oldUuid} onChange={e => setOldUuid(e.target.value)}
                className="w-full h-12 rounded-xl px-4 text-sm tabular-nums focus:outline-none" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} dir="ltr" />
              <div className="flex justify-center">
                <motion.div animate={{ rotate: [0, 180, 360] }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
                  <ArrowLeftRight className="w-5 h-5 text-admin-purple" />
                </motion.div>
              </div>
              <input placeholder="UUID الجديد" value={newUuid} onChange={e => setNewUuid(e.target.value)}
                className="w-full h-12 rounded-xl px-4 text-sm tabular-nums focus:outline-none" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} dir="ltr" />
              <motion.button whileTap={{ scale: 0.96 }} onClick={executeChange} disabled={changing}
                className="w-full h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-2 text-white disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, hsl(271 81% 56%), hsl(271 81% 46%))', boxShadow: '0 4px 16px rgba(139,92,246,0.35)' }}>
                {changing ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Hash className="w-4 h-4" />تنفيذ التغيير</>}
              </motion.button>
            </motion.div>
          )}

          {(subTab === "requests" || subTab === "history") && (
            <motion.div key="list" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-2">
              <p className="text-xs font-bold text-muted-foreground">{subTab === "requests" ? "طلبات التغيير" : "سجل التغييرات"}</p>
              {loading ? (
                <div className="flex items-center justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-admin-purple" /></div>
              ) : idChanges.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground"><Hash className="w-10 h-10 mx-auto mb-2 opacity-50" /><p>لا توجد تغييرات</p></div>
              ) : idChanges.map((change: any, i: number) => (
                <motion.div key={change.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  className="rounded-2xl p-3.5" style={glassCard}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold" style={{ background: 'rgba(139,92,246,0.12)', color: 'hsl(271 81% 56%)' }}>تم</span>
                      <span className="text-xs tabular-nums">{change.user_uuid}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{new Date(change.created_at).toLocaleDateString("ar-EG")}</span>
                  </div>
                  <div className="mt-1 text-[11px]">
                    <span className="text-muted-foreground">الآيدي الجديد:</span> <span className="tabular-nums">{change.new_id}</span>
                    <span className="text-muted-foreground mr-3">المستوى:</span> {change.level_milestone}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AdminPageLayout>
    </>
  );
};

export default AdminIdChangePage;
