import React, { useState } from "react";
import { Star, Loader2 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  adminUsername: string;
  adminName: string;
  userUuid: string;
  userName: string;
  serviceType?: string;
}

const AdminRatingDialog: React.FC<Props> = ({ open, onClose, adminUsername, adminName, userUuid, userName, serviceType }) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (rating === 0) { toast.error("اختر تقييم"); return; }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("admin_ratings").insert({
        user_uuid: userUuid,
        user_name: userName,
        admin_username: adminUsername,
        admin_name: adminName,
        rating,
        comment: comment.trim() || null,
        service_type: serviceType || null,
      });
      if (error) throw error;
      toast.success("شكراً لتقييمك!");
      onClose();
    } catch { toast.error("فشل الإرسال"); }
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-xs p-6 rounded-2xl bg-background border-border" dir="rtl">
        <div className="space-y-4 text-center">
          <p className="text-sm font-bold text-foreground">كيف كانت تجربتك مع {adminName}؟</p>
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} onClick={() => setRating(n)} className="transition-transform active:scale-90">
                <Star className={`w-8 h-8 ${n <= rating ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"}`} />
              </button>
            ))}
          </div>
          <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="تعليقك (اختياري)..." maxLength={500} rows={2}
            className="w-full px-3 py-2 bg-input rounded-xl text-foreground placeholder:text-muted-foreground border border-border/50 focus:border-primary outline-none text-sm resize-none" />
          <button onClick={submit} disabled={submitting || rating === 0}
            className="w-full py-2.5 rounded-xl font-bold text-sm text-primary-foreground gold-gradient disabled:opacity-40 flex items-center justify-center gap-2">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "إرسال التقييم"}
          </button>
          <button onClick={onClose} className="text-xs text-muted-foreground">تخطي</button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdminRatingDialog;
