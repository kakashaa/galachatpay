import React, { useState, useEffect } from "react";
import { useAdminSession } from "@/hooks/use-admin-session";
import AdminPageLayout from "@/components/AdminPageLayout";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Users, UserPlus, Shield, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { motion } from "framer-motion";

const AdminAccountsPage: React.FC = () => {
  const { adminCall, handleLogout, isOwner } = useAdminSession();
  const [loading, setLoading] = useState(true);
  const [admins, setAdmins] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ username: "", password: "", display_name: "", role: "admin" });
  const [adding, setAdding] = useState(false);

  useEffect(() => { loadAdmins(); }, []);

  const loadAdmins = async () => {
    setLoading(true);
    try {
      const data = await adminCall("admin_list");
      setAdmins(data || []);
    } catch { }
    finally { setLoading(false); }
  };

  const addAdmin = async () => {
    if (!newAdmin.username || !newAdmin.password) { toast.error("يرجى ملء الحقول"); return; }
    setAdding(true);
    try {
      await adminCall("admin_create", { username: newAdmin.username, password: newAdmin.password, display_name: newAdmin.display_name || newAdmin.username, role: newAdmin.role });
      toast.success("تم إضافة المسؤول");
      setNewAdmin({ username: "", password: "", display_name: "", role: "admin" });
      setShowAdd(false);
      loadAdmins();
    } catch (err: any) { toast.error(err?.message || "فشل الإضافة"); }
    finally { setAdding(false); }
  };

  const roleLabel = (role: string) => {
    if (role === "owner") return { text: "مالك", color: "bg-amber-500/20 text-amber-400" };
    if (role === "super_admin") return { text: "سوبر أدمن", color: "bg-violet-500/20 text-violet-400" };
    if (role === "admin") return { text: "مسؤول", color: "bg-blue-500/20 text-blue-400" };
    return { text: "مشرف", color: "bg-slate-500/20 text-slate-400" };
  };

  return (
    <AdminPageLayout title="إدارة الأدمن" accentColor="#10b981" onLogout={handleLogout}>
      <div className="max-w-2xl mx-auto p-4 space-y-4" dir="rtl">
        {isOwner && (
          <Button onClick={() => setShowAdd(!showAdd)} className={`w-full ${showAdd ? "" : "bg-emerald-600 hover:bg-emerald-700 text-white"}`} variant={showAdd ? "outline" : "default"}>
            {showAdd ? "إلغاء" : <><UserPlus className="w-4 h-4 ml-2" />إضافة مسؤول جديد</>}
          </Button>
        )}

        {showAdd && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 rounded-2xl p-5 space-y-3">
            <Input placeholder="اسم المستخدم" value={newAdmin.username} onChange={e => setNewAdmin(p => ({ ...p, username: e.target.value }))} dir="ltr" />
            <Input placeholder="كلمة المرور" type="password" value={newAdmin.password} onChange={e => setNewAdmin(p => ({ ...p, password: e.target.value }))} dir="ltr" />
            <Input placeholder="الاسم المعروض (اختياري)" value={newAdmin.display_name} onChange={e => setNewAdmin(p => ({ ...p, display_name: e.target.value }))} />
            <div className="grid grid-cols-3 gap-2">
              {["admin", "super_admin", "moderator"].map(role => (
                <button key={role} onClick={() => setNewAdmin(p => ({ ...p, role }))}
                  className={`py-2 rounded-lg border text-xs font-bold transition-all ${newAdmin.role === role ? "border-emerald-500 bg-emerald-500/15 text-emerald-400" : "border-white/10 text-muted-foreground"}`}>
                  {role === "admin" ? "مسؤول" : role === "super_admin" ? "سوبر أدمن" : "مشرف"}
                </button>
              ))}
            </div>
            <Button onClick={addAdmin} disabled={adding} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <><UserPlus className="w-4 h-4 ml-2" />إضافة</>}
            </Button>
          </motion.div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-emerald-400" /></div>
        ) : admins.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground"><Users className="w-10 h-10 mx-auto mb-2 opacity-50" /><p>لا توجد حسابات</p></div>
        ) : (
          <div className="space-y-3">
            {admins.map((admin: any, i: number) => {
              const rl = roleLabel(admin.role);
              return (
                <motion.div key={admin.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center">
                        <Shield className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-sm font-bold">{admin.display_name || admin.username}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">@{admin.username}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${rl.color}`}>{rl.text}</span>
                      <div className="flex items-center gap-1">
                        <div className={`w-2 h-2 rounded-full ${admin.is_active ? "bg-emerald-500" : "bg-rose-500"}`} />
                        <span className="text-[9px] text-muted-foreground">{admin.is_active ? "نشط" : "معطل"}</span>
                      </div>
                    </div>
                  </div>
                  {admin.created_at && (
                    <div className="flex items-center gap-1 mt-2">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <span className="text-[9px] text-muted-foreground">انضم: {new Date(admin.created_at).toLocaleDateString("ar-EG")}</span>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </AdminPageLayout>
  );
};

export default AdminAccountsPage;
