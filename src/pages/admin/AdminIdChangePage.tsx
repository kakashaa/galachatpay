import React, { useState, useEffect } from "react";
import { useAdminSession } from "@/hooks/use-admin-session";
import AdminPageLayout from "@/components/AdminPageLayout";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Hash, Loader2, ArrowLeftRight, ClipboardList, ScrollText } from "lucide-react";
import { motion } from "framer-motion";

const AdminIdChangePage: React.FC = () => {
  const { adminCall, handleLogout } = useAdminSession();
  const [loading, setLoading] = useState(false);
  const [idChanges, setIdChanges] = useState<any[]>([]);
  const [subTab, setSubTab] = useState<"change" | "requests" | "history">("change");

  const [oldUuid, setOldUuid] = useState("");
  const [newUuid, setNewUuid] = useState("");
  const [changing, setChanging] = useState(false);

  useEffect(() => {
    if (subTab === "requests" || subTab === "history") loadData();
  }, [subTab]);

  const loadData = async () => {
    setLoading(true);
    const { data } = await supabase.from("id_changes").select("*").order("created_at", { ascending: false }).limit(100);
    setIdChanges(data || []);
    setLoading(false);
  };

  const executeChange = async () => {
    if (!oldUuid.trim() || !newUuid.trim()) { toast.error("يرجى ملء الحقلين"); return; }
    setChanging(true);
    try {
      await adminCall("admin_change_uuid", { old_uuid: oldUuid.trim(), new_uuid: newUuid.trim() });
      toast.success("تم تغيير الآيدي بنجاح");
      setOldUuid(""); setNewUuid("");
    } catch (err: any) { toast.error(err?.message || "فشل التغيير"); }
    finally { setChanging(false); }
  };

  return (
    <AdminPageLayout title="تغيير آيدي" accentColor="#8b5cf6" onLogout={handleLogout}>
      <div className="max-w-2xl mx-auto p-4 space-y-4" dir="rtl">
        {/* Tabs */}
        <div className="flex gap-1 bg-white/[0.03] rounded-xl p-1 border border-violet-500/10">
          {[
            { key: "change" as const, label: "تغيير آيدي", icon: <Hash className="w-4 h-4" /> },
            { key: "requests" as const, label: "الطلبات", icon: <ClipboardList className="w-4 h-4" /> },
            { key: "history" as const, label: "السجل", icon: <ScrollText className="w-4 h-4" /> },
          ].map(t => (
            <button key={t.key} onClick={() => setSubTab(t.key)}
              className={`flex-1 py-2.5 rounded-lg text-[11px] font-bold transition-colors flex items-center justify-center gap-1 ${subTab === t.key ? "bg-violet-500/20 text-violet-400" : "text-muted-foreground"}`}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {subTab === "change" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-gradient-to-br from-violet-500/10 to-violet-600/5 border border-violet-500/20 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2"><Hash className="w-6 h-6 text-violet-400" /><span className="text-sm font-bold text-violet-400">تغيير UUID</span></div>
            <Input placeholder="UUID القديم" value={oldUuid} onChange={e => setOldUuid(e.target.value)} className="font-mono text-sm" dir="ltr" />
            <div className="flex justify-center"><ArrowLeftRight className="w-5 h-5 text-muted-foreground" /></div>
            <Input placeholder="UUID الجديد" value={newUuid} onChange={e => setNewUuid(e.target.value)} className="font-mono text-sm" dir="ltr" />
            <Button onClick={executeChange} disabled={changing} className="w-full bg-violet-600 hover:bg-violet-700 text-white">
              {changing ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Hash className="w-4 h-4 ml-2" />تنفيذ التغيير</>}
            </Button>
          </motion.div>
        )}

        {(subTab === "requests" || subTab === "history") && (
          <div className="space-y-2">
            <p className="text-xs font-bold text-muted-foreground">{subTab === "requests" ? "طلبات التغيير" : "سجل التغييرات"}</p>
            {loading ? (
              <div className="flex items-center justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-violet-400" /></div>
            ) : idChanges.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground"><Hash className="w-10 h-10 mx-auto mb-2 opacity-50" /><p>لا توجد تغييرات</p></div>
            ) : idChanges.map((change: any) => (
              <motion.div key={change.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/20 text-violet-400">تم</span>
                    <span className="text-xs font-mono">{change.user_uuid}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{new Date(change.created_at).toLocaleDateString("ar-EG")}</span>
                </div>
                <div className="mt-1 text-[11px]">
                  <span className="text-muted-foreground">الآيدي الجديد:</span> <span className="font-mono">{change.new_id}</span>
                  <span className="text-muted-foreground mr-3">المستوى:</span> {change.level_milestone}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AdminPageLayout>
  );
};

export default AdminIdChangePage;
