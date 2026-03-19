import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Image, Frame, Sparkles, Gift, FileText, Loader2, CheckCircle, Clock, Upload } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import MobileLayout from "@/components/MobileLayout";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import SupportSessionChat from "@/components/SupportSessionChat";
import { startSupportSession } from "@/hooks/use-support-session";

const REQUEST_TYPES = [
  { id: "room_bg", label: "تغيير خلفية غرفتي", emoji: "", icon: Image },
  { id: "frame", label: "طلب إطار", emoji: "🎨", icon: Frame },
  { id: "entry", label: "طلب دخولية", emoji: "", icon: Sparkles },
  { id: "custom_gift", label: "طلب هدية مخصصة", emoji: "", icon: Gift },
  { id: "other", label: "طلب آخر", emoji: "", icon: FileText },
];

const STATUS_MAP: Record<string, { label: string; color: string; emoji: string }> = {
  waiting: { label: "قيد المراجعة", color: "text-yellow-400", emoji: "" },
  active: { label: "قيد المعالجة", color: "text-blue-400", emoji: "" },
  resolved: { label: "تم", color: "text-green-400", emoji: "" },
  closed: { label: "مغلق", color: "text-muted-foreground", emoji: "📁" },
  escalated: { label: "تم التصعيد", color: "text-orange-400", emoji: "" },
};

const HostRequestPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [previousRequests, setPreviousRequests] = useState<any[]>([]);
  const [loadingPrev, setLoadingPrev] = useState(true);

  useEffect(() => {
    if (!user?.uuid) return;
    loadPreviousRequests();
  }, [user?.uuid]);

  const loadPreviousRequests = async () => {
    setLoadingPrev(true);
    try {
      const { data } = await supabase
        .from("support_sessions" as any)
        .select("*")
        .eq("user_uuid", user!.uuid)
        .eq("support_level", 3)
        .order("created_at", { ascending: false })
        .limit(20);
      setPreviousRequests((data as any[]) || []);
    } catch { /* silent */ }
    finally { setLoadingPrev(false); }
  };

  const handleSubmit = async () => {
    if (!user?.uuid || !selectedType) return;
    setSubmitting(true);
    try {
      let fileUrl: string | null = null;
      let fileType: string | null = null;

      if (file) {
        const { secureUpload } = await import("@/utils/secureUpload");
        const ext = file.name.split(".").pop();
        const path = `host-requests/${user.uuid}_${Date.now()}.${ext}`;
        fileUrl = await secureUpload({ file, bucket: "attachments", path, userUuid: user.uuid });
        fileType = file.type.startsWith("image") ? "image" : file.type.startsWith("video") ? "video" : "file";
      }

      const session = await startSupportSession({
        user_uuid: user.uuid,
        user_name: user.name,
        support_level: 3,
        request_type: selectedType,
        notes: notes.trim() || undefined,
        file_url: fileUrl || undefined,
        file_type: fileType || undefined,
      });

      if (session) {
        setActiveSessionId(session.id);
        toast.success("تم إرسال طلبك!");
        loadPreviousRequests();
      }
    } catch (err: any) {
      toast.error(err?.message || "فشل الإرسال");
    } finally {
      setSubmitting(false);
    }
  };

  // Active chat view
  if (activeSessionId) {
    return (
      <MobileLayout showHeader headerTitle="طلبك" onBack={() => setActiveSessionId(null)}>
        <SupportSessionChat
          sessionId={activeSessionId}
          userUuid={user!.uuid}
          userName={user!.name}
          senderType="user"
          showTimer
        />
      </MobileLayout>
    );
  }

  return (
    <MobileLayout showHeader headerTitle="طلبات المضيفات" onBack={() => navigate("/dashboard")}>
      <div className="px-4 py-4 space-y-4" dir="rtl">
        {/* Request type selection */}
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-foreground">اختر نوع الطلب</h3>
          <div className="grid grid-cols-2 gap-2">
            {REQUEST_TYPES.map((type) => {
              const Icon = type.icon;
              const isSelected = selectedType === type.id;
              return (
                <motion.button key={type.id} whileTap={{ scale: 0.96 }}
                  onClick={() => setSelectedType(type.id)}
                  className={`p-3 rounded-2xl text-right flex items-center gap-2 transition-all ${isSelected ? "ring-1 ring-primary" : ""}`}
                  style={{
                    background: isSelected ? "rgba(var(--primary-rgb, 168,85,247), 0.12)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${isSelected ? "rgba(var(--primary-rgb, 168,85,247), 0.3)" : "rgba(255,255,255,0.06)"}`,
                  }}>
                  <span className="text-lg">{type.emoji}</span>
                  <span className="text-xs font-bold">{type.label}</span>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Notes */}
        {selectedType && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
            <h3 className="text-sm font-bold text-foreground">ملاحظات</h3>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="أضف ملاحظات أو تفاصيل..."
              className="w-full rounded-xl p-3 text-sm bg-muted/20 border border-border/20 resize-none h-20"
            />
          </motion.div>
        )}

        {/* File upload */}
        {selectedType && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Upload className="w-4 h-4 text-primary" />
              ملف / صورة (اختياري)
            </h3>
            <input type="file" accept="image/*,video/*,.svga,.webp"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full text-sm file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-primary file:text-primary-foreground bg-muted/20 border border-border/20 rounded-xl p-1"
            />
          </motion.div>
        )}

        {/* Submit */}
        {selectedType && (
          <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            whileTap={{ scale: 0.96 }} onClick={handleSubmit} disabled={submitting}
            className="w-full py-3 rounded-xl font-bold text-sm text-primary-foreground flex items-center justify-center gap-2 disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary)/0.8))" }}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "إرسال الطلب"}
          </motion.button>
        )}

        {/* Previous requests */}
        <div className="space-y-2 pt-2">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            طلباتي السابقة
          </h3>
          {loadingPrev ? (
            <div className="text-center py-6"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></div>
          ) : previousRequests.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">لا توجد طلبات سابقة</p>
          ) : (
            <div className="space-y-2">
              {previousRequests.map((req: any) => {
                const statusInfo = STATUS_MAP[req.status] || STATUS_MAP.waiting;
                const typeInfo = REQUEST_TYPES.find(t => t.id === req.request_type);
                return (
                  <motion.button key={req.id} whileTap={{ scale: 0.98 }}
                    onClick={() => setActiveSessionId(req.id)}
                    className="w-full rounded-2xl p-3 text-right" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span>{typeInfo?.emoji || ""}</span>
                        <span className="text-sm font-bold">{typeInfo?.label || req.request_type}</span>
                      </div>
                      <span className={`text-[10px] font-bold ${statusInfo.color}`}>
                        {statusInfo.emoji} {statusInfo.label}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date(req.created_at).toLocaleString("ar-EG")}
                    </p>
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </MobileLayout>
  );
};

export default HostRequestPage;
