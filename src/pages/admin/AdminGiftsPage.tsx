import React, { useState, useEffect } from "react";
import { useAdminSession } from "@/hooks/use-admin-session";
import AdminPageLayout from "@/components/AdminPageLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Gift, Star, Loader2, CheckCircle, XCircle, Plus, X, Save, Eye, EyeOff, Trash2, Sparkles, Frame } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const AdminGiftsPage: React.FC = () => {
  const { adminCall, uploadFile, handleLogout } = useAdminSession();
  const [loading, setLoading] = useState(false);
  const [starGifts, setStarGifts] = useState<any[]>([]);
  const [entryGifts, setEntryGifts] = useState<any[]>([]);
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [newEntry, setNewEntry] = useState({ title: "", gift_type: "both", star_level: 1, thumbnail_url: "" });
  const [entryFile, setEntryFile] = useState<File | null>(null);
  const [entryUploading, setEntryUploading] = useState(false);
  const [frameItems, setFrameItems] = useState<any[]>([]);
  const [showAddFrame, setShowAddFrame] = useState(false);
  const [newFrame, setNewFrame] = useState({ title: "", star_level: 1, thumbnail_url: "" });
  const [frameFile, setFrameFile] = useState<File | null>(null);
  const [frameUploading, setFrameUploading] = useState(false);
  const [customGifts, setCustomGifts] = useState<any[]>([]);
  const [subTab, setSubTab] = useState<"stars" | "entries" | "frames" | "custom">("stars");

  useEffect(() => { loadData(); }, [subTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (subTab === "stars") setStarGifts(await adminCall("list_star_gifts") || []);
      if (subTab === "entries") setEntryGifts(await adminCall("list_entry_gifts") || []);
      if (subTab === "frames") setFrameItems(await adminCall("list_frames") || []);
      if (subTab === "custom") setCustomGifts(await adminCall("list_custom_gifts") || []);
    } catch { toast.error("فشل تحميل البيانات"); }
    finally { setLoading(false); }
  };

  const addEntryGift = async () => {
    if (!entryFile) { toast.error("الملف مطلوب"); return; }
    if (entryFile.size > 100 * 1024 * 1024) { toast.error("حجم الملف يجب أن لا يتجاوز 100MB"); return; }
    try {
      setEntryUploading(true);
      const url = await uploadFile(entryFile);
      await adminCall("add_entry_gift", { title: newEntry.title || entryFile.name.replace(/\.[^.]+$/, ""), video_url: url, thumbnail_url: newEntry.thumbnail_url || null, gift_type: newEntry.gift_type, star_level: newEntry.star_level, display_order: entryGifts.length });
      toast.success("تمت إضافة الدخولية");
      setNewEntry({ title: "", gift_type: "both", star_level: 1, thumbnail_url: "" }); setEntryFile(null); setShowAddEntry(false);
      loadData();
    } catch (err: any) { toast.error(err?.message || "فشل الإضافة"); }
    finally { setEntryUploading(false); }
  };

  const addFrame = async () => {
    if (!frameFile) { toast.error("الملف مطلوب"); return; }
    if (frameFile.size > 100 * 1024 * 1024) { toast.error("حجم الملف يجب أن لا يتجاوز 100MB"); return; }
    try {
      setFrameUploading(true);
      const url = await uploadFile(frameFile);
      await adminCall("add_frame", { title: newFrame.title || frameFile.name.replace(/\.[^.]+$/, ""), file_url: url, thumbnail_url: newFrame.thumbnail_url || null, star_level: newFrame.star_level, display_order: frameItems.length });
      toast.success("تمت إضافة الإطار");
      setNewFrame({ title: "", star_level: 1, thumbnail_url: "" }); setFrameFile(null); setShowAddFrame(false);
      loadData();
    } catch (err: any) { toast.error(err?.message || "فشل الإضافة"); }
    finally { setFrameUploading(false); }
  };

  const renderStars = (level: number) => (
    <div className="flex gap-0.5">
      {Array.from({ length: level }).map((_, i) => <Star key={i} className="w-3 h-3 text-admin-amber fill-current" />)}
    </div>
  );

  const glassCard = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 4px 16px -4px rgba(0,0,0,0.3)' };

  return (
    <AdminPageLayout title="إدارة الهدايا" accentColor="hsl(330 81% 60%)" onLogout={handleLogout}>
      <div className="max-w-[448px] mx-auto p-4 space-y-4" dir="rtl">
        <div className="flex gap-1 rounded-2xl p-1" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(236,72,153,0.1)' }}>
          {[
            { key: "stars" as const, label: "نجوم", icon: Star },
            { key: "entries" as const, label: "دخوليات", icon: Sparkles },
            { key: "frames" as const, label: "إطارات", icon: Frame },
            { key: "custom" as const, label: "مخصصة", icon: Gift },
          ].map(t => {
            const Icon = t.icon;
            return (
              <motion.button key={t.key} onClick={() => setSubTab(t.key)} whileTap={{ scale: 0.96 }}
                className={`flex-1 py-2.5 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1 ${subTab === t.key ? "text-admin-pink" : "text-muted-foreground"}`}
                style={subTab === t.key ? { background: 'rgba(236,72,153,0.12)', boxShadow: '0 2px 8px rgba(236,72,153,0.15)' } : {}}>
                <Icon className="w-3.5 h-3.5" />{t.label}
              </motion.button>
            );
          })}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-admin-pink" /></div>
        ) : (
          <AnimatePresence mode="wait">
            {subTab === "stars" && (
              <motion.div key="stars" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
                {starGifts.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground"><Gift className="w-10 h-10 mx-auto mb-2 opacity-50" /><p>لا توجد إهداءات نجوم</p></div>
                ) : starGifts.map((gift: any, i: number) => (
                  <motion.div key={gift.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                    className="rounded-2xl p-4" style={{ ...glassCard, background: 'linear-gradient(145deg, rgba(236,72,153,0.05), rgba(255,255,255,0.02))' }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold">{gift.sender_name}</p>
                        <p className="text-[10px] text-muted-foreground tabular-nums">{gift.sender_uuid} → {gift.recipient_uuid}</p>
                      </div>
                      <span className="text-lg font-bold text-admin-amber">⭐ {gift.amount}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">{new Date(gift.created_at).toLocaleString("ar-EG")}</p>
                  </motion.div>
                ))}
              </motion.div>
            )}

            {subTab === "entries" && (
              <motion.div key="entries" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
                <motion.button whileTap={{ scale: 0.96 }} onClick={() => setShowAddEntry(!showAddEntry)}
                  className="w-full h-11 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
                  style={showAddEntry ? { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'hsl(var(--muted-foreground))' } : { background: 'linear-gradient(135deg, hsl(330 81% 60%), hsl(330 81% 50%))', color: '#fff', boxShadow: '0 4px 12px rgba(236,72,153,0.3)' }}>
                  {showAddEntry ? <><X className="w-4 h-4" />إلغاء</> : <><Plus className="w-4 h-4" />إضافة دخولية</>}
                </motion.button>
                {showAddEntry && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                    className="rounded-2xl p-4 space-y-3" style={{ background: 'linear-gradient(145deg, rgba(236,72,153,0.08), rgba(236,72,153,0.02))', border: '1px solid rgba(236,72,153,0.12)' }}>
                    <Input placeholder="اسم الدخولية (اختياري)" value={newEntry.title} onChange={(e) => setNewEntry({ ...newEntry, title: e.target.value })} />
                    <input type="file" accept="video/mp4,.webp,.svga,video/webm" onChange={(e) => setEntryFile(e.target.files?.[0] || null)}
                      className="w-full text-sm file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:text-white rounded-xl p-1" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }} />
                    <div className="grid grid-cols-3 gap-2">
                      {[1, 2, 3].map(lvl => (
                        <motion.button key={lvl} whileTap={{ scale: 0.95 }} onClick={() => setNewEntry({ ...newEntry, star_level: lvl })}
                          className="py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-1"
                          style={newEntry.star_level === lvl ? { background: 'rgba(236,72,153,0.12)', border: '1px solid rgba(236,72,153,0.2)' } : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                          {renderStars(lvl)}
                        </motion.button>
                      ))}
                    </div>
                    <select value={newEntry.gift_type} onChange={(e) => setNewEntry({ ...newEntry, gift_type: e.target.value })}
                      className="w-full rounded-xl p-2.5 text-sm" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <option value="both">ملف شخصي + روم</option>
                      <option value="profile">ملف شخصي فقط</option>
                      <option value="room">روم فقط</option>
                    </select>
                    <motion.button whileTap={{ scale: 0.96 }} onClick={addEntryGift} disabled={entryUploading}
                      className="w-full h-11 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-50"
                      style={{ background: 'linear-gradient(135deg, hsl(330 81% 60%), hsl(330 81% 50%))', boxShadow: '0 4px 12px rgba(236,72,153,0.3)' }}>
                      {entryUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" />حفظ</>}
                    </motion.button>
                  </motion.div>
                )}
                {entryGifts.map((gift: any, i: number) => (
                  <motion.div key={gift.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                    className={`rounded-2xl p-4 ${!gift.is_active ? "opacity-50" : ""}`} style={glassCard}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2"><h3 className="font-bold text-sm">{gift.title}</h3>{renderStars(gift.star_level)}</div>
                      <div className="flex items-center gap-1">
                        <motion.button whileTap={{ scale: 0.9 }} onClick={async () => { await adminCall("update_entry_gift", { id: gift.id, is_active: !gift.is_active }); loadData(); }}
                          className="p-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }}>
                          {gift.is_active ? <Eye className="w-4 h-4 text-admin-emerald" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
                        </motion.button>
                        <motion.button whileTap={{ scale: 0.9 }} onClick={async () => { await adminCall("delete_entry_gift", { id: gift.id }); loadData(); }}
                          className="p-1.5 rounded-lg" style={{ background: 'rgba(244,63,94,0.06)' }}>
                          <Trash2 className="w-4 h-4 text-admin-rose" />
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                ))}
                {entryGifts.length === 0 && <div className="text-center py-10 text-muted-foreground"><Sparkles className="w-10 h-10 mx-auto mb-2 opacity-50" /><p>لا توجد دخوليات</p></div>}
              </motion.div>
            )}

            {subTab === "frames" && (
              <motion.div key="frames" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
                <motion.button whileTap={{ scale: 0.96 }} onClick={() => setShowAddFrame(!showAddFrame)}
                  className="w-full h-11 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
                  style={showAddFrame ? { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'hsl(var(--muted-foreground))' } : { background: 'linear-gradient(135deg, hsl(330 81% 60%), hsl(330 81% 50%))', color: '#fff', boxShadow: '0 4px 12px rgba(236,72,153,0.3)' }}>
                  {showAddFrame ? <><X className="w-4 h-4" />إلغاء</> : <><Plus className="w-4 h-4" />إضافة إطار</>}
                </motion.button>
                {showAddFrame && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                    className="rounded-2xl p-4 space-y-3" style={{ background: 'linear-gradient(145deg, rgba(236,72,153,0.08), rgba(236,72,153,0.02))', border: '1px solid rgba(236,72,153,0.12)' }}>
                    <Input placeholder="اسم الإطار (اختياري)" value={newFrame.title} onChange={(e) => setNewFrame({ ...newFrame, title: e.target.value })} />
                    <input type="file" accept=".svga,.webp,image/webp" onChange={(e) => setFrameFile(e.target.files?.[0] || null)}
                      className="w-full text-sm file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:text-white rounded-xl p-1" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }} />
                    <div className="grid grid-cols-3 gap-2">
                      {[1, 2, 3].map(lvl => (
                        <motion.button key={lvl} whileTap={{ scale: 0.95 }} onClick={() => setNewFrame({ ...newFrame, star_level: lvl })}
                          className="py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-1"
                          style={newFrame.star_level === lvl ? { background: 'rgba(236,72,153,0.12)', border: '1px solid rgba(236,72,153,0.2)' } : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                          {renderStars(lvl)}
                        </motion.button>
                      ))}
                    </div>
                    <motion.button whileTap={{ scale: 0.96 }} onClick={addFrame} disabled={frameUploading}
                      className="w-full h-11 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-50"
                      style={{ background: 'linear-gradient(135deg, hsl(330 81% 60%), hsl(330 81% 50%))', boxShadow: '0 4px 12px rgba(236,72,153,0.3)' }}>
                      {frameUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" />حفظ</>}
                    </motion.button>
                  </motion.div>
                )}
                {frameItems.map((frame: any, i: number) => (
                  <motion.div key={frame.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                    className={`rounded-2xl p-4 ${!frame.is_active ? "opacity-50" : ""}`} style={glassCard}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2"><h3 className="font-bold text-sm">{frame.title}</h3>{renderStars(frame.star_level)}</div>
                      <div className="flex items-center gap-1">
                        <motion.button whileTap={{ scale: 0.9 }} onClick={async () => { await adminCall("update_frame", { id: frame.id, is_active: !frame.is_active }); loadData(); }}
                          className="p-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }}>
                          {frame.is_active ? <Eye className="w-4 h-4 text-admin-emerald" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
                        </motion.button>
                        <motion.button whileTap={{ scale: 0.9 }} onClick={async () => { await adminCall("delete_frame", { id: frame.id }); loadData(); }}
                          className="p-1.5 rounded-lg" style={{ background: 'rgba(244,63,94,0.06)' }}>
                          <Trash2 className="w-4 h-4 text-admin-rose" />
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                ))}
                {frameItems.length === 0 && <div className="text-center py-10 text-muted-foreground"><Frame className="w-10 h-10 mx-auto mb-2 opacity-50" /><p>لا توجد إطارات</p></div>}
              </motion.div>
            )}

            {subTab === "custom" && (
              <motion.div key="custom" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
                {customGifts.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground"><Gift className="w-10 h-10 mx-auto mb-2 opacity-50" /><p>لا توجد هدايا مخصصة</p></div>
                ) : customGifts.filter((g: any) => g.status === "pending").length > 0 ? (
                  <>
                    <p className="text-xs font-bold text-admin-pink">طلبات معلقة ({customGifts.filter((g: any) => g.status === "pending").length})</p>
                    {customGifts.filter((g: any) => g.status === "pending").map((gift: any, i: number) => (
                      <motion.div key={gift.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                        className="rounded-2xl p-4 space-y-2" style={{ ...glassCard, background: 'linear-gradient(145deg, rgba(236,72,153,0.05), rgba(255,255,255,0.02))' }}>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold">{gift.user_name}</span>
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold" style={{ background: 'rgba(245,158,11,0.12)', color: 'hsl(38 92% 50%)' }}>معلق</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{gift.title} • {gift.video_duration}ث</p>
                        <div className="flex gap-2">
                          <motion.button whileTap={{ scale: 0.95 }} onClick={async () => { await adminCall("update_custom_gift", { id: gift.id, status: "approved" }); toast.success("تم القبول"); loadData(); }}
                            className="flex-1 h-9 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1"
                            style={{ background: 'linear-gradient(135deg, hsl(160 84% 39%), hsl(160 84% 30%))', boxShadow: '0 2px 8px rgba(16,185,129,0.3)' }}>
                            <CheckCircle className="w-3.5 h-3.5" />قبول
                          </motion.button>
                          <motion.button whileTap={{ scale: 0.95 }} onClick={async () => { await adminCall("update_custom_gift", { id: gift.id, status: "rejected", admin_note: "مرفوض" }); toast.success("تم الرفض"); loadData(); }}
                            className="flex-1 h-9 rounded-xl text-xs font-bold flex items-center justify-center gap-1"
                            style={{ background: 'rgba(244,63,94,0.1)', color: 'hsl(350 89% 60%)', border: '1px solid rgba(244,63,94,0.15)' }}>
                            <XCircle className="w-3.5 h-3.5" />رفض
                          </motion.button>
                        </div>
                      </motion.div>
                    ))}
                  </>
                ) : (
                  <div className="text-center py-10 text-muted-foreground"><CheckCircle className="w-10 h-10 mx-auto mb-2 opacity-50" /><p>لا توجد طلبات معلقة</p></div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </AdminPageLayout>
  );
};

export default AdminGiftsPage;
