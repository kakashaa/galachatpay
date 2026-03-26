import React, { useState, useEffect, useCallback } from "react";
import { useAdminSession } from "@/hooks/use-admin-session";
import AdminPageLayout from "@/components/AdminPageLayout";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Users, UserPlus, Shield, Clock, Star, AlertTriangle, MessageSquare, Eye, ChevronDown, ChevronUp, Settings, ScrollText, Key, Phone, ToggleLeft, UserCog, Ban } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

type TabType = "admins" | "complaints" | "ratings";
type AdminSubTab = "super_admins" | "admins";

const AdminAccountsPage: React.FC = () => {
  const { adminCall, handleLogout, isOwner } = useAdminSession();
  const [loading, setLoading] = useState(true);
  const [admins, setAdmins] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ username: "", password: "", display_name: "", role: "admin" });
  const [adding, setAdding] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("admins");
  const [adminSubTab, setAdminSubTab] = useState<AdminSubTab>("super_admins");
  const [expandedAdminId, setExpandedAdminId] = useState<string | null>(null);
  const [expandedTab, setExpandedTab] = useState<"log" | "settings">("log");
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Complaints & Ratings state
  const [complaints, setComplaints] = useState<any[]>([]);
  const [ratings, setRatings] = useState<any[]>([]);
  const [loadingComplaints, setLoadingComplaints] = useState(false);
  const [loadingRatings, setLoadingRatings] = useState(false);

  useEffect(() => { loadAdmins(); }, []);

  useEffect(() => {
    if (activeTab === "complaints" && complaints.length === 0) loadComplaints();
    if (activeTab === "ratings" && ratings.length === 0) loadRatings();
  }, [activeTab]);

  const loadAdmins = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("admin_accounts")
        .select("id, username, display_name, role, is_active, created_at")
        .order("role", { ascending: true });
      if (error) throw error;
      setAdmins(data || []);
    } catch { }
    finally { setLoading(false); }
  };

  const loadComplaints = async () => {
    setLoadingComplaints(true);
    try {
      const { data } = await supabase.from("admin_complaints").select("*").order("created_at", { ascending: false }).limit(100);
      setComplaints(data || []);
    } catch { }
    setLoadingComplaints(false);
  };

  const loadRatings = async () => {
    setLoadingRatings(true);
    try {
      const { data } = await supabase.from("admin_ratings").select("*").order("created_at", { ascending: false }).limit(200);
      setRatings(data || []);
    } catch { }
    setLoadingRatings(false);
  };

  const fetchAuditLog = useCallback(async (username: string) => {
    setLoadingAudit(true);
    try {
      const { data } = await supabase
        .from("admin_audit_log")
        .select("*")
        .eq("admin_username", username)
        .order("created_at", { ascending: false })
        .limit(50);
      setAuditLogs(data || []);
    } catch { }
    setLoadingAudit(false);
  }, []);

  const toggleExpandAdmin = (admin: any) => {
    if (expandedAdminId === admin.id) {
      setExpandedAdminId(null);
    } else {
      setExpandedAdminId(admin.id);
      setExpandedTab("log");
      fetchAuditLog(admin.username);
    }
  };

  const [complaintActionId, setComplaintActionId] = useState<string | null>(null);

  const updateComplaintStatus = async (id: string, status: string, notes?: string) => {
    if (complaintActionId) return;
    setComplaintActionId(id);
    const t = toast.loading("جاري التحديث...");
    try {
      await supabase.from("admin_complaints").update({ status, owner_notes: notes || null }).eq("id", id);
      toast.dismiss(t);
      toast.success("تم التحديث");
      loadComplaints();
    } catch { toast.dismiss(t); toast.error("فشل التحديث"); }
    finally { setComplaintActionId(null); }
  };

  const addAdmin = async () => {
    if (!newAdmin.username || !newAdmin.password) { toast.error("يرجى ملء الحقول"); return; }
    setAdding(true);
    try {
      const { error } = await supabase.from("admin_accounts").insert({
        username: newAdmin.username,
        password_hash: newAdmin.password,
        display_name: newAdmin.display_name || newAdmin.username,
        role: newAdmin.role,
        is_active: true,
        permissions: {},
      });
      if (error) throw error;
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

  // Compute admin rating averages
  const adminRatingStats = React.useMemo(() => {
    const map: Record<string, { total: number; count: number; lastComment: string }> = {};
    ratings.forEach((r: any) => {
      if (!map[r.admin_username]) map[r.admin_username] = { total: 0, count: 0, lastComment: "" };
      map[r.admin_username].total += r.rating;
      map[r.admin_username].count++;
      if (r.comment && !map[r.admin_username].lastComment) map[r.admin_username].lastComment = r.comment;
    });
    return Object.entries(map).map(([username, stats]) => ({
      username,
      name: ratings.find((r: any) => r.admin_username === username)?.admin_name || username,
      avg: (stats.total / stats.count).toFixed(1),
      count: stats.count,
      lastComment: stats.lastComment,
    })).sort((a, b) => parseFloat(b.avg) - parseFloat(a.avg));
  }, [ratings]);

  const tabs = [
    { id: "admins" as TabType, label: "الحسابات", icon: Users },
    ...(isOwner ? [
      { id: "complaints" as TabType, label: "البلاغات", icon: AlertTriangle },
      { id: "ratings" as TabType, label: "التقييمات", icon: Star },
    ] : []),
  ];

  return (
    <AdminPageLayout title="إدارة الأدمن" accentColor="hsl(160 84% 39%)" onLogout={handleLogout}>
      <div className="max-w-[448px] mx-auto p-4 space-y-4" dir="rtl">
        {/* Tabs */}
        {tabs.length > 1 && (
          <div className="flex gap-2">
            {tabs.map((tab, i) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <motion.button key={tab.id} whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveTab(tab.id)}
                  className="flex-1 relative flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all"
                  style={isActive ? { background: 'linear-gradient(135deg, hsl(160 84% 39%), hsl(160 84% 30%))', color: '#fff', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' } : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: 'hsl(var(--muted-foreground))' }}>
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </motion.button>
              );
            })}
          </div>
        )}

        <AnimatePresence mode="wait">
          {activeTab === "admins" && (() => {
            const superAdmins = admins.filter(a => a.role === "super_admin" || a.role === "owner");
            const regularAdmins = admins.filter(a => a.role === "admin" || a.role === "moderator");
            const filteredAdmins = adminSubTab === "super_admins" ? superAdmins : regularAdmins;

            return (
            <motion.div key="admins" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-4">
              {/* Admin Sub-Tabs */}
              <div className="flex gap-2">
                <motion.button whileTap={{ scale: 0.95 }}
                  onClick={() => setAdminSubTab("super_admins")}
                  className="flex-1 relative flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all"
                  style={adminSubTab === "super_admins" ? { background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.2)', color: 'hsl(271 81% 56%)' } : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: 'hsl(var(--muted-foreground))' }}>
                  <Shield className="w-4 h-4" />
                  المشرفون
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold" style={{ background: 'rgba(139,92,246,0.15)', color: 'hsl(271 81% 56%)' }}>{superAdmins.length}</span>
                </motion.button>
                <motion.button whileTap={{ scale: 0.95 }}
                  onClick={() => setAdminSubTab("admins")}
                  className="flex-1 relative flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all"
                  style={adminSubTab === "admins" ? { background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.2)', color: 'hsl(217 91% 60%)' } : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: 'hsl(var(--muted-foreground))' }}>
                  <UserCog className="w-4 h-4" />
                  المسؤولون
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold" style={{ background: 'rgba(59,130,246,0.15)', color: 'hsl(217 91% 60%)' }}>{regularAdmins.length}</span>
                </motion.button>
              </div>

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
              ) : filteredAdmins.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground"><Users className="w-10 h-10 mx-auto mb-2 opacity-50" /><p>لا توجد حسابات</p></div>
              ) : (
                <div className="space-y-3">
                  {filteredAdmins.map((admin: any, i: number) => {
                    const rl = roleLabel(admin.role);
                    const isExpanded = expandedAdminId === admin.id;
                    return (
                      <motion.div key={admin.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                        className="rounded-2xl overflow-hidden" style={glassCard}>
                        <div className="p-4 cursor-pointer" onClick={() => toggleExpandAdmin(admin)}>
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
                            <div className="flex items-center gap-2">
                              <div className="flex flex-col items-end gap-1">
                                <span className="px-2 py-0.5 rounded-lg text-[9px] font-bold" style={{ background: rl.bg, color: rl.color }}>{rl.text}</span>
                                <div className="flex items-center gap-1">
                                  <div className="w-2 h-2 rounded-full" style={{ background: admin.is_active ? 'hsl(160 84% 39%)' : 'hsl(350 89% 60%)' }} />
                                  <span className="text-[9px] text-muted-foreground">{admin.is_active ? "نشط" : "معطل"}</span>
                                </div>
                              </div>
                              {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 mt-2 text-[9px] text-muted-foreground">
                            {admin.created_at && (
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>انضم: {new Date(admin.created_at).toLocaleDateString("ar-EG")}</span>
                              </div>
                            )}
                            {admin.id && (
                              <span className="tabular-nums">ID: {admin.id}</span>
                            )}
                          </div>
                        </div>

                        {/* Expanded section */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="border-t border-white/5"
                            >
                              <div className="p-4 space-y-3">
                                {/* Inner tabs */}
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => { setExpandedTab("log"); fetchAuditLog(admin.username); }}
                                    className="flex-1 py-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1"
                                    style={expandedTab === "log" ? { background: 'rgba(139,92,246,0.12)', color: 'hsl(271 81% 56%)' } : { background: 'rgba(255,255,255,0.03)', color: 'hsl(var(--muted-foreground))' }}
                                  >
                                    <ScrollText className="w-3.5 h-3.5" /> السجل
                                  </button>
                                  <button
                                    onClick={() => setExpandedTab("settings")}
                                    className="flex-1 py-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1"
                                    style={expandedTab === "settings" ? { background: 'rgba(59,130,246,0.12)', color: 'hsl(217 91% 60%)' } : { background: 'rgba(255,255,255,0.03)', color: 'hsl(var(--muted-foreground))' }}
                                  >
                                    <Settings className="w-3.5 h-3.5" /> الإعدادات
                                  </button>
                                </div>

                                {expandedTab === "log" && (
                                  <div className="space-y-2">
                                    {loadingAudit ? (
                                      <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-admin-emerald" /></div>
                                    ) : auditLogs.length === 0 ? (
                                      <p className="text-center text-[11px] text-muted-foreground py-4">لا توجد سجلات</p>
                                    ) : auditLogs.map((log: any) => (
                                      <div key={log.id} className="rounded-xl p-2.5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <div className="flex items-center justify-between">
                                          <span className="text-[11px] font-bold">{log.action}</span>
                                          <span className="text-[9px] text-muted-foreground">{new Date(log.created_at).toLocaleDateString("ar-EG")}</span>
                                        </div>
                                        {log.details && (
                                          <p className="text-[10px] text-muted-foreground mt-1 truncate">
                                            {typeof log.details === "object" ? JSON.stringify(log.details) : log.details}
                                          </p>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {expandedTab === "settings" && (
                                  <div className="grid grid-cols-2 gap-2">
                                    <button className="py-2.5 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1"
                                      style={{ background: 'rgba(245,158,11,0.1)', color: 'hsl(38 92% 50%)', border: '1px solid rgba(245,158,11,0.15)' }}
                                      onClick={() => toast.info("قريباً")}>
                                      <Key className="w-3.5 h-3.5" /> تغيير كلمة المرور
                                    </button>
                                    <button className="py-2.5 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1"
                                      style={{ background: 'rgba(59,130,246,0.1)', color: 'hsl(217 91% 60%)', border: '1px solid rgba(59,130,246,0.15)' }}
                                      onClick={() => toast.info("قريباً")}>
                                      <Phone className="w-3.5 h-3.5" /> تغيير الهاتف
                                    </button>
                                    <button className="py-2.5 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1"
                                      style={{ background: 'rgba(16,185,129,0.1)', color: 'hsl(160 84% 39%)', border: '1px solid rgba(16,185,129,0.15)' }}
                                      onClick={() => toast.info("قريباً")}>
                                      <ToggleLeft className="w-3.5 h-3.5" /> الصلاحيات
                                    </button>
                                    <button className="py-2.5 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1"
                                      style={{ background: 'rgba(139,92,246,0.1)', color: 'hsl(271 81% 56%)', border: '1px solid rgba(139,92,246,0.15)' }}
                                      onClick={() => toast.info("قريباً")}>
                                      <UserCog className="w-3.5 h-3.5" /> تغيير الدور
                                    </button>
                                    <button className="col-span-2 py-2.5 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1"
                                      style={{ background: 'rgba(244,63,94,0.1)', color: 'hsl(350 89% 60%)', border: '1px solid rgba(244,63,94,0.15)' }}
                                      onClick={async () => {
                                        try {
                                          await supabase.from("admin_accounts").update({ is_active: !admin.is_active }).eq("id", admin.id);
                                          toast.success(admin.is_active ? "تم تعطيل الحساب" : "تم تفعيل الحساب");
                                          loadAdmins();
                                        } catch { toast.error("فشل"); }
                                      }}>
                                      <Ban className="w-3.5 h-3.5" /> {admin.is_active ? "تعطيل الحساب" : "تفعيل الحساب"}
                                    </button>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
            );
          })()}

          {activeTab === "complaints" && (
            <motion.div key="complaints" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
              {loadingComplaints ? (
                <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-admin-emerald" /></div>
              ) : complaints.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground"><AlertTriangle className="w-10 h-10 mx-auto mb-2 opacity-50" /><p>لا توجد بلاغات</p></div>
              ) : complaints.map((c: any, i: number) => (
                <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  className="rounded-2xl p-4 space-y-3" style={glassCard}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold">{c.admin_name || c.admin_username}</p>
                      <p className="text-[10px] text-muted-foreground">بلاغ من: {c.reporter_name || c.reporter_uuid}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-lg text-[9px] font-bold" style={{
                      background: c.status === 'pending' ? 'rgba(245,158,11,0.12)' : c.status === 'reviewed' ? 'rgba(59,130,246,0.12)' : 'rgba(34,197,94,0.12)',
                      color: c.status === 'pending' ? 'hsl(38 92% 50%)' : c.status === 'reviewed' ? 'hsl(217 91% 60%)' : 'hsl(142 71% 45%)',
                    }}>
                      {c.status === 'pending' ? 'معلق' : c.status === 'reviewed' ? 'تمت المراجعة' : 'محلول'}
                    </span>
                  </div>
                  <p className="text-xs text-foreground/80 leading-relaxed">{c.reason}</p>
                  {c.media_url && (
                    <a href={c.media_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[10px] text-primary">
                      <Eye className="w-3 h-3" /> عرض المرفق ({c.media_type || "ملف"})
                    </a>
                  )}
                  <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {new Date(c.created_at).toLocaleDateString("ar-EG")} — {new Date(c.created_at).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                  {c.status === "pending" && (
                    <div className="flex gap-2">
                      <motion.button whileTap={{ scale: 0.95 }} disabled={!!complaintActionId}
                        onClick={() => updateComplaintStatus(c.id, "reviewed")}
                        className="flex-1 py-2 rounded-xl text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-1" style={{ background: 'rgba(59,130,246,0.12)', color: 'hsl(217 91% 60%)', border: '1px solid rgba(59,130,246,0.2)' }}>
                        {complaintActionId === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "تمت المراجعة"}
                      </motion.button>
                      <motion.button whileTap={{ scale: 0.95 }} disabled={!!complaintActionId}
                        onClick={() => updateComplaintStatus(c.id, "resolved")}
                        className="flex-1 py-2 rounded-xl text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-1" style={{ background: 'rgba(34,197,94,0.12)', color: 'hsl(142 71% 45%)', border: '1px solid rgba(34,197,94,0.2)' }}>
                        {complaintActionId === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "محلول"}
                      </motion.button>
                    </div>
                  )}
                </motion.div>
              ))}
            </motion.div>
          )}

          {activeTab === "ratings" && (
            <motion.div key="ratings" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
              {loadingRatings ? (
                <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-admin-emerald" /></div>
              ) : adminRatingStats.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground"><Star className="w-10 h-10 mx-auto mb-2 opacity-50" /><p>لا توجد تقييمات</p></div>
              ) : adminRatingStats.map((admin, i) => (
                <motion.div key={admin.username} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className="rounded-2xl p-4 space-y-2" style={glassCard}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.1)' }}>
                        <Shield className="w-5 h-5" style={{ color: 'hsl(38 92% 50%)' }} />
                      </div>
                      <div>
                        <p className="text-sm font-bold">{admin.name}</p>
                        <p className="text-[10px] text-muted-foreground">@{admin.username}</p>
                      </div>
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map(n => (
                          <Star key={n} className={`w-3.5 h-3.5 ${n <= Math.round(parseFloat(admin.avg)) ? "text-amber-400 fill-amber-400" : "text-muted-foreground/20"}`} />
                        ))}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{admin.avg} ({admin.count} تقييم)</p>
                    </div>
                  </div>
                  {admin.lastComment && (
                    <div className="flex items-start gap-1.5 pt-1">
                      <MessageSquare className="w-3 h-3 text-muted-foreground mt-0.5" />
                      <p className="text-[11px] text-foreground/70 leading-relaxed">"{admin.lastComment}"</p>
                    </div>
                  )}
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AdminPageLayout>
  );
};

export default AdminAccountsPage;
