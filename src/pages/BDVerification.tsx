import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Shield, Loader2, CheckCircle, XCircle, Clock, Briefcase, Lock, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface BanInfo {
  banned_at: string;
  unban_date: string;
  days_remaining: number;
}

const BDVerification: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [status, setStatus] = useState<"loading" | "none" | "pending" | "approved" | "rejected" | "banned" | "is_member" | "device_blocked">("loading");
  const [loading, setLoading] = useState(false);
  const [rejectionNote, setRejectionNote] = useState("");
  const [banInfo, setBanInfo] = useState<BanInfo | null>(null);
  const [memberBdName, setMemberBdName] = useState("");
  

  const highestLevel = Math.max(
    user?.level?.charger_level || 0,
    user?.level?.sender_level || 0,
    user?.level?.receiver_level || 0
  );
  const isEligible = highestLevel >= 10;

  useEffect(() => {
    checkStatus();
  }, [user?.uuid]);

  const checkStatus = async () => {
    if (!user?.uuid) return;
    try {
      // Check if user is a member under another BD
      const { data: memberData } = await supabase
        .from("bd_members")
        .select("bd_uuid, bd_uuid")
        .eq("member_uuid", user.uuid)
        .eq("is_active", true)
        .maybeSingle();

      if (memberData) {
        // Get BD name
        const { data: bdData } = await supabase
          .from("bd_commission_settings")
          .select("bd_name")
          .eq("bd_uuid", memberData.bd_uuid)
          .maybeSingle();
        setMemberBdName(bdData?.bd_name || "بيدي");
        setStatus("is_member");
        return;
      }

      // Check device restriction - is another BD registered on this device?
      const deviceId = localStorage.getItem("gala_device_id");
      if (deviceId) {
        const { data: deviceUsers } = await supabase
          .from("user_devices")
          .select("user_uuid")
          .eq("device_id", deviceId);
        
        if (deviceUsers && deviceUsers.length > 0) {
          const otherUuids = deviceUsers.map(d => d.user_uuid).filter(u => u !== user.uuid);
          if (otherUuids.length > 0) {
            // Check if any of these other users are active BDs
            const { data: existingBds } = await supabase
              .from("bd_commission_settings")
              .select("bd_uuid, bd_name")
              .in("bd_uuid", otherUuids)
              .eq("is_active", true);
            
            if (existingBds && existingBds.length > 0) {
              setStatus("device_blocked");
              return;
            }
          }
        }
      }

      const { data } = await supabase.functions.invoke("bd-manage", {
        body: { action: "check_status", user_uuid: user.uuid },
      });

      const responseData = typeof data === 'string' ? JSON.parse(data) : data;

      if (responseData?.status === "banned") {
        setStatus("banned");
        setBanInfo({
          banned_at: responseData.banned_at,
          unban_date: responseData.unban_date,
          days_remaining: responseData.days_remaining,
        });
        return;
      }

      if (responseData?.status === "approved") {
        navigate("/bd/dashboard", { replace: true });
        return;
      }

      setStatus(responseData?.status || "none");
      if (responseData?.request?.admin_note) setRejectionNote(responseData.request.admin_note);
    } catch {
      setStatus("none");
    }
  };

  const handleJoinRequest = async () => {
    if (!user?.uuid) return;
    setLoading(true);
    try {
      const { data: regData } = await supabase.functions.invoke("bd-manage", {
        body: {
          action: "register",
          user_uuid: user.uuid,
          user_name: user.name,
          user_level: highestLevel,
        },
      });
      const regResponse = typeof regData === 'string' ? JSON.parse(regData) : regData;
      if (regResponse?.status === "approved" || regResponse?.already) {
        navigate("/bd/dashboard", { replace: true });
        return;
      }
      if (regResponse?.error) {
        toast.error(regResponse.error);
        setLoading(false);
        return;
      }
      setStatus("pending");
      toast.success("تم إرسال طلبك بنجاح! سيتم مراجعته من قبل الإدارة.");
    } catch {
      toast.error("حدث خطأ، حاول مرة أخرى");
    }
    setLoading(false);
  };

  if (!isEligible && status !== "banned") {
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

        {status === "is_member" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-5 py-10">
            <div className="w-20 h-20 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto">
              <Users className="w-10 h-10 text-blue-400" />
            </div>
            <h2 className="text-xl font-bold">أنت عضو في فريق بيدي</h2>
            <p className="text-sm text-muted-foreground leading-relaxed px-4">
              حسابك مسجل كعضو ضمن فريق البيدي <span className="font-bold text-foreground">{memberBdName}</span>.
              <br />لا يمكنك التسجيل كبيدي مستقل وأنت عضو في فريق آخر.
            </p>
            <Button onClick={() => navigate("/dashboard")} variant="outline" className="mt-4 rounded-xl">
              العودة للصفحة الرئيسية
            </Button>
          </motion.div>
        )}

        {status === "device_blocked" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-5 py-10">
            <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <Shield className="w-10 h-10 text-destructive" />
            </div>
            <h2 className="text-xl font-bold">الجهاز مسجل لبيدي آخر</h2>
            <p className="text-sm text-muted-foreground leading-relaxed px-4">
              يوجد حساب بيدي آخر مسجل على هذا الجهاز.
              <br />لا يمكن تسجيل أكثر من حساب بيدي واحد على نفس الجهاز.
            </p>
            <Button onClick={() => navigate("/dashboard")} variant="outline" className="mt-4 rounded-xl">
              العودة للصفحة الرئيسية
            </Button>
          </motion.div>
        )}

        {status === "banned" && banInfo && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6 py-6">
            <div className="text-center space-y-4">
              <motion.div 
                initial={{ scale: 0 }} 
                animate={{ scale: 1 }} 
                transition={{ type: "spring", delay: 0.2 }}
                className="w-24 h-24 rounded-full bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center mx-auto"
              >
                <Lock className="w-12 h-12 text-red-500" />
              </motion.div>
              <h2 className="text-xl font-bold text-red-400">⛔ تم إيقاف البيدي</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                تم رفضك كبيدي لأنك خالفت الشروط والأحكام الخاصة بنظام البيدي.
              </p>
            </div>

            <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-5 space-y-4">
              <div className="text-center space-y-1">
                <p className="text-xs text-muted-foreground">سبب الإيقاف</p>
                <p className="text-sm font-bold text-red-400">3 مخالفات متكررة (محاولة دعوة حسابات قديمة)</p>
              </div>
              
              <div className="h-px bg-border/40" />

              <div className="text-center space-y-1">
                <p className="text-xs text-muted-foreground">تاريخ الإيقاف</p>
                <p className="text-sm font-bold text-foreground">
                  {new Date(banInfo.banned_at).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" })}
                </p>
              </div>

              <div className="h-px bg-border/40" />

              <div className="text-center space-y-1">
                <p className="text-xs text-muted-foreground">سيتم فتح النظام تلقائياً في</p>
                <p className="text-sm font-bold text-foreground">
                  {new Date(banInfo.unban_date).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" })}
                </p>
              </div>

              <div className="h-px bg-border/40" />

              <div className="flex items-center justify-center gap-2">
                <motion.div 
                  animate={{ scale: [1, 1.1, 1] }} 
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center"
                >
                  <Clock className="w-6 h-6 text-amber-400" />
                </motion.div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-amber-400">{banInfo.days_remaining}</p>
                  <p className="text-xs text-muted-foreground">يوم متبقي</p>
                </div>
              </div>
            </div>

            <div className="bg-muted/30 border border-border/40 rounded-xl p-3">
              <p className="text-xs text-muted-foreground text-center leading-relaxed">
                💡 بعد انتهاء فترة الإيقاف، ستتمكن من استخدام نظام البيدي مجدداً. يرجى الالتزام بالشروط لتجنب الإيقاف مرة أخرى.
              </p>
            </div>

            <Button 
              onClick={() => navigate("/dashboard")} 
              variant="outline" 
              className="w-full h-12 rounded-xl"
            >
              العودة للصفحة الرئيسية
            </Button>
          </motion.div>
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

            <Button onClick={handleJoinRequest} disabled={loading} className="w-full h-12 text-base font-bold rounded-xl">
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
