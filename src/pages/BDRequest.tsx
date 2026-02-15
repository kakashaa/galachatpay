import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Briefcase, User, Crown, Send, CheckCircle, Upload, Image, X, FileText, Clock } from "lucide-react";
import MobileLayout from "@/components/MobileLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type BDStatus = "none" | "pending" | "approved" | "rejected";

const BDRequest: React.FC = () => {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const [experience, setExperience] = useState("");
  const [hostsCount, setHostsCount] = useState("");
  const [agentsCount, setAgentsCount] = useState("");
  const [previousBD, setPreviousBD] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bdStatus, setBdStatus] = useState<BDStatus>("none");

  useEffect(() => {
    if (!authUser) return;
    checkExistingRequest();

    // Realtime: watch for approval in bd_commission_settings
    const channel = supabase
      .channel('bd-approval-watch')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bd_commission_settings',
          filter: `bd_uuid=eq.${authUser.uuid}`,
        },
        (payload: any) => {
          if (payload.new?.is_approved) {
            setBdStatus("approved");
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bd_requests_cache',
          filter: `user_uuid=eq.${authUser.uuid}`,
        },
        (payload: any) => {
          if (payload.new?.status === 1) {
            setBdStatus("approved");
          } else if (payload.new?.status === 2) {
            setBdStatus("rejected");
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [authUser]);

  const checkExistingRequest = async () => {
    try {
      // First check via bd-manage edge function (handles ID migration automatically)
      try {
        const { data: bdResult } = await supabase.functions.invoke("bd-manage", {
          body: { action: "get_bd_info", bd_uuid: authUser!.uuid },
        });
        if (bdResult?.success) {
          setBdStatus("approved");
          return;
        }
      } catch {}

      // Fallback: check local bd_commission_settings
      const { data: bdSettings } = await supabase
        .from("bd_commission_settings")
        .select("is_approved")
        .eq("bd_uuid", authUser!.uuid)
        .maybeSingle();
      
      if (bdSettings?.is_approved) {
        setBdStatus("approved");
        return;
      }

      // Also check local bd_requests_cache
      const { data: cachedRequests } = await supabase
        .from("bd_requests_cache")
        .select("status")
        .eq("user_uuid", authUser!.uuid)
        .eq("request_type", "bd_verify")
        .order("created_at", { ascending: false })
        .limit(1);

      if (cachedRequests && cachedRequests.length > 0) {
        const latest = cachedRequests[0];
        if (latest.status === 1) {
          setBdStatus("approved");
          return;
        } else if (latest.status === 2) {
          setBdStatus("rejected");
          return;
        } else if (latest.status === 0) {
          setBdStatus("pending");
          return;
        }
      }

      // Fallback: check external API
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gala-actions?action=list-requests&request_type=bd_verify&user_uuid=${authUser!.uuid}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            signal: controller.signal,
          }
        );
        clearTimeout(timeoutId);
        if (response.ok) {
          const data = await response.json();
          if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
            const userRequests = data.data.filter(
              (r: any) => String(r.user_uuid) === String(authUser!.uuid)
            );
            if (userRequests.length > 0) {
              const latest = userRequests[0];
              if (latest.status === "approved" || latest.status === 1) setBdStatus("approved");
              else if (latest.status === "pending" || latest.status === 0) setBdStatus("pending");
              else if (latest.status === "rejected" || latest.status === 2) setBdStatus("rejected");
              else setBdStatus("none");
            } else setBdStatus("none");
          } else setBdStatus("none");
        } else setBdStatus("none");
      } catch {
        setBdStatus("none");
      }
    } catch (err) {
      console.error("checkExistingRequest error:", err);
      setBdStatus("none");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setAttachment(file);
  };

  const handleSubmit = async () => {
    if (!experience.trim() || !hostsCount || !agentsCount || !previousBD || !authUser) return;
    if (previousBD === "yes" && !attachment) return;
    setSubmitting(true);
    try {
      let documentUrl = "";
      if (attachment) {
        const fileName = `bd/${authUser.uuid}_${Date.now()}_${attachment.name}`;
        const { secureUpload } = await import("@/utils/secureUpload");
        documentUrl = await secureUpload({
          file: attachment,
          bucket: "attachments",
          path: fileName,
          userUuid: authUser.uuid,
        });
      }

      const { error } = await supabase.functions.invoke("gala-actions?action=submit-request", {
        body: {
          user_uuid: authUser.uuid,
          user_name: authUser.name,
          request_type: "bd_verify",
          details: {
            description: `خبرة: ${experience.trim()} | مضيفين: ${hostsCount} | وكلاء: ${agentsCount} | BD سابق: ${previousBD === "yes" ? "نعم" : "لا"}`,
            document_url: documentUrl,
          },
        },
      });
      if (error) throw error;
      setSubmitted(true);
      toast.success("تم إرسال الطلب بنجاح");
    } catch (err: any) {
      toast.error(err?.message || "فشل إرسال الطلب");
    } finally {
      setSubmitting(false);
    }
  };

  const isFormValid = experience.trim() && hostsCount && agentsCount && previousBD && (previousBD === "no" || attachment);

  // Approved → show congrats once, then always redirect to /bd/info
  const bdSeenKey = authUser ? `bd_approved_seen_${authUser.uuid}` : "";
  const [showCongrats, setShowCongrats] = useState(false);

  useEffect(() => {
    if (bdStatus === "approved" && authUser && bdSeenKey) {
      if (localStorage.getItem(bdSeenKey)) {
        // Already seen → go directly to BD info
        navigate("/bd/info", { replace: true });
      } else {
        // First time → show congrats and mark as seen
        localStorage.setItem(bdSeenKey, "1");
        setShowCongrats(true);
      }
    }
  }, [bdStatus, authUser]);

  if (bdStatus === "approved") {
    if (!showCongrats) return null; // waiting for useEffect redirect

    return (
      <MobileLayout showHeader headerTitle="طلب BD" onBack={() => navigate("/dashboard")}>
        <div className="flex flex-col items-center justify-center px-6 py-20">
          <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mb-6">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-lg font-bold text-foreground mb-2">تم قبول طلبك كـ BD 🎉</h2>
          <p className="text-sm text-muted-foreground mb-6 text-center">يمكنك الآن الوصول إلى لوحة تقارير BD الخاصة بك</p>
          <Button onClick={() => navigate("/bd/info", { replace: true })} className="gold-gradient text-primary-foreground font-bold">
            <Briefcase className="w-5 h-5 ml-2" /> فتح لوحة BD
          </Button>
        </div>
      </MobileLayout>
    );
  }

  // Pending → show waiting message
  if (bdStatus === "pending") {
    return (
      <MobileLayout showHeader headerTitle="طلب BD" onBack={() => navigate("/dashboard")}>
        <div className="flex flex-col items-center justify-center px-6 py-20">
          <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mb-6">
            <Clock className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-lg font-bold text-foreground mb-2">لقد قدمت طلباً مسبقاً</h2>
          <p className="text-sm text-muted-foreground text-center mb-2">طلبك قيد المراجعة حالياً، يرجى الانتظار حتى يتم الرد عليه.</p>
          <p className="text-xs text-muted-foreground text-center">سيتم إشعارك عند قبول أو رفض الطلب</p>
          <Button onClick={() => navigate("/dashboard")} variant="outline" className="mt-8">
            العودة للرئيسية
          </Button>
        </div>
      </MobileLayout>
    );
  }

  if (submitted) {
    return (
      <MobileLayout showHeader headerTitle="طلب BD" onBack={() => navigate("/dashboard")}>
        <div className="flex flex-col items-center justify-center px-6 py-20">
          <div className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center mb-6 css-scale-up">
            <CheckCircle className="w-10 h-10 text-success" />
          </div>
          <div className="text-center css-fade-up-d3">
            <h2 className="text-lg font-bold text-foreground mb-2">تم إرسال طلبك بنجاح</h2>
            <p className="text-sm text-muted-foreground">سيتم مراجعة طلبك وإشعارك بالنتيجة</p>
          </div>
          <div className="css-fade-up-d5">
            <Button onClick={() => navigate("/dashboard")} className="mt-8 gold-gradient text-primary-foreground font-bold">
              العودة للرئيسية
            </Button>
          </div>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout showHeader headerTitle="طلب BD" onBack={() => navigate("/dashboard")}>
      <div className="px-5 py-4 space-y-5">
        {/* Rejected notice */}
        {bdStatus === "rejected" && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3 flex items-start gap-2">
            <X className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
            <p className="text-xs text-destructive">تم رفض طلبك السابق. يمكنك إعادة التقديم مع تعديل البيانات.</p>
          </div>
        )}

        <div className="glass-card p-4 space-y-3 css-fade-up">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <User className="w-4 h-4 text-primary" /> معلومات الحساب
          </h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex justify-between bg-muted/30 rounded-lg p-2.5">
              <span className="text-muted-foreground">ID</span>
              <span className="font-bold text-foreground">{authUser?.uuid}</span>
            </div>
            <div className="flex justify-between bg-muted/30 rounded-lg p-2.5">
              <span className="text-muted-foreground">المستوى</span>
              <span className="font-bold text-foreground">{authUser?.level?.charger_level ?? 0}</span>
            </div>
            <div className="flex justify-between bg-muted/30 rounded-lg p-2.5">
              <span className="text-muted-foreground">الاسم</span>
              <span className="font-bold text-foreground">{authUser?.name}</span>
            </div>
            <div className="flex justify-between bg-muted/30 rounded-lg p-2.5">
              <span className="text-muted-foreground">VIP</span>
              <span className="font-bold text-primary flex items-center gap-1">
                <Crown className="w-3 h-3" /> {String(authUser?.vip?.vip_level ?? authUser?.vip?.level ?? 0)}
              </span>
            </div>
          </div>
        </div>

        <div className="glass-card p-4 space-y-3 css-fade-up-d1">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-primary" /> معلومات الخبرة
          </h3>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">كم خبرة لديك في العمل؟</Label>
            <Textarea value={experience} onChange={(e) => setExperience(e.target.value.slice(0, 300))} placeholder="اكتب سنوات خبرتك أو وصف خبرتك السابقة..." className="bg-muted/30 border-border/30 min-h-[80px] text-sm resize-none" dir="rtl" />
            <p className="text-[10px] text-muted-foreground text-left">{experience.length}/300</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">كم عدد المضيفين تستطيع جلبهم في أول شهر؟</Label>
            <Input type="number" min="0" value={hostsCount} onChange={(e) => setHostsCount(e.target.value)} placeholder="عدد المضيفين" className="h-11 bg-muted/30 border-border/30 text-center" dir="ltr" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">كم وكلاء مضيفين تستطيع جلبهم في أول شهر؟</Label>
            <Input type="number" min="0" value={agentsCount} onChange={(e) => setAgentsCount(e.target.value)} placeholder="عدد الوكلاء" className="h-11 bg-muted/30 border-border/30 text-center" dir="ltr" />
          </div>
        </div>

        <div className="glass-card p-4 space-y-3 css-fade-up-d2">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" /> هل سبق أن عملت كـ BD من قبل؟
          </h3>
          <RadioGroup value={previousBD} onValueChange={setPreviousBD} className="space-y-2">
            <Label htmlFor="bd-yes" className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${previousBD === "yes" ? "border-primary bg-primary/10" : "border-border/30 bg-muted/20 hover:bg-muted/40"}`}>
              <RadioGroupItem value="yes" id="bd-yes" />
              <span className="text-sm font-bold text-foreground">نعم</span>
            </Label>
            <Label htmlFor="bd-no" className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${previousBD === "no" ? "border-primary bg-primary/10" : "border-border/30 bg-muted/20 hover:bg-muted/40"}`}>
              <RadioGroupItem value="no" id="bd-no" />
              <span className="text-sm font-bold text-foreground">لا</span>
            </Label>
          </RadioGroup>
        </div>

        {previousBD === "yes" && (
          <div className="glass-card p-4 space-y-3 css-fade-up">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Image className="w-4 h-4 text-primary" /> صورة تثبت الخبرة السابقة
            </h3>
            <p className="text-[11px] text-muted-foreground">مطلوب رفع صورة أو مستند يثبت خبرتك السابقة كـ BD</p>
            {!attachment ? (
              <label className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-border/40 rounded-xl cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all">
                <Upload className="w-8 h-8 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">اضغط لرفع ملف</span>
                <input type="file" accept="image/*,.pdf" onChange={handleFileChange} className="hidden" />
              </label>
            ) : (
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                <div className="flex items-center gap-2 min-w-0">
                  <Image className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-xs text-foreground truncate">{attachment.name}</span>
                </div>
                <button onClick={() => setAttachment(null)} className="p-1 hover:bg-destructive/10 rounded-lg transition-colors">
                  <X className="w-4 h-4 text-destructive" />
                </button>
              </div>
            )}
          </div>
        )}

        <div className="css-fade-up-d3">
          <Button onClick={handleSubmit} disabled={!isFormValid || submitting} className="w-full gold-gradient text-primary-foreground font-bold h-12 text-base disabled:opacity-40">
            {submitting ? (
              <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              <>
                <Send className="w-5 h-5 ml-2" /> إرسال الطلب
              </>
            )}
          </Button>
        </div>
      </div>
    </MobileLayout>
  );
};

export default BDRequest;