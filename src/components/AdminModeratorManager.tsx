import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Trash2, Save, X, Loader2, Eye, EyeOff, UserPlus, Shield, Settings,
  ClipboardList, Sparkles, Frame, Scissors, Gift, DollarSign, Video, ShieldBan, Ban,
  Bell, Camera, Star, MessageSquare, Headset, Zap, Hash, Crown, Briefcase,
  Pencil,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ModeratorAccount {
  id: string;
  username: string;
  display_name: string;
  role: string;
  is_active: boolean;
  permissions: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

// All available tab permissions
const ALL_PERMISSIONS: { key: string; label: string; icon: React.ReactNode }[] = [
  { key: "all_requests", label: "جميع الطلبات", icon: <ClipboardList className="w-4 h-4" /> },
  { key: "entries", label: "دخوليات", icon: <Sparkles className="w-4 h-4" /> },
  { key: "frames", label: "إطارات", icon: <Frame className="w-4 h-4" /> },
  { key: "hairs", label: "شعرات", icon: <Scissors className="w-4 h-4" /> },
  { key: "gifts", label: "إهداءات نجوم", icon: <Gift className="w-4 h-4" /> },
  { key: "salary", label: "رواتب", icon: <DollarSign className="w-4 h-4" /> },
  { key: "claims", label: "طلبات", icon: <ClipboardList className="w-4 h-4" /> },
  { key: "videos", label: "فيديوهات", icon: <Video className="w-4 h-4" /> },
  { key: "reports", label: "بلاغات", icon: <ShieldBan className="w-4 h-4" /> },
  { key: "blocks", label: "محظورين", icon: <Ban className="w-4 h-4" /> },
  { key: "notifications", label: "إشعارات", icon: <Bell className="w-4 h-4" /> },
  { key: "animated_photos", label: "صور متحركة", icon: <Camera className="w-4 h-4" /> },
  { key: "admin_stars", label: "منح نجوم", icon: <Star className="w-4 h-4" /> },
  { key: "support_tickets", label: "تكتات الدعم", icon: <MessageSquare className="w-4 h-4" /> },
  { key: "support_chats", label: "شات VIP", icon: <Headset className="w-4 h-4" /> },
  { key: "quick_support", label: "دعم سريع", icon: <Zap className="w-4 h-4" /> },
  { key: "id_changes", label: "تغيير آيدي", icon: <Hash className="w-4 h-4" /> },
  { key: "top_agents", label: "TOP وكلاء", icon: <Crown className="w-4 h-4" /> },
  { key: "bd_management", label: "إدارة BD", icon: <Briefcase className="w-4 h-4" /> },
];

// Helper: check if a permission key is enabled (either "key" or "key:view")
function isPermEnabled(perms: string[], key: string): boolean {
  return perms.includes(key) || perms.includes(`${key}:view`);
}

// Helper: check if a permission is view-only
function isViewOnly(perms: string[], key: string): boolean {
  return perms.includes(`${key}:view`);
}

// Helper: toggle permission on/off (defaults to full access when enabling)
function togglePerm(perms: string[], key: string): string[] {
  if (isPermEnabled(perms, key)) {
    return perms.filter(p => p !== key && p !== `${key}:view`);
  }
  return [...perms, key];
}

// Helper: toggle between full and view-only
function toggleAccessLevel(perms: string[], key: string): string[] {
  if (perms.includes(`${key}:view`)) {
    return perms.map(p => p === `${key}:view` ? key : p);
  }
  return perms.map(p => p === key ? `${key}:view` : p);
}

// Helper: select all as full access
function selectAllFull(): string[] {
  return ALL_PERMISSIONS.map(p => p.key);
}

interface Props {
  adminCall: (action: string, data?: any) => Promise<any>;
}

const AdminModeratorManager: React.FC<Props> = ({ adminCall }) => {
  const [moderators, setModerators] = useState<ModeratorAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // New moderator form
  const [newUsername, setNewUsername] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPermissions, setNewPermissions] = useState<string[]>([]);

  // Edit permissions
  const [editPermissions, setEditPermissions] = useState<string[]>([]);
  const [editPassword, setEditPassword] = useState("");
  const [editDisplayName, setEditDisplayName] = useState("");

  const loadModerators = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminCall("list_moderators");
      setModerators(data || []);
    } catch (err: any) {
      toast.error(err?.message || "فشل تحميل المسؤولين");
    } finally {
      setLoading(false);
    }
  }, [adminCall]);

  useEffect(() => {
    loadModerators();
  }, [loadModerators]);

  const handleAdd = async () => {
    if (!newUsername.trim() || !newPassword.trim()) {
      toast.error("اسم المستخدم وكلمة المرور مطلوبان");
      return;
    }
    if (newPermissions.length === 0) {
      toast.error("يرجى اختيار صلاحية واحدة على الأقل");
      return;
    }
    setActionLoading(true);
    try {
      await adminCall("add_moderator", {
        username: newUsername.trim().toLowerCase(),
        display_name: newDisplayName.trim() || newUsername.trim(),
        password: newPassword,
        permissions: newPermissions,
      });
      toast.success("تمت إضافة المسؤول بنجاح");
      setShowAdd(false);
      setNewUsername("");
      setNewDisplayName("");
      setNewPassword("");
      setNewPermissions([]);
      loadModerators();
    } catch (err: any) {
      toast.error(err?.message || "فشل الإضافة");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdate = async (mod: ModeratorAccount) => {
    setActionLoading(true);
    try {
      const updateData: any = {
        id: mod.id,
        permissions: editPermissions,
        display_name: editDisplayName.trim() || mod.display_name,
      };
      if (editPassword.trim()) {
        updateData.password = editPassword.trim();
      }
      await adminCall("update_moderator", updateData);
      toast.success("تم تحديث المسؤول");
      setEditingId(null);
      setEditPassword("");
      loadModerators();
    } catch (err: any) {
      toast.error(err?.message || "فشل التحديث");
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleActive = async (mod: ModeratorAccount) => {
    try {
      await adminCall("toggle_moderator", { id: mod.id, is_active: !mod.is_active });
      toast.success(mod.is_active ? "تم تعطيل الحساب" : "تم تفعيل الحساب");
      loadModerators();
    } catch (err: any) {
      toast.error(err?.message || "فشل التحديث");
    }
  };

  const handleDelete = async (mod: ModeratorAccount) => {
    if (!confirm(`هل تريد حذف حساب ${mod.display_name}؟`)) return;
    try {
      await adminCall("delete_moderator", { id: mod.id });
      toast.success("تم حذف الحساب");
      loadModerators();
    } catch (err: any) {
      toast.error(err?.message || "فشل الحذف");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const renderPermissionsGrid = (perms: string[], setPerms: (p: string[]) => void) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-foreground">الصلاحيات</p>
        <div className="flex gap-2">
          <button onClick={() => setPerms(selectAllFull())} className="text-[10px] text-primary hover:underline">تحديد الكل</button>
          <button onClick={() => setPerms([])} className="text-[10px] text-muted-foreground hover:underline">إلغاء الكل</button>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-2">
        {ALL_PERMISSIONS.map((perm) => {
          const enabled = isPermEnabled(perms, perm.key);
          const viewOnly = isViewOnly(perms, perm.key);
          return (
            <div
              key={perm.key}
              className={`flex items-center justify-between p-2.5 rounded-lg border transition-all ${
                enabled
                  ? "border-primary bg-primary/5"
                  : "border-border/40 hover:border-border"
              }`}
            >
              <button
                onClick={() => setPerms(togglePerm(perms, perm.key))}
                className="flex items-center gap-2 flex-1 min-w-0"
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                  enabled ? "bg-primary border-primary" : "border-muted-foreground/40"
                }`}>
                  {enabled && <span className="text-primary-foreground text-[10px] font-bold">✓</span>}
                </div>
                <span className={`flex items-center gap-1.5 text-xs font-medium ${enabled ? "text-foreground" : "text-muted-foreground"}`}>
                  {perm.icon}
                  {perm.label}
                </span>
              </button>
              {enabled && (
                <button
                  onClick={() => setPerms(toggleAccessLevel(perms, perm.key))}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold transition-all ${
                    viewOnly
                      ? "bg-amber-500/10 text-amber-600 border border-amber-500/30"
                      : "bg-green-500/10 text-green-600 border border-green-500/30"
                  }`}
                >
                  {viewOnly ? (
                    <><Eye className="w-3 h-3" />مشاهدة</>
                  ) : (
                    <><Pencil className="w-3 h-3" />تصرف</>
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Add Button */}
      <Button onClick={() => setShowAdd(!showAdd)} className="w-full" variant={showAdd ? "outline" : "default"}>
        {showAdd ? <><X className="w-4 h-4 ml-2" />إلغاء</> : <><UserPlus className="w-4 h-4 ml-2" />إضافة مسؤول جديد</>}
      </Button>

      {/* Add Form */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-card border rounded-xl p-4 space-y-3"
          >
            <Input
              placeholder="اسم المستخدم (إنجليزي)"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
              dir="ltr"
            />
            <Input
              placeholder="الاسم المعروض (عربي أو إنجليزي)"
              value={newDisplayName}
              onChange={(e) => setNewDisplayName(e.target.value)}
            />
            <Input
              type="password"
              placeholder="كلمة المرور"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              dir="ltr"
            />

            {renderPermissionsGrid(newPermissions, setNewPermissions)}

            <Button onClick={handleAdd} disabled={actionLoading} className="w-full">
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Save className="w-4 h-4 ml-2" />}
              حفظ
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Moderators List */}
      {moderators.length === 0 && !showAdd && (
        <div className="text-center py-10 text-muted-foreground">
          <Shield className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p>لا يوجد مسؤولين فرعيين</p>
        </div>
      )}

      {moderators.map((mod) => (
        <motion.div
          key={mod.id}
          layout
          className={`bg-card border rounded-xl overflow-hidden ${!mod.is_active ? "opacity-60" : ""}`}
        >
          {/* Header */}
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${mod.is_active ? "bg-primary/10" : "bg-muted"}`}>
                <Shield className={`w-5 h-5 ${mod.is_active ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              <div>
                <p className="font-bold text-sm">{mod.display_name}</p>
                <p className="text-[10px] text-muted-foreground font-mono" dir="ltr">@{mod.username}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  if (editingId === mod.id) {
                    setEditingId(null);
                  } else {
                    setEditingId(mod.id);
                    setEditPermissions(mod.permissions || []);
                    setEditDisplayName(mod.display_name);
                    setEditPassword("");
                  }
                }}
                className="p-2 rounded-lg hover:bg-muted"
              >
                <Settings className="w-4 h-4 text-primary" />
              </button>
              <button onClick={() => handleToggleActive(mod)} className="p-2 rounded-lg hover:bg-muted">
                {mod.is_active ? <Eye className="w-4 h-4 text-green-500" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
              </button>
              <button onClick={() => handleDelete(mod)} className="p-2 rounded-lg hover:bg-destructive/10">
                <Trash2 className="w-4 h-4 text-destructive" />
              </button>
            </div>
          </div>

          {/* Permissions tags */}
          {editingId !== mod.id && (
            <div className="px-4 pb-3 flex flex-wrap gap-1">
              {(mod.permissions || []).map((p) => {
                const baseKey = p.replace(":view", "");
                const isView = p.endsWith(":view");
                const permInfo = ALL_PERMISSIONS.find(ap => ap.key === baseKey);
                return (
                  <span key={p} className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    isView
                      ? "bg-amber-500/10 text-amber-600"
                      : "bg-primary/10 text-primary"
                  }`}>
                    {permInfo?.label || baseKey}
                    {isView && " 👁"}
                  </span>
                );
              })}
              {(!mod.permissions || mod.permissions.length === 0) && (
                <span className="text-[10px] text-muted-foreground">لا صلاحيات</span>
              )}
            </div>
          )}

          {/* Edit Panel */}
          <AnimatePresence>
            {editingId === mod.id && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="border-t border-border p-4 space-y-3"
              >
                <Input
                  placeholder="الاسم المعروض"
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                />
                <Input
                  type="password"
                  placeholder="كلمة مرور جديدة (اتركه فارغ للإبقاء)"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  dir="ltr"
                />

                {renderPermissionsGrid(editPermissions, setEditPermissions)}

                <div className="flex gap-2">
                  <Button onClick={() => handleUpdate(mod)} disabled={actionLoading} className="flex-1">
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin ml-1" /> : <Save className="w-4 h-4 ml-1" />}
                    حفظ
                  </Button>
                  <Button onClick={() => setEditingId(null)} variant="outline" className="flex-1">
                    <X className="w-4 h-4 ml-1" />إلغاء
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer info */}
          <div className="px-4 pb-3 flex items-center justify-between text-[10px] text-muted-foreground">
            <span>أنشأه: {mod.created_by}</span>
            <span>{new Date(mod.created_at).toLocaleDateString("ar-EG")}</span>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default AdminModeratorManager;