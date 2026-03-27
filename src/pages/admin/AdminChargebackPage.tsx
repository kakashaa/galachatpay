import React, { useState, useEffect } from "react";
import { useAdminSession } from "@/hooks/use-admin-session";
import AdminPageLayout from "@/components/AdminPageLayout";
import { Loader2, AlertTriangle, Plus, Trash2, Send, User, DollarSign, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

interface ChargebackRecord {
  id: string;
  uuid: string;
  user_name: string;
  amount_usd: number;
  platform: string;
  description: string;
  status: string;
  created_at: string;
  notified: boolean;
}

const AdminChargebackPage: React.FC = () => {
  const { handleLogout } = useAdminSession();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<ChargebackRecord[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ uuid: "", user_name: "", amount_usd: "", platform: "google_play", description: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadRecords(); }, []);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("chargeback_alerts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      setRecords((data as any[]) || []);
    } catch {}
    setLoading(false);
  };

  const addRecord = async () => {
    if (!form.uuid || !form.amount_usd) return;
    setSaving(true);
    try {
      // Save to Supabase
      const { error } = await supabase.from("chargeback_alerts").insert({
        uuid: form.uuid,
        user_name: form.user_name || `UUID ${form.uuid}`,
        amount_usd: parseFloat(form.amount_usd),
        platform: form.platform,
        description: form.description,
        status: "pending",
        notified: false,
      });
      
      if (!error) {
        // Send WhatsApp notification
        try {
          await fetch("https://hola-chat.com/wares-api.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              key: "ghala2026actions",
              action: "send_whatsapp",
              to: "whatsapp:+17146844346",
              message: `غلا شات 💬\n\n⚠️ تنبيه استرجاع!\n\n👤 المستخدم: ${form.user_name || form.uuid}\n🆔 UUID: ${form.uuid}\n💰 المبلغ: $${form.amount_usd}\n📱 المنصة: ${form.platform === 'google_play' ? 'Google Play' : 'App Store'}\n📝 ${form.description || 'بدون ملاحظات'}\n\nيرجى مراجعة الطلب فوراً!`,
            }),
          });
        } catch {}
        
        setForm({ uuid: "", user_name: "", amount_usd: "", platform: "google_play", description: "" });
        setShowAdd(false);
        loadRecords();
      }
    } catch {}
    setSaving(false);
  };

  const deleteRecord = async (id: string) => {
    await supabase.from("chargeback_alerts").delete().eq("id", id);
    loadRecords();
  };

  const resendNotification = async (record: ChargebackRecord) => {
    try {
      await fetch("https://hola-chat.com/wares-api.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "ghala2026actions",
          action: "send_whatsapp",
          to: "whatsapp:+17146844346",
          message: `غلا شات 💬\n\n⚠️ تذكير استرجاع!\n\n👤 ${record.user_name}\n🆔 UUID: ${record.uuid}\n💰 $${record.amount_usd}\n📱 ${record.platform === 'google_play' ? 'Google Play' : 'App Store'}`,
        }),
      });
      await supabase.from("chargeback_alerts").update({ notified: true }).eq("id", record.id);
      loadRecords();
    } catch {}
  };

  const glassCard = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 4px 16px -4px rgba(0,0,0,0.3)' };

  return (
    <AdminPageLayout title="تنبيهات الاسترجاع" accentColor="hsl(0 84% 60%)" onLogout={handleLogout}>
      <div className="max-w-[448px] mx-auto p-4 space-y-4" dir="rtl">
        
        {/* Header + Add Button */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" /> سجل الاسترجاعات
          </h3>
          <button onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/15 text-red-400 text-xs font-bold">
            <Plus className="w-3.5 h-3.5" /> إضافة
          </button>
        </div>

        {/* Add Form */}
        <AnimatePresence>
          {showAdd && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              className="rounded-2xl p-4 space-y-3 overflow-hidden" style={{ ...glassCard, borderColor: 'rgba(239,68,68,0.2)' }}>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground">UUID المستخدم *</label>
                  <input value={form.uuid} onChange={e => setForm({...form, uuid: e.target.value})}
                    className="w-full bg-background/50 border border-border/30 rounded-lg px-2 py-1.5 text-xs text-foreground" placeholder="مثال: 4014704" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground">اسم المستخدم</label>
                  <input value={form.user_name} onChange={e => setForm({...form, user_name: e.target.value})}
                    className="w-full bg-background/50 border border-border/30 rounded-lg px-2 py-1.5 text-xs text-foreground" placeholder="اختياري" />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground">المبلغ $ *</label>
                  <input type="number" value={form.amount_usd} onChange={e => setForm({...form, amount_usd: e.target.value})}
                    className="w-full bg-background/50 border border-border/30 rounded-lg px-2 py-1.5 text-xs text-foreground" placeholder="0.00" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground">المنصة</label>
                  <select value={form.platform} onChange={e => setForm({...form, platform: e.target.value})}
                    className="w-full bg-background/50 border border-border/30 rounded-lg px-2 py-1.5 text-xs text-foreground">
                    <option value="google_play">Google Play</option>
                    <option value="app_store">App Store</option>
                    <option value="payermax">PayerMax</option>
                    <option value="other">أخرى</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground">ملاحظات</label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                  className="w-full bg-background/50 border border-border/30 rounded-lg px-2 py-1.5 text-xs text-foreground resize-none" rows={2} placeholder="تفاصيل إضافية..." />
              </div>

              <button onClick={addRecord} disabled={saving || !form.uuid || !form.amount_usd}
                className="w-full py-2 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "⚠️ تسجيل + إرسال تنبيه واتساب"}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Records */}
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-red-400" /></div>
        ) : records.length === 0 ? (
          <div className="text-center py-12">
            <AlertTriangle className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">لا توجد تنبيهات استرجاع</p>
          </div>
        ) : (
          <div className="space-y-2">
            {records.map((r, i) => (
              <motion.div key={r.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                className="rounded-xl p-3" style={glassCard}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-500/15">
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">{r.user_name}</p>
                      <p className="text-[10px] text-muted-foreground">UUID: {r.uuid}</p>
                    </div>
                  </div>
                  <p className="text-sm font-black text-red-400">${r.amount_usd}</p>
                </div>
                
                <div className="flex items-center gap-2 mt-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-muted/10 text-muted-foreground">
                    {r.platform === 'google_play' ? 'Google Play' : r.platform === 'app_store' ? 'App Store' : r.platform}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString('ar-SA')}</span>
                  {r.notified && <span className="text-[10px] text-emerald-400">✅ تم الإبلاغ</span>}
                </div>
                
                {r.description && <p className="text-[10px] text-muted-foreground mt-1">{r.description}</p>}
                
                <div className="flex items-center gap-1.5 mt-2">
                  <button onClick={() => resendNotification(r)}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-[10px]">
                    <Send className="w-3 h-3" /> إرسال تنبيه
                  </button>
                  <button onClick={() => deleteRecord(r.id)}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/10 text-red-400 text-[10px]">
                    <Trash2 className="w-3 h-3" /> حذف
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AdminPageLayout>
  );
};

export default AdminChargebackPage;
