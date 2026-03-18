import React, { useState, useEffect } from "react";
import { useAdminSession } from "@/hooks/use-admin-session";
import AdminPageLayout from "@/components/AdminPageLayout";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Users, UserPlus, Shield, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

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
    try { setAdmins(await adminCall("admin_list") || []); } catch { }
    finally { setLoading(false); }
  };

  const addAdmin = async () => {
    if (!newAdmin.username || !newAdmin.password) { toast.error("يرجى ملء الحقول"); return; }
    setAdding(true);
    try {
      await adminCall("admin_create", { username: newAdmin.username, password: newAdmin.password, display_name: newAdmin.display_name || newAdmin.username, role: newAdmin.role });
      toast.success("تم إضافة المسؤول");
      setNewAdmin({ username: "", password: "", display_name: "", role: "admin" }); setShowAdd(false);
      loadAdmins();
    } catch (err: any) { toast.error(err?.message || "فشل الإضافة"); }
    finally { setAdding(false); }
  };

  const roleLabel = (role: string) => {
    if (role === "owner") return { text: "مالك", bg: "rgba(245,158,11,0.12)", color: "hsl(38 92% 50%)" };
    if (role === "super_admin") return { text: "سوبر أدمن", bg: "rgba(139,92,246,0.12)", color: "hsl(271 81% 56%)" };
    if (role === "admin") return { text: "مسؤول", bg: "rgba(59,130,246,0.12)", color: "hsl(217 91% 60%)" };
    return { text: "مشرف", bg: "rgba(148,163,184,0.12)", color: "hsl(215 16% 65%)" };
  };

  const glassCard = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 4px 16px -4px rgba(0,0,0,0.3)' };

  return (
    <AdminPageLayout title="إدارة الأدمن" accentColor="hsl(160 84% 39%)" onLogout={handleLogout}>
      <div className="max-w-[448px] mx-auto p-4 space-y-4" dir="rtl">
        {isOwner && (
          <motion.button whileTap={{ scale: 0.96 }} onClick={() => setShowAdd(!showAdd)}
            className="w-full h-11 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
            style={showAdd ? { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'hsl(var(--muted-foreground))' } : { background: 'linear-gradient(135deg, hsl(160 84% 39%), hsl(160 84% 30%))', color: '#fff', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}>
            {showAdd ? "إلغاء" : <><UserPlus className="w-4 h-4" />إضافة مسؤول جديد</>}
          </motion.button>
        )}

        <AnimatePresence>
          {showAdd && (
            <motion.div initial={{ opacity: 0, y: -10, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, y: -10, height: 0 }}
              className="rounded-2xl p-5 space-y-3"
              style={{ background: 'linear-gradient(145deg, rgba(16,185,129,0.08), rgba(16,185,129,0.02))', border: '1px solid rgba(16,185,129,0.12)' }}>
              <Input placeholder="اسم المستخدم" value={newAdmin.username} onChange={e => setNewAdmin(p => ({ ...p, username: e.target.value }))} dir="ltr" />
              <Input placeholder="كلمة المرور" type="password" value={newAdmin.password} onChange={e => setNewAdmin(p => ({ ...p, password: e.target.value }))} dir="ltr" />
              <Input placeholder="الاسم المعروض (اختياري)" value={newAdmin.display_name} onChange={e => setNewAdmin(p => ({ ...p, display_name: e.target.value }))} />
              <div className="grid grid-cols-3 gap-2">
                {["admin", "super_admin", "moderator"].map(role => (
                  <motion.button key={role} whileTap={{ scale: 0.95 }} onClick={() => setNewAdmin(p => ({ ...p, role }))}
                    className="py-2 rounded-xl text-xs font-bold transition-all"
                    style={newAdmin.role === role ? { background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.15)', color: 'hsl(160 84% 39%)' } : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: 'hsl(var(--muted-foreground))' }}>
                    {role === "admin" ? "مسؤول" : role === "super_admin" ? "سوبر أدمن" : "مشرف"}
                  </motion.button>
                ))}
              </div>
              <motion.button whileTap={{ scale: 0.96 }} onClick={addAdmin} disabled={adding}
                className="w-full h-11 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, hsl(160 84% 39%), hsl(160 84% 30%))', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}>
                {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <><UserPlus className="w-4 h-4" />إضافة</>}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-admin-emerald" /></div>
        ) : admins.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground"><Users className="w-10 h-10 mx-auto mb-2 opacity-50" /><p>لا توجد حسابات</p></div>
        ) : (
          <div className="space-y-3">
            {admins.map((admin: any, i: number) => {
              const rl = roleLabel(admin.role);
              return (
                <motion.div key={admin.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className="rounded-2xl p-4" style={glassCard}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.1)' }}>
                        <Shield className="w-5 h-5 text-admin-emerald" />
                      </div>
                      <div>
                        <p className="text-sm font-bold">{admin.display_name || admin.username}</p>
                        <p className="text-[10px] text-muted-foreground tabular-nums">@{admin.username}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="px-2 py-0.5 rounded-lg text-[9px] font-bold" style={{ background: rl.bg, color: rl.color }}>{rl.text}</span>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full" style={{ background: admin.is_active ? 'hsl(160 84% 39%)' : 'hsl(350 89% 60%)' }} />
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
