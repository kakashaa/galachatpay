import React, { useState, useEffect, useCallback } from "react";
import { useAdminPageLog } from "@/hooks/use-admin-page-log";
import { useAdminSession } from "@/hooks/use-admin-session";
import { supabase } from "@/integrations/supabase/client";
import AdminPageLayout from "@/components/AdminPageLayout";
import { toast } from "sonner";
import {
  Search, ShieldCheck, Trash2, Send, Loader2, Phone, Hash, Calendar,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useConfirmModal } from "@/hooks/use-confirm-modal";

const formatDate = (d: string | null) => {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("ar-SA", {
      year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  } catch { return String(d); }
};

const glassCard = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.06)",
  boxShadow: "0 4px 16px -4px rgba(0,0,0,0.3)",
};

interface VerifiedPhone {
  id: string;
  uuid: string;
  phone: string;
  verified_at: string;
}

const AdminVerifiedPhonesPage: React.FC = () => {
  useAdminPageLog("/admin/verified-phones");
  const { handleLogout } = useAdminSession();
  const { confirm, ConfirmDialog } = useConfirmModal();

  const [phones, setPhones] = useState<VerifiedPhone[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastProgress, setBroadcastProgress] = useState({ current: 0, total: 0 });
  const [removingId, setRemovingId] = useState<string | null>(null);

  const fetchPhones = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("verified_phones")
        .select("*")
        .order("verified_at", { ascending: false });
      if (error) throw error;
      setPhones(data || []);
    } catch (err: any) {
      toast.error("خطأ في تحميل البيانات: " + (err.message || ""));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPhones(); }, [fetchPhones]);

  const filtered = phones.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    return p.uuid?.toLowerCase().includes(q) || p.phone?.includes(q);
  });

  const handleRemove = async (phone: VerifiedPhone) => {
    const ok = await confirm({
      title: "إلغاء التوثيق",
      message: `هل أنت متأكد من إلغاء توثيق ${phone.phone}؟`,
      danger: true,
      confirmText: "إلغاء التوثيق",
      cancelText: "تراجع",
    });
    if (!ok) return;

    setRemovingId(phone.id);
    try {
      const { error } = await (supabase as any)
        .from("verified_phones")
        .delete()
        .eq("id", phone.id);
      if (error) throw error;
      setPhones((prev) => prev.filter((p) => p.id !== phone.id));
      toast.success("تم إلغاء التوثيق بنجاح");
    } catch (err: any) {
      toast.error("خطأ: " + (err.message || ""));
    } finally {
      setRemovingId(null);
    }
  };

  const handleBroadcast = async () => {
    if (!broadcastMsg.trim()) {
      toast.error("اكتب الرسالة أولاً");
      return;
    }
    if (phones.length === 0) {
      toast.error("لا يوجد أرقام موثقة");
      return;
    }

    const ok = await confirm({
      title: "إرسال رسالة جماعية",
      message: `سيتم إرسال الرسالة إلى ${phones.length} رقم موثق. متأكد؟`,
      confirmText: "إرسال للجميع",
      cancelText: "تراجع",
    });
    if (!ok) return;

    setBroadcasting(true);
    setBroadcastProgress({ current: 0, total: phones.length });
    let sent = 0;
    let failed = 0;

    for (let i = 0; i < phones.length; i++) {
      try {
        const res = await fetch("https://hola-chat.com/project-z/api.php", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "send_whatsapp",
            admin_key: "ghala2026owner",
            phone: phones[i].phone,
            message: broadcastMsg.trim(),
          }),
        });
        if (res.ok) sent++;
        else failed++;
      } catch {
        failed++;
      }
      setBroadcastProgress({ current: i + 1, total: phones.length });
      // Rate limit: 1 message per second
      if (i < phones.length - 1) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    setBroadcasting(false);
    setBroadcastMsg("");
    toast.success(`تم الإرسال: ${sent} نجح، ${failed} فشل`);
  };

  return (
    <AdminPageLayout
      title="الحسابات الموثقة"
      accentColor="hsl(45 93% 47%)"
      onLogout={handleLogout}
    >
      {ConfirmDialog}
      <div className="max-w-4xl mx-auto p-4 space-y-5" dir="rtl">
        {/* Stats */}
        <div
          className="rounded-2xl p-5 flex items-center gap-4"
          style={{
            ...glassCard,
            borderColor: "rgba(245,158,11,0.2)",
            background: "linear-gradient(135deg, rgba(245,158,11,0.08), rgba(245,158,11,0.02))",
          }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}
          >
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
          <div>
            <p className="text-3xl font-black text-amber-400">{phones.length}</p>
            <p className="text-xs text-muted-foreground">حساب موثق</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="بحث بالآيدي أو رقم الهاتف..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10 bg-white/5 border-white/10 text-sm"
          />
        </div>

        {/* Broadcast */}
        <div
          className="rounded-2xl p-4 space-y-3"
          style={{
            ...glassCard,
            borderColor: "rgba(245,158,11,0.15)",
          }}
        >
          <p className="text-sm font-bold text-amber-400 flex items-center gap-2">
            <Send className="w-4 h-4" />
            إرسال رسالة جماعية (واتساب)
          </p>
          <Textarea
            placeholder="اكتب الرسالة هنا..."
            value={broadcastMsg}
            onChange={(e) => setBroadcastMsg(e.target.value)}
            className="bg-white/5 border-white/10 text-sm min-h-[80px]"
            disabled={broadcasting}
          />
          <div className="flex items-center gap-3">
            <button
              onClick={handleBroadcast}
              disabled={broadcasting || !broadcastMsg.trim()}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40"
              style={{
                background: broadcasting
                  ? "rgba(245,158,11,0.3)"
                  : "linear-gradient(135deg, #f59e0b, #d97706)",
              }}
            >
              {broadcasting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  جاري الإرسال {broadcastProgress.current}/{broadcastProgress.total}
                </span>
              ) : (
                "إرسال للجميع"
              )}
            </button>
            {broadcasting && (
              <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${(broadcastProgress.current / broadcastProgress.total) * 100}%`,
                    background: "linear-gradient(90deg, #f59e0b, #d97706)",
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            {searchQuery ? "لا توجد نتائج" : "لا يوجد حسابات موثقة"}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((phone) => (
              <div
                key={phone.id}
                className="rounded-xl p-4 flex items-center gap-3 group hover:border-amber-500/20 transition-colors"
                style={glassCard}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "rgba(245,158,11,0.12)" }}
                >
                  <ShieldCheck className="w-5 h-5 text-amber-400" />
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <Hash className="w-3 h-3 text-muted-foreground" />
                    <span className="font-mono text-xs text-foreground truncate">{phone.uuid}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground" dir="ltr">{phone.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    {formatDate(phone.verified_at)}
                  </div>
                </div>
                <button
                  onClick={() => handleRemove(phone)}
                  disabled={removingId === phone.id}
                  className="px-3 py-2 rounded-lg text-xs font-bold text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40 flex items-center gap-1.5"
                >
                  {removingId === phone.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  إلغاء التوثيق
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminPageLayout>
  );
};

export default AdminVerifiedPhonesPage;
