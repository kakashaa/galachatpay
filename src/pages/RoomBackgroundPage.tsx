import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Image, Gift, KeyRound, Upload, X, Send, Loader2, Copy } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import StatusModal from "@/components/StatusModal";

const MAX_PER_MONTH = 5;
const MAX_FILE_SIZE = 8 * 1024 * 1024;

const getCurrentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

const generateCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
};

const isEligible = (user: any): boolean => {
  if (!user) return false;
  const vipLevel = user.vip?.vip_level || user.vip?.level || 0;
  const chargerLevel = user.charger_level || user.level || 0;
  const typeUser = user.type_user ?? user.type ?? 0;
  // type_user: 1=host, 2=host_agent, 3=charge_agent, 4=both_agent, 5=charge+host, 6=all
  const isHostAgent = (user.agency_id || 0) > 0 || typeUser >= 1;
  const starBalance = user.star_balance || 0;
  return vipLevel >= 6 || chargerLevel >= 50 || isHostAgent || starBalance >= 2;
};

type ViewMode = "menu" | "self" | "gift_create" | "gift_redeem";

const RoomBackgroundPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const month = getCurrentMonth();

  const [view, setView] = useState<ViewMode>("menu");
  const [remaining, setRemaining] = useState(MAX_PER_MONTH);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [redeemCode, setRedeemCode] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [status, setStatus] = useState<{ type: "success" | "error" | "loading"; message: string } | null>(null);
  const [history, setHistory] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    if (!user?.uuid) return;
    setLoading(true);
    const { data, count } = await supabase
      .from("room_background_requests")
      .select("*", { count: "exact" })
      .eq("user_uuid", user.uuid)
      .eq("month", month);
    setRemaining(MAX_PER_MONTH - (count || 0));
    setHistory(data || []);
    setLoading(false);
  }, [user?.uuid, month]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const uploadImage = async (f: File): Promise<string | null> => {
    const ext = f.name.split(".").pop();
    const path = `room-backgrounds/${user?.uuid}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("attachments").upload(path, f);
    if (error) return null;
    const { data } = supabase.storage.from("attachments").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSelfSubmit = async () => {
    if (!file || !user || remaining <= 0) return;
    setSubmitting(true);
    setStatus({ type: "loading", message: "جاري رفع الصورة..." });
    const url = await uploadImage(file);
    if (!url) { setStatus({ type: "error", message: "فشل رفع الصورة" }); setSubmitting(false); return; }
    const { error } = await supabase.from("room_background_requests").insert({
      user_uuid: user.uuid, user_name: user.name || "", request_type: "self", image_url: url, month,
    });
    if (error) { setStatus({ type: "error", message: "فشل الإرسال" }); }
    else {
      // Sync with official dashboard
      try { await fetch(`https://hola-chat.com/wares-api.php?key=ghala2026actions&action=upload-room-background&uuid=${user.uuid}&image_url=${encodeURIComponent(url)}`); } catch {}
      setStatus({ type: "success", message: "تم إرسال الطلب!\nسيتم مراجعته من الإدارة" }); setFile(null); fetchData();
    }
    setSubmitting(false);
  };

  const handleCreateGift = async () => {
    if (!user || remaining <= 0) return;
    setSubmitting(true);
    setStatus({ type: "loading", message: "جاري إنشاء الكود..." });
    const code = generateCode();
    const { error: codeErr } = await supabase.from("room_background_codes").insert({
      code, creator_uuid: user.uuid, month,
    });
    if (codeErr) { setStatus({ type: "error", message: "فشل إنشاء الكود" }); setSubmitting(false); return; }
    const { error } = await supabase.from("room_background_requests").insert({
      user_uuid: user.uuid, user_name: user.name || "", request_type: "gift_create", gift_code: code, month,
    });
    if (error) { setStatus({ type: "error", message: "فشل الإرسال" }); }
    else { setGeneratedCode(code); setStatus({ type: "success", message: `تم إنشاء الكود بنجاح!\n\n${code}\n\nشاركه مع صديقك` }); fetchData(); }
    setSubmitting(false);
  };

  const handleRedeemSubmit = async () => {
    if (!file || !user || !redeemCode.trim()) return;
    setSubmitting(true);
    setStatus({ type: "loading", message: "جاري التحقق من الكود..." });
    // Verify code
    const { data: codeData } = await supabase.from("room_background_codes").select("*").eq("code", redeemCode.trim().toUpperCase()).maybeSingle();
    if (!codeData) { setStatus({ type: "error", message: "الكود غير صحيح" }); setSubmitting(false); return; }
    if (codeData.used_by_uuid) { setStatus({ type: "error", message: "الكود مُستخدم من قبل" }); setSubmitting(false); return; }

    const url = await uploadImage(file);
    if (!url) { setStatus({ type: "error", message: "فشل رفع الصورة" }); setSubmitting(false); return; }

    // Mark code as used
    await supabase.from("room_background_codes").update({ used_by_uuid: user.uuid, used_at: new Date().toISOString() }).eq("id", codeData.id);
    const { error } = await supabase.from("room_background_requests").insert({
      user_uuid: user.uuid, user_name: user.name || "", request_type: "gift_redeem", gift_code: redeemCode.trim().toUpperCase(), image_url: url, month,
    });
    if (error) { setStatus({ type: "error", message: "فشل الإرسال" }); }
    else { setStatus({ type: "success", message: "تم إرسال الطلب!\nسيتم مراجعته من الإدارة" }); setFile(null); setRedeemCode(""); fetchData(); }
    setSubmitting(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > MAX_FILE_SIZE) { setStatus({ type: "error", message: "حجم الملف يتجاوز 8MB" }); return; }
    setFile(f);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(generatedCode);
    setStatus({ type: "success", message: "تم نسخ الكود!" });
  };

  if (!isEligible(user)) {
    return (
      <div className="mobile-container bg-background flex flex-col items-center justify-center" dir="rtl">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center space-y-4 px-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <Image className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-lg font-bold text-foreground">خلفيات الغرف 🎨</h2>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-[280px] mx-auto">
            هذه الخدمة متاحة لـ:<br />
            <span className="text-primary font-bold">VIP 6</span> أو <span className="text-primary font-bold">مستوى شحن 50+</span><br />
            أو <span className="text-primary font-bold">وكيل مضيفين</span> أو بـ <span className="text-primary font-bold">⭐ نجمتين</span>
          </p>
          <button onClick={() => navigate(-1)} className="w-full h-11 rounded-xl border border-border/50 text-foreground font-bold bg-card/50 active:scale-95 transition-transform text-sm">رجوع</button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="mobile-container bg-background flex flex-col" dir="rtl">
      {status && <StatusModal type={status.type} message={status.message} onClose={() => setStatus(null)} />}

      <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 bg-card/80 backdrop-blur-xl border-b border-border/30">
        <motion.button initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} onClick={() => {
          if (view !== "menu") { setView("menu"); setFile(null); setRedeemCode(""); }
          else navigate(-1);
        }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/15 border border-primary/30">
          <ArrowRight className="w-5 h-5 text-primary" />
          <span className="text-sm font-semibold text-primary">رجوع</span>
        </motion.button>
        <h1 className="text-sm font-bold text-foreground">خلفيات الغرف 🎨</h1>
        <div className="w-16" />
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {/* Remaining counter */}
        <div className="glass-card p-3 flex items-center justify-between">
          <span className="text-sm font-bold text-foreground">المتبقي هذا الشهر</span>
          <span className="text-lg font-black text-primary">{loading ? "..." : `${remaining}/${MAX_PER_MONTH}`}</span>
        </div>

        <AnimatePresence mode="wait">
          {view === "menu" && (
            <motion.div key="menu" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              <MenuButton icon={<Image className="w-6 h-6" />} label="تغيير خلفية غرفتي" desc="اختر صورة وارفعها للمراجعة" color="from-blue-500/20 to-blue-600/10 border-blue-500/30" onClick={() => setView("self")} disabled={remaining <= 0} />
              <MenuButton icon={<Gift className="w-6 h-6" />} label="إنشاء كود هدية" desc="أنشئ كود وأرسله لصديقك" color="from-emerald-500/20 to-emerald-600/10 border-emerald-500/30" onClick={() => setView("gift_create")} disabled={remaining <= 0} />
              <MenuButton icon={<KeyRound className="w-6 h-6" />} label="عندك كود؟" desc="استخدم كود هدية من صديق" color="from-amber-500/20 to-amber-600/10 border-amber-500/30" onClick={() => setView("gift_redeem")} />

              {/* History */}
              {history.length > 0 && (
                <div className="space-y-2 pt-2">
                  <h3 className="text-xs font-bold text-muted-foreground">طلباتي السابقة</h3>
                  {history.map(r => (
                    <div key={r.id} className="glass-card p-3 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-foreground">
                          {r.request_type === "self" ? "تغيير خلفية" : r.request_type === "gift_create" ? "كود هدية" : "استخدام كود"}
                        </p>
                        {r.gift_code && <p className="text-[10px] text-muted-foreground">الكود: {r.gift_code}</p>}
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${r.status === "approved" ? "bg-emerald-500/20 text-emerald-400" : r.status === "rejected" ? "bg-red-500/20 text-red-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                        {r.status === "approved" ? "مقبول ✅" : r.status === "rejected" ? "مرفوض ❌" : "معلق ⏳"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {view === "self" && (
            <motion.div key="self" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="glass-card p-4 space-y-3">
                <label className="text-sm font-bold text-foreground">📸 اختر صورة الخلفية</label>
                {file ? (
                  <div className="flex items-center gap-2 p-2 bg-input rounded-lg border border-border/50">
                    <span className="text-xs text-foreground truncate flex-1">{file.name}</span>
                    <button onClick={() => setFile(null)} className="text-destructive"><X className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 h-24 bg-input rounded-xl border border-dashed border-border/50 cursor-pointer hover:border-primary/50 transition-colors">
                    <Upload className="w-5 h-5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">اختر صورة (حد أقصى 8MB)</span>
                    <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                  </label>
                )}
              </div>
              <button onClick={handleSelfSubmit} disabled={!file || submitting} className="w-full h-12 gold-gradient rounded-xl text-primary-foreground font-bold flex items-center justify-center gap-2 disabled:opacity-40 active:scale-95 transition-transform">
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-5 h-5" />إرسال للمراجعة</>}
              </button>
            </motion.div>
          )}

          {view === "gift_create" && (
            <motion.div key="gift" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="glass-card p-4 text-center space-y-3">
                <Gift className="w-10 h-10 text-emerald-400 mx-auto" />
                <p className="text-sm text-foreground font-bold">إنشاء كود هدية</p>
                <p className="text-xs text-muted-foreground">سيتم خصم 1 من رصيدك الشهري</p>
                {generatedCode && (
                  <div className="space-y-2">
                    <div className="text-2xl font-black text-primary tracking-widest">{generatedCode}</div>
                    <button onClick={copyCode} className="text-xs text-primary flex items-center gap-1 mx-auto"><Copy className="w-3 h-3" /> نسخ</button>
                  </div>
                )}
              </div>
              {!generatedCode && (
                <button onClick={handleCreateGift} disabled={submitting} className="w-full h-12 gold-gradient rounded-xl text-primary-foreground font-bold flex items-center justify-center gap-2 disabled:opacity-40 active:scale-95 transition-transform">
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Gift className="w-5 h-5" />إنشاء الكود</>}
                </button>
              )}
            </motion.div>
          )}

          {view === "gift_redeem" && (
            <motion.div key="redeem" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="glass-card p-4 space-y-3">
                <label className="text-sm font-bold text-foreground">🔑 أدخل الكود</label>
                <input type="text" value={redeemCode} onChange={e => setRedeemCode(e.target.value.toUpperCase())} placeholder="XXXXXX" maxLength={6} className="w-full h-14 px-4 bg-input rounded-xl text-foreground placeholder:text-muted-foreground border border-border/50 focus:border-primary outline-none text-xl text-center tracking-[0.3em] font-black" dir="ltr" />
              </div>
              <div className="glass-card p-4 space-y-3">
                <label className="text-sm font-bold text-foreground">📸 صورة الخلفية</label>
                {file ? (
                  <div className="flex items-center gap-2 p-2 bg-input rounded-lg border border-border/50">
                    <span className="text-xs text-foreground truncate flex-1">{file.name}</span>
                    <button onClick={() => setFile(null)} className="text-destructive"><X className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 h-24 bg-input rounded-xl border border-dashed border-border/50 cursor-pointer hover:border-primary/50 transition-colors">
                    <Upload className="w-5 h-5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">اختر صورة (حد أقصى 8MB)</span>
                    <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                  </label>
                )}
              </div>
              <button onClick={handleRedeemSubmit} disabled={!file || !redeemCode.trim() || submitting} className="w-full h-12 gold-gradient rounded-xl text-primary-foreground font-bold flex items-center justify-center gap-2 disabled:opacity-40 active:scale-95 transition-transform">
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-5 h-5" />إرسال للمراجعة</>}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

function MenuButton({ icon, label, desc, color, onClick, disabled }: { icon: React.ReactNode; label: string; desc: string; color: string; onClick: () => void; disabled?: boolean }) {
  return (
    <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} onClick={onClick} disabled={disabled}
      className={`w-full p-4 rounded-xl bg-gradient-to-br ${color} border text-right flex items-center gap-3 active:scale-95 transition-transform disabled:opacity-40`}>
      <div className="text-foreground">{icon}</div>
      <div>
        <p className="text-sm font-bold text-foreground">{label}</p>
        <p className="text-[10px] text-muted-foreground">{desc}</p>
      </div>
    </motion.button>
  );
}

export default RoomBackgroundPage;
