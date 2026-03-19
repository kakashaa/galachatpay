import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useConfirmModal } from "@/hooks/use-confirm-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Trash2, Save, X, Loader2, Eye, EyeOff, UserPlus, Shield,
  Clock, Phone, Pencil, Snowflake, Activity,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface AdminAccount {
  id: string;
  username: string;
  display_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
  permissions: any;
}

interface ShiftInfo {
  admin_username: string;
  admin_display_name: string;
  shift_start: string;
  shift_end: string;
  phone_number: string | null;
  is_active: boolean;
  role_type: string;
}

interface Props {
  adminCall: (action: string, data?: any) => Promise<any>;
}

const AdminModeratorManager: React.FC<Props> = ({ adminCall }) => {
  const { confirm, ConfirmDialog } = useConfirmModal();
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [shifts, setShifts] = useState<ShiftInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [newName, setNewName] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newRole, setNewRole] = useState<"super_admin" | "admin">("admin");
  const [newShiftStart, setNewShiftStart] = useState("09:00");
  const [newShiftEnd, setNewShiftEnd] = useState("17:00");

  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<"super_admin" | "admin">("admin");
  const [editShiftStart, setEditShiftStart] = useState("");
  const [editShiftEnd, setEditShiftEnd] = useState("");
  const [editPassword, setEditPassword] = useState("");

  const loadAdmins = useCallback(async () => {
    setLoading(true);
    try {
      const [accountsRes, shiftsRes] = await Promise.all([
        supabase.from("admin_accounts").select("*").order("role", { ascending: true }),
        supabase.from("admin_shifts").select("*"),
      ]);
      if (accountsRes.error) throw accountsRes.error;
      if (shiftsRes.error) throw shiftsRes.error;
      setAdmins(accountsRes.data || []);
      setShifts(shiftsRes.data || []);
    } catch (err: any) {
      toast.error(err?.message || "فشل تحميل قائمة الأدمن");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAdmins(); }, [loadAdmins]);

  const getShift = (username: string) => shifts.find(s => s.admin_username === username);

  const handleAdd = async () => {
    const uname = newUsername.trim() || newName.trim().toLowerCase().replace(/\s+/g, "_");
    if (!newName.trim() || !uname) { toast.error("الاسم مطلوب"); return; }
    setActionLoading(true);
    try {
      const { error } = await supabase.from("admin_accounts").insert({
        username: uname,
        display_name: newName.trim(),
        role: newRole,
        password_hash: "1122",
        is_active: true,
        permissions: {},
      });
      if (error) throw error;

      // Also create shift entry
      await supabase.from("admin_shifts").upsert({
        admin_username: uname,
        admin_display_name: newName.trim(),
        shift_start: newShiftStart,
        shift_end: newShiftEnd,
        role_type: newRole,
        is_active: true,
      }, { onConflict: "admin_username" });

      toast.success(`تمت إضافة ${newName.trim()} (كلمة المرور: 1122)`);
      setShowAdd(false);
      setNewName(""); setNewUsername(""); setNewRole("admin");
      setNewShiftStart("09:00"); setNewShiftEnd("17:00");
      loadAdmins();
    } catch (err: any) {
      toast.error(err?.message || "فشل الإضافة");
    } finally { setActionLoading(false); }
  };

  const handleUpdate = async (admin: AdminAccount) => {
    setActionLoading(true);
    try {
      const updateData: any = {
        display_name: editName.trim() || admin.display_name,
        role: editRole,
      };
      if (editPassword.trim()) updateData.password_hash = editPassword.trim();

      const { error } = await supabase.from("admin_accounts").update(updateData).eq("id", admin.id);
      if (error) throw error;

      // Update shift
      await supabase.from("admin_shifts").upsert({
        admin_username: admin.username,
        admin_display_name: editName.trim() || admin.display_name,
        shift_start: editShiftStart || "09:00",
        shift_end: editShiftEnd || "17:00",
        role_type: editRole,
      }, { onConflict: "admin_username" });

      toast.success("تم تحديث الأدمن");
      setEditingId(null); setEditPassword("");
      loadAdmins();
    } catch (err: any) {
      toast.error(err?.message || "فشل التحديث");
    } finally { setActionLoading(false); }
  };

  const handleToggleActive = async (admin: AdminAccount) => {
    try {
      const { error } = await supabase.from("admin_accounts").update({ is_active: !admin.is_active }).eq("id", admin.id);
      if (error) throw error;
      toast.success(admin.is_active ? "تم تجميد الحساب" : "تم تفعيل الحساب");
      loadAdmins();
    } catch (err: any) { toast.error(err?.message || "فشل التحديث"); }
  };

  const handleDelete = async (admin: AdminAccount) => {
    if (admin.role === "owner") { toast.error("لا يمكن حذف حساب المالك"); return; }
    const ok = await confirm({ title: "حذف حساب", message: `هل تريد حذف حساب ${admin.display_name}؟`, danger: true, confirmText: "حذف" });
    if (!ok) return;
    try {
      const { error } = await supabase.from("admin_accounts").delete().eq("id", admin.id);
      if (error) throw error;
      toast.success("تم حذف الحساب");
      loadAdmins();
    } catch (err: any) { toast.error(err?.message || "فشل الحذف"); }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "owner": return { label: "Owner", cls: "bg-primary/10 text-primary border-primary/20" };
      case "super_admin": return { label: "سوبر أدمن", cls: "bg-amber-500/10 text-amber-400 border-amber-500/20" };
      default: return { label: "أدمن", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" };
    }
  };

  const isInShift = (username: string) => {
    const shift = getShift(username);
    if (!shift?.shift_start || !shift?.shift_end) return false;
    const now = new Date();
    const riyadhTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Riyadh" }));
    const currentMinutes = riyadhTime.getHours() * 60 + riyadhTime.getMinutes();
    const [sh, sm] = shift.shift_start.split(":").map(Number);
    const [eh, em] = shift.shift_end.split(":").map(Number);
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;
    if (endMin > startMin) return currentMinutes >= startMin && currentMinutes < endMin;
    return currentMinutes >= startMin || currentMinutes < endMin;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Button onClick={() => setShowAdd(!showAdd)} className="w-full" variant={showAdd ? "outline" : "default"}>
        {showAdd ? <><X className="w-4 h-4 ml-2" />إلغاء</> : <><UserPlus className="w-4 h-4 ml-2" />إضافة أدمن جديد</>}
      </Button>

      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="bg-card border rounded-xl p-4 space-y-3">
            <Input placeholder="الاسم المعروض (بالعربي)" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <Input placeholder="اسم المستخدم (إنجليزي)" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} dir="ltr" />
            <div className="flex gap-2">
              <button onClick={() => setNewRole("admin")} className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${newRole === "admin" ? "border-emerald-500 bg-emerald-500/10 text-emerald-400" : "border-border/40"}`}>أدمن عادي</button>
              <button onClick={() => setNewRole("super_admin")} className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${newRole === "super_admin" ? "border-amber-500 bg-amber-500/10 text-amber-400" : "border-border/40"}`}>سوبر أدمن</button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">بداية الدوام</label>
                <Input type="time" value={newShiftStart} onChange={(e) => setNewShiftStart(e.target.value)} dir="ltr" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">نهاية الدوام</label>
                <Input type="time" value={newShiftEnd} onChange={(e) => setNewShiftEnd(e.target.value)} dir="ltr" />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">كلمة المرور الافتراضية: <span className="font-mono font-bold">1122</span> (سيُجبر على تغييرها عند أول دخول)</p>
            <Button onClick={handleAdd} disabled={actionLoading} className="w-full">
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Save className="w-4 h-4 ml-2" />}حفظ
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {admins.length === 0 && !showAdd && (
        <div className="text-center py-10 text-muted-foreground">
          <Shield className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p>لا يوجد أدمن</p>
        </div>
      )}

      {admins.map((admin) => {
        const roleBadge = getRoleBadge(admin.role);
        const inShift = isInShift(admin.username);
        const isOwnerAccount = admin.role === "owner";
        const shift = getShift(admin.username);

        return (
          <motion.div key={admin.id} layout className={`bg-card border rounded-xl overflow-hidden ${!admin.is_active ? "opacity-60" : ""}`}>
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`relative w-10 h-10 rounded-xl flex items-center justify-center ${admin.is_active ? "bg-primary/10" : "bg-muted"}`}>
                  <Shield className={`w-5 h-5 ${admin.is_active ? "text-primary" : "text-muted-foreground"}`} />
                  {inShift && admin.is_active && <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-card" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm">{admin.display_name || admin.username}</p>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold border ${roleBadge.cls}`}>{roleBadge.label}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-muted-foreground font-mono">@{admin.username}</span>
                    {shift && (
                      <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {shift.shift_start?.slice(0, 5)} - {shift.shift_end?.slice(0, 5)}
                      </span>
                    )}
                    {inShift && admin.is_active && <span className="text-[9px] text-emerald-400 font-bold">أونلاين</span>}
                  </div>
                </div>
              </div>
              {!isOwnerAccount && (
                <div className="flex items-center gap-1">
                  <button onClick={() => setDetailId(detailId === admin.id ? null : admin.id)} className="p-2 rounded-lg hover:bg-muted">
                    <Activity className="w-4 h-4 text-blue-400" />
                  </button>
                  <button onClick={() => {
                    if (editingId === admin.id) { setEditingId(null); } else {
                      setEditingId(admin.id);
                      setEditName(admin.display_name);
                      setEditRole(admin.role as "super_admin" | "admin");
                      setEditShiftStart(shift?.shift_start?.slice(0, 5) || "");
                      setEditShiftEnd(shift?.shift_end?.slice(0, 5) || "");
                      setEditPassword("");
                    }
                  }} className="p-2 rounded-lg hover:bg-muted">
                    <Pencil className="w-4 h-4 text-primary" />
                  </button>
                  <button onClick={() => handleToggleActive(admin)} className="p-2 rounded-lg hover:bg-muted">
                    {admin.is_active ? <Snowflake className="w-4 h-4 text-blue-400" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
                  </button>
                  <button onClick={() => handleDelete(admin)} className="p-2 rounded-lg hover:bg-destructive/10">
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </button>
                </div>
              )}
            </div>

            <div className="px-4 pb-3 flex items-center gap-3 text-[10px] text-muted-foreground">
              {shift?.phone_number && (
                <span className="flex items-center gap-0.5"><Phone className="w-3 h-3" /><span dir="ltr">{shift.phone_number}</span></span>
              )}
              <span>تاريخ الإنشاء: {new Date(admin.created_at).toLocaleDateString("ar-EG")}</span>
            </div>

            <AnimatePresence>
              {detailId === admin.id && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="border-t border-border p-4 space-y-2">
                  <p className="text-xs font-bold text-foreground mb-2">معلومات الحساب</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-muted/20 rounded-lg p-2 text-center">
                      <p className="text-sm font-bold">{admin.role}</p>
                      <p className="text-[10px] text-muted-foreground">الصلاحية</p>
                    </div>
                    <div className="bg-muted/20 rounded-lg p-2 text-center">
                      <p className="text-sm font-bold">{admin.is_active ? "نشط" : "مجمّد ❄"}</p>
                      <p className="text-[10px] text-muted-foreground">الحالة</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    {inShift && admin.is_active
                      ? <>ملتزم بوقت الدوام</>
                      : <><span className="text-amber-400"></span> خارج وقت الدوام</>}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {editingId === admin.id && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="border-t border-border p-4 space-y-3">
                  <Input placeholder="الاسم المعروض" value={editName} onChange={(e) => setEditName(e.target.value)} />
                  <div className="flex gap-2">
                    <button onClick={() => setEditRole("admin")} className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${editRole === "admin" ? "border-emerald-500 bg-emerald-500/10 text-emerald-400" : "border-border/40"}`}>أدمن عادي</button>
                    <button onClick={() => setEditRole("super_admin")} className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${editRole === "super_admin" ? "border-amber-500 bg-amber-500/10 text-amber-400" : "border-border/40"}`}>سوبر أدمن</button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-muted-foreground mb-1 block">بداية الدوام</label>
                      <Input type="time" value={editShiftStart} onChange={(e) => setEditShiftStart(e.target.value)} dir="ltr" />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground mb-1 block">نهاية الدوام</label>
                      <Input type="time" value={editShiftEnd} onChange={(e) => setEditShiftEnd(e.target.value)} dir="ltr" />
                    </div>
                  </div>
                  <Input type="password" placeholder="كلمة مرور جديدة (اتركه فارغ للإبقاء)" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} dir="ltr" />
                  <div className="flex gap-2">
                    <Button onClick={() => handleUpdate(admin)} disabled={actionLoading} className="flex-1">
                      {actionLoading ? <Loader2 className="w-4 h-4 animate-spin ml-1" /> : <Save className="w-4 h-4 ml-1" />}حفظ
                    </Button>
                    <Button onClick={() => setEditingId(null)} variant="outline" className="flex-1"><X className="w-4 h-4 ml-1" />إلغاء</Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
};

export default AdminModeratorManager;
