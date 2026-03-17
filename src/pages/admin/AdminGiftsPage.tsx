import React, { useState, useEffect } from "react";
import { useAdminSession } from "@/hooks/use-admin-session";
import AdminPageLayout from "@/components/AdminPageLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Gift, Star, Loader2, CheckCircle, XCircle, Plus, X, Save, Eye, EyeOff, Trash2, Sparkles, Frame } from "lucide-react";
import { motion } from "framer-motion";

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
      {Array.from({ length: level }).map((_, i) => (
        <Star key={i} className="w-3 h-3 text-yellow-400 fill-yellow-400" />
      ))}
    </div>
  );

  return (
    <AdminPageLayout title="إدارة الهدايا" accentColor="#ec4899" onLogout={handleLogout}>
      <div className="max-w-2xl mx-auto p-4 space-y-4" dir="rtl">
        {/* Tabs — Pink themed */}
        <div className="flex gap-1 bg-white/[0.03] rounded-xl p-1 border border-pink-500/10">
          {[
            { key: "stars" as const, label: "إهداءات نجوم", icon: <Star className="w-4 h-4" /> },
            { key: "entries" as const, label: "دخوليات", icon: <Sparkles className="w-4 h-4" /> },
            { key: "frames" as const, label: "إطارات", icon: <Frame className="w-4 h-4" /> },
            { key: "custom" as const, label: "هدايا مخصصة", icon: <Gift className="w-4 h-4" /> },
          ].map(t => (
            <button key={t.key} onClick={() => setSubTab(t.key)}
              className={`flex-1 py-2.5 rounded-lg text-[11px] font-bold transition-colors flex items-center justify-center gap-1 ${subTab === t.key ? "bg-pink-500/20 text-pink-400" : "text-muted-foreground hover:text-foreground"}`}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-pink-400" /></div>
        ) : (
          <>
            {/* Star Gifts */}
            {subTab === "stars" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                {starGifts.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground"><Gift className="w-10 h-10 mx-auto mb-2 opacity-50" /><p>لا توجد إهداءات نجوم</p></div>
                ) : starGifts.map((gift: any) => (
                  <div key={gift.id} className="bg-gradient-to-br from-pink-500/5 to-transparent border border-pink-500/10 rounded-2xl p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold">{gift.sender_name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{gift.sender_uuid} → {gift.recipient_uuid}</p>
                      </div>
                      <span className="text-lg font-bold text-yellow-400">⭐ {gift.amount}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">{new Date(gift.created_at).toLocaleString("ar-EG")}</p>
                  </div>
                ))}
              </motion.div>
            )}

            {/* Entry Gifts */}
            {subTab === "entries" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                <Button onClick={() => setShowAddEntry(!showAddEntry)} className={`w-full ${showAddEntry ? "" : "bg-pink-600 hover:bg-pink-700 text-white"}`} variant={showAddEntry ? "outline" : "default"}>
                  {showAddEntry ? <><X className="w-4 h-4 ml-2" />إلغاء</> : <><Plus className="w-4 h-4 ml-2" />إضافة دخولية</>}
                </Button>
                {showAddEntry && (
                  <div className="bg-gradient-to-br from-pink-500/10 to-pink-600/5 border border-pink-500/20 rounded-2xl p-4 space-y-3">
                    <Input placeholder="اسم الدخولية (اختياري)" value={newEntry.title} onChange={(e) => setNewEntry({ ...newEntry, title: e.target.value })} />
                    <input type="file" accept="video/mp4,.webp,.svga,video/webm" onChange={(e) => setEntryFile(e.target.files?.[0] || null)} className="w-full text-sm file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-pink-600 file:text-white bg-white/[0.03] border border-white/[0.06] rounded-lg p-1" />
                    <div className="grid grid-cols-3 gap-2">
                      {[1, 2, 3].map((lvl) => (
                        <button key={lvl} onClick={() => setNewEntry({ ...newEntry, star_level: lvl })} className={`py-2 rounded-lg border text-sm font-bold flex items-center justify-center gap-1 ${newEntry.star_level === lvl ? "border-pink-500 bg-pink-500/10" : "border-white/10"}`}>
                          {renderStars(lvl)}
                        </button>
                      ))}
                    </div>
                    <select value={newEntry.gift_type} onChange={(e) => setNewEntry({ ...newEntry, gift_type: e.target.value })} className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg p-2 text-sm">
                      <option value="both">ملف شخصي + روم</option>
                      <option value="profile">ملف شخصي فقط</option>
                      <option value="room">روم فقط</option>
                    </select>
                    <Button onClick={addEntryGift} disabled={entryUploading} className="w-full bg-pink-600 hover:bg-pink-700 text-white">
                      {entryUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 ml-2" />حفظ</>}
                    </Button>
                  </div>
                )}
                {entryGifts.map((gift: any) => (
                  <div key={gift.id} className={`bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 ${!gift.is_active ? "opacity-50" : ""}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm">{gift.title}</h3>
                        {renderStars(gift.star_level)}
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={async () => { await adminCall("update_entry_gift", { id: gift.id, is_active: !gift.is_active }); loadData(); }} className="p-1.5 rounded-lg hover:bg-white/5">
                          {gift.is_active ? <Eye className="w-4 h-4 text-emerald-500" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
                        </button>
                        <button onClick={async () => { await adminCall("delete_entry_gift", { id: gift.id }); loadData(); }} className="p-1.5 rounded-lg hover:bg-destructive/10">
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {entryGifts.length === 0 && <div className="text-center py-10 text-muted-foreground"><Sparkles className="w-10 h-10 mx-auto mb-2 opacity-50" /><p>لا توجد دخوليات</p></div>}
              </motion.div>
            )}

            {/* Frames */}
            {subTab === "frames" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                <Button onClick={() => setShowAddFrame(!showAddFrame)} className={`w-full ${showAddFrame ? "" : "bg-pink-600 hover:bg-pink-700 text-white"}`} variant={showAddFrame ? "outline" : "default"}>
                  {showAddFrame ? <><X className="w-4 h-4 ml-2" />إلغاء</> : <><Plus className="w-4 h-4 ml-2" />إضافة إطار</>}
                </Button>
                {showAddFrame && (
                  <div className="bg-gradient-to-br from-pink-500/10 to-pink-600/5 border border-pink-500/20 rounded-2xl p-4 space-y-3">
                    <Input placeholder="اسم الإطار (اختياري)" value={newFrame.title} onChange={(e) => setNewFrame({ ...newFrame, title: e.target.value })} />
                    <input type="file" accept=".svga,.webp,image/webp" onChange={(e) => setFrameFile(e.target.files?.[0] || null)} className="w-full text-sm file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-pink-600 file:text-white bg-white/[0.03] border border-white/[0.06] rounded-lg p-1" />
                    <div className="grid grid-cols-3 gap-2">
                      {[1, 2, 3].map((lvl) => (
                        <button key={lvl} onClick={() => setNewFrame({ ...newFrame, star_level: lvl })} className={`py-2 rounded-lg border text-sm font-bold flex items-center justify-center gap-1 ${newFrame.star_level === lvl ? "border-pink-500 bg-pink-500/10" : "border-white/10"}`}>
                          {renderStars(lvl)}
                        </button>
                      ))}
                    </div>
                    <Button onClick={addFrame} disabled={frameUploading} className="w-full bg-pink-600 hover:bg-pink-700 text-white">
                      {frameUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 ml-2" />حفظ</>}
                    </Button>
                  </div>
                )}
                {frameItems.map((frame: any) => (
                  <div key={frame.id} className={`bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 ${!frame.is_active ? "opacity-50" : ""}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm">{frame.title}</h3>
                        {renderStars(frame.star_level)}
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={async () => { await adminCall("update_frame", { id: frame.id, is_active: !frame.is_active }); loadData(); }} className="p-1.5 rounded-lg hover:bg-white/5">
                          {frame.is_active ? <Eye className="w-4 h-4 text-emerald-500" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
                        </button>
                        <button onClick={async () => { await adminCall("delete_frame", { id: frame.id }); loadData(); }} className="p-1.5 rounded-lg hover:bg-destructive/10">
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {frameItems.length === 0 && <div className="text-center py-10 text-muted-foreground"><Frame className="w-10 h-10 mx-auto mb-2 opacity-50" /><p>لا توجد إطارات</p></div>}
              </motion.div>
            )}

            {/* Custom Gifts */}
            {subTab === "custom" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                {customGifts.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground"><Gift className="w-10 h-10 mx-auto mb-2 opacity-50" /><p>لا توجد هدايا مخصصة</p></div>
                ) : customGifts.filter((g: any) => g.status === "pending").length > 0 ? (
                  <>
                    <p className="text-xs font-bold text-pink-400">طلبات معلقة ({customGifts.filter((g: any) => g.status === "pending").length})</p>
                    {customGifts.filter((g: any) => g.status === "pending").map((gift: any) => (
                      <div key={gift.id} className="bg-gradient-to-br from-pink-500/5 to-transparent border border-pink-500/20 rounded-2xl p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold">{gift.user_name}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400">معلق</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{gift.title} • {gift.video_duration}ث</p>
                        <div className="flex gap-2">
                          <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={async () => {
                            await adminCall("update_custom_gift", { id: gift.id, status: "approved" });
                            toast.success("تم القبول"); loadData();
                          }}><CheckCircle className="w-4 h-4 ml-1" />قبول</Button>
                          <Button size="sm" variant="destructive" className="flex-1" onClick={async () => {
                            await adminCall("update_custom_gift", { id: gift.id, status: "rejected", admin_note: "مرفوض" });
                            toast.success("تم الرفض"); loadData();
                          }}><XCircle className="w-4 h-4 ml-1" />رفض</Button>
                        </div>
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="text-center py-10 text-muted-foreground"><CheckCircle className="w-10 h-10 mx-auto mb-2 opacity-50" /><p>لا توجد طلبات معلقة</p></div>
                )}
              </motion.div>
            )}
          </>
        )}
      </div>
    </AdminPageLayout>
  );
};

export default AdminGiftsPage;
