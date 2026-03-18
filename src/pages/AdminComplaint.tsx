import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, AlertTriangle, Upload, X, Send, Loader2, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AdminComplaint: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [admins, setAdmins] = useState<any[]>([]);
  const [selectedAdmin, setSelectedAdmin] = useState<string>("");
  const [reason, setReason] = useState("");
  const [media, setMedia] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await supabase.from("admin_accounts").select("username, display_name, role").eq("is_active", true);
        setAdmins((data || []).filter((a: any) => a.role !== "owner"));
      } catch { }
      setLoading(false);
    };
    load();
  }, []);

  const uploadFile = async (file: File): Promise<string | null> => {
    const ext = file.name.split(".").pop();
    const path = `complaints/${user?.uuid || "anon"}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("attachments").upload(path, file);
    if (error) return null;
    const { data } = supabase.storage.from("attachments").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSubmit = async () => {
    if (!selectedAdmin || !reason.trim()) { toast.error("يرجى اختيار الأدمن وكتابة السبب"); return; }
    setSubmitting(true);
    try {
      let mediaUrl: string | null = null;
      let mediaType: string | null = null;
      if (media) {
        mediaUrl = await uploadFile(media);
        mediaType = media.type.startsWith("video") ? "video" : "image";
      }
      const admin = admins.find(a => a.username === selectedAdmin);
      const { error } = await supabase.from("admin_complaints").insert({
        reporter_uuid: user?.uuid || "",
        reporter_name: user?.name || "",
        admin_username: selectedAdmin,
        admin_name: admin?.display_name || selectedAdmin,
        reason: reason.trim(),
        media_url: mediaUrl,
        media_type: mediaType,
      });
      if (error) throw error;
      setSubmitted(true);
      toast.success("تم إرسال البلاغ بنجاح");
    } catch (err: any) { toast.error(err?.message || "فشل الإرسال"); }
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <div className="mobile-container bg-background flex flex-col items-center justify-center" dir="rtl">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center space-y-4 px-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-lg font-bold text-foreground">تم إرسال البلاغ</h2>
          <p className="text-sm text-muted-foreground">سيتم مراجعة البلاغ من قبل الإدارة العليا</p>
          <button onClick={() => navigate("/dashboard")} className="w-full h-11 rounded-xl border border-border/50 text-foreground font-bold bg-card/50 active:scale-95 transition-transform text-sm">
            العودة للرئيسية
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="mobile-container bg-background flex flex-col" dir="rtl">
      <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 bg-card/80 backdrop-blur-xl border-b border-border/30">
        <motion.button initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} onClick={() => navigate(-1)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/15 border border-primary/30">
          <ArrowRight className="w-5 h-5 text-primary" />
          <span className="text-sm font-semibold text-primary">رجوع</span>
        </motion.button>
        <h1 className="text-sm font-bold text-foreground">بلاغ على أدمن</h1>
        <div className="w-16" />
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4 flex items-center gap-3 bg-gradient-to-br from-red-500/10 to-red-600/5 border border-red-500/20">
          <AlertTriangle className="w-6 h-6 text-red-400" />
          <div>
            <p className="text-sm font-bold text-foreground">بلاغ سري</p>
            <p className="text-[10px] text-muted-foreground">يصل مباشرة للمالك فقط</p>
          </div>
        </motion.div>

        {/* Select Admin */}
        <div className="glass-card p-4 space-y-3">
          <label className="text-sm font-bold text-foreground">اختر الأدمن</label>
          {loading ? (
            <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {admins.map(admin => (
                <button key={admin.username} onClick={() => setSelectedAdmin(admin.username)}
                  className={`p-3 rounded-xl text-xs font-bold border transition-all ${selectedAdmin === admin.username ? "border-primary bg-primary/10 text-primary" : "border-border/30 bg-card/50 text-muted-foreground"}`}>
                  {admin.display_name || admin.username}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Reason */}
        <div className="glass-card p-4 space-y-3">
          <label className="text-sm font-bold text-foreground">سبب البلاغ</label>
          <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="اكتب تفاصيل المشكلة مع الأدمن..." maxLength={1000} rows={4}
            className="w-full px-4 py-3 bg-input rounded-xl text-foreground placeholder:text-muted-foreground border border-border/50 focus:border-primary outline-none text-sm resize-none" />
        </div>

        {/* Media upload */}
        <div className="glass-card p-4 space-y-3">
          <label className="text-sm font-bold text-foreground">مرفق (اختياري)</label>
          {media ? (
            <div className="flex items-center gap-2 p-2 bg-input rounded-lg border border-border/50">
              <span className="text-xs text-foreground truncate flex-1">{media.name}</span>
              <button onClick={() => setMedia(null)} className="text-destructive"><X className="w-4 h-4" /></button>
            </div>
          ) : (
            <label className="flex items-center justify-center gap-2 h-12 bg-input rounded-xl border border-dashed border-border/50 cursor-pointer hover:border-primary/50 transition-colors">
              <Upload className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">صورة أو فيديو (حد 10MB)</span>
              <input type="file" accept="image/*,video/*" onChange={e => { const f = e.target.files?.[0]; if (f && f.size <= 10 * 1024 * 1024) setMedia(f); else if (f) toast.error("حجم الملف كبير"); }} className="hidden" />
            </label>
          )}
        </div>

        {/* Submit */}
        <button onClick={handleSubmit} disabled={submitting || !selectedAdmin || !reason.trim()}
          className="w-full h-12 gold-gradient rounded-xl text-primary-foreground font-bold flex items-center justify-center gap-2 disabled:opacity-40 active:scale-95 transition-transform">
          {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-5 h-5" />إرسال البلاغ</>}
        </button>
      </div>
    </div>
  );
};

export default AdminComplaint;
