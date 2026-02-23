import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Shield, Loader2, CheckCircle, XCircle, Clock, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";

const BDVerification: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [status, setStatus] = useState<"loading" | "none" | "pending" | "approved" | "rejected">("loading");
  const [loading, setLoading] = useState(false);
  const [rejectionNote, setRejectionNote] = useState("");

  const highestLevel = Math.max(
    user?.level?.charger_level || 0,
    user?.level?.sender_level || 0,
    user?.level?.receiver_level || 0
  );
  const isEligible = highestLevel >= 10;

  useEffect(() => {
    checkAndAutoRegister();
  }, [user?.uuid]);

  const checkAndAutoRegister = async () => {
    if (!user?.uuid) return;
    try {
      // First check existing status
      const { data } = await supabase.functions.invoke("bd-manage", {
        body: { action: "check_status", user_uuid: user.uuid },
      });
      if (data?.status === "approved") {
        navigate("/bd/dashboard", { replace: true });
        return;
      }

      // If eligible and no active BD, auto-register (auto-approved)
      if (isEligible) {
        setLoading(true);
        const { data: regData } = await supabase.functions.invoke("bd-manage", {
          body: {
            action: "register",
            user_uuid: user.uuid,
            user_name: user.name,
            user_level: highestLevel,
          },
        });
        if (regData?.status === "approved" || regData?.already) {
          navigate("/bd/dashboard", { replace: true });
          return;
        }
        if (regData?.error) {
          toast.error(regData.error);
        }
        setLoading(false);
      }

      setStatus(data?.status || "none");
      if (data?.request?.admin_note) setRejectionNote(data.request.admin_note);
    } catch {
      setStatus("none");
    }
  };

  if (!isEligible) {
    return (
      <div className="mobile-container bg-background text-foreground flex flex-col" dir="rtl">
        <header className="flex items-center gap-3 px-4 pt-6 pb-4">
          <button onClick={() => navigate("/dashboard")} className="p-2 rounded-xl hover:bg-muted"><ArrowRight className="w-5 h-5" /></button>
          <h1 className="font-bold text-lg">works</h1>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-4">
          <div className="w-20 h-20 rounded-full bg-orange-500/10 flex items-center justify-center">
            <Shield className="w-10 h-10 text-orange-400" />
          </div>
          <h2 className="text-xl font-bold">غير مؤهل</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            يتطلب الانضمام كمطور أعمال (BD) الوصول للمستوى 10 على الأقل.
            <br />مستواك الحالي: <span className="font-bold text-foreground">{highestLevel}</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-container bg-background text-foreground overflow-y-auto" dir="rtl">
      <header className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button onClick={() => navigate("/dashboard")} className="p-2 rounded-xl hover:bg-muted"><ArrowRight className="w-5 h-5" /></button>
        <h1 className="font-bold text-lg">works</h1>
      </header>

      <main className="px-4 pb-10">
        {status === "loading" && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {status === "none" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="text-center space-y-3 py-6">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Briefcase className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-xl font-bold">هل تريد الانضمام كبيدي؟</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                كمطور أعمال (BD) ستتمكن من بناء فريقك الخاص والحصول على عمولات من شحنات أعضائك.
              </p>
            </div>

            <div className="bg-card border border-border/40 rounded-2xl p-4 space-y-3">
              <h3 className="font-bold text-sm text-primary">مميزات البيدي:</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" /> عمولة 2% من شحنات الداعمين</li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" /> عمولة 5% من دخل الوكلاء</li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" /> لوحة تحكم خاصة بالإحصائيات</li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" /> سحب الأرباح ككوينزات</li>
              </ul>
            </div>

            <Button onClick={checkAndAutoRegister} disabled={loading} className="w-full h-12 text-base font-bold rounded-xl">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "نعم، أوافق وأريد الانضمام"}
            </Button>
          </motion.div>
        )}

        {status === "pending" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-4 py-10">
            <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto">
              <Clock className="w-10 h-10 text-amber-400" />
            </div>
            <h2 className="text-xl font-bold">طلبك قيد المراجعة</h2>
            <p className="text-sm text-muted-foreground">سيتم إبلاغك فور مراجعة طلبك من قبل الإدارة.</p>
          </motion.div>
        )}

        {status === "rejected" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-4 py-10">
            <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
              <XCircle className="w-10 h-10 text-red-400" />
            </div>
            <h2 className="text-xl font-bold">تم رفض طلبك</h2>
            {rejectionNote && <p className="text-sm text-muted-foreground bg-red-500/5 border border-red-500/20 rounded-xl p-3">{rejectionNote}</p>}
            <Button onClick={() => { setStatus("none"); }} variant="outline" className="mt-4">إعادة التقديم</Button>
          </motion.div>
        )}
      </main>
    </div>
  );
};

export default BDVerification;
