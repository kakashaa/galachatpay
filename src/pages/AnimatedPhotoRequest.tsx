import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { PlayCircle, User, Shield, Send, CheckCircle, Star, Upload, Image } from "lucide-react";
import PulsingHelpIcon from "@/components/PulsingHelpIcon";
import MobileLayout from "@/components/MobileLayout";
import { Button } from "@/components/ui/button";

import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const getDurationConfig = (user: { level: { charger_level: number; sender_level: number; receiver_level: number } } | null) => {
  if (!user) return null;
  const maxLevel = Math.max(user.level.charger_level, user.level.sender_level, user.level.receiver_level);
  if (maxLevel >= 50) return { days: 0, label: "مؤبدة (دائمة)", eligible: true };
  if (maxLevel >= 40) return { days: 60, label: "60 يوم", eligible: true };
  if (maxLevel >= 30) return { days: 30, label: "30 يوم", eligible: true };
  return { days: 0, label: "غير مؤهل", eligible: false };
};

const AnimatedPhotoRequest: React.FC = () => {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [gifFile, setGifFile] = useState<File | null>(null);
  const [gifPreview, setGifPreview] = useState<string | null>(null);
  const [alreadyRequested, setAlreadyRequested] = useState(false);
  const [checking, setChecking] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const durationConfig = getDurationConfig(authUser);
  const maxLevel = authUser ? Math.max(authUser.level.charger_level, authUser.level.sender_level, authUser.level.receiver_level) : 0;

  // Check if user already submitted
  useEffect(() => {
    if (!authUser?.uuid) { setChecking(false); return; }
    const check = async () => {
      const { data } = await supabase
        .from("animated_photo_requests")
        .select("id")
        .eq("user_uuid", authUser.uuid)
        .limit(1);
      setAlreadyRequested((data?.length ?? 0) > 0);
      setChecking(false);
    };
    check();
  }, [authUser?.uuid]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "image/gif") {
      toast.error("يجب أن تكون الصورة بصيغة GIF فقط");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("حجم الصورة يجب أن لا يتجاوز 10 ميغابايت");
      return;
    }
    setGifFile(file);
    setGifPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!gifFile || !durationConfig?.eligible || !authUser) return;
    setSubmitting(true);
    try {
      // Upload GIF to storage
      const fileName = `animated-photos/${authUser.uuid}-${Date.now()}.gif`;
      const { error: uploadError } = await supabase.storage
        .from("attachments")
        .upload(fileName, gifFile, { contentType: "image/gif", upsert: false });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("attachments").getPublicUrl(fileName);
      const gifUrl = urlData.publicUrl;

      // Save to DB (unique constraint enforces one per user)
      const { error: dbError } = await supabase.from("animated_photo_requests").insert({
        user_uuid: authUser.uuid,
        user_name: authUser.name,
        gif_url: gifUrl,
        duration_label: durationConfig.label,
        max_level: maxLevel,
      } as any);
      if (dbError) {
        if (dbError.message?.includes("duplicate") || dbError.code === "23505") {
          toast.error("لقد أرسلت طلباً مسبقاً، مسموح مرة واحدة فقط");
          setAlreadyRequested(true);
          return;
        }
        throw dbError;
      }

      // Send to admin API
      await supabase.functions.invoke("gala-actions?action=submit-request", {
        body: {
          user_uuid: authUser.uuid,
          user_name: authUser.name,
          request_type: "animated_photo",
          details: { gif_url: gifUrl },
        },
      });

      setSubmitted(true);
      toast.success("تم إرسال الطلب بنجاح");
    } catch (err: any) {
      toast.error(err?.message || "فشل إرسال الطلب");
    } finally {
      setSubmitting(false);
    }
  };

  if (checking) {
    return (
      <MobileLayout showHeader headerTitle="صورة متحركة" onBack={() => navigate("/dashboard")}>
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </MobileLayout>
    );
  }

  if (alreadyRequested) {
    return (
      <MobileLayout showHeader headerTitle="صورة متحركة" onBack={() => navigate("/dashboard")}>
        <div className="flex flex-col items-center justify-center px-6 py-20">
          <div className="w-20 h-20 rounded-full bg-yellow-500/20 flex items-center justify-center mb-6">
            <Shield className="w-10 h-10 text-yellow-400" />
          </div>
          <h2 className="text-lg font-bold text-foreground mb-2">لقد أرسلت طلباً مسبقاً</h2>
          <p className="text-sm text-muted-foreground text-center">مسموح لك بطلب صورة متحركة واحدة فقط</p>
          <Button onClick={() => navigate("/dashboard")} className="mt-8 gold-gradient text-primary-foreground font-bold">
            العودة للرئيسية
          </Button>
        </div>
      </MobileLayout>
    );
  }

  if (submitted) {
    return (
      <MobileLayout showHeader headerTitle="صورة متحركة" onBack={() => navigate("/dashboard")}>
        <div className="flex flex-col items-center justify-center px-6 py-20">
          <div className="w-20 h-20 rounded-full bg-orange-500/20 flex items-center justify-center mb-6 css-scale-up">
            <CheckCircle className="w-10 h-10 text-orange-400" />
          </div>
          <div className="text-center css-fade-up-d3">
            <h2 className="text-lg font-bold text-foreground mb-2">تم إرسال طلبك بنجاح</h2>
            <p className="text-sm text-muted-foreground">
              مدة الصورة المتحركة: <span className="font-bold text-primary">{durationConfig?.label}</span>
            </p>
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
    <MobileLayout showHeader headerTitle="صورة متحركة" onBack={() => navigate("/dashboard")}>
      <div className="px-5 py-4 space-y-5">
        <div className="flex flex-col items-center gap-2 py-4 css-fade-up">
          <div className="w-16 h-16 rounded-2xl bg-orange-500/15 flex items-center justify-center">
            <PlayCircle className="w-8 h-8 text-orange-400" />
          </div>
          <h2 className="text-base font-black text-foreground">طلب صورة متحركة</h2>
          <p className="text-xs text-muted-foreground text-center">ارفع صورة GIF متحركة لملفك الشخصي (مرة واحدة فقط)</p>
        </div>

        {/* شروط الأهلية */}
        <div className="glass-card p-4 space-y-3 css-fade-up-d1">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-400" />
            شروط الصورة المتحركة
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <PulsingHelpIcon size={16} />
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[260px] text-xs text-right" dir="rtl">
                  <p>أعلى لفل بين (الشحن، الكاريزما، الدعم) يحدد المدة. اللفل يشمل أي نوع من الثلاثة.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </h3>

          <div className="space-y-2 text-xs" dir="rtl">
            {[
              { level: "30+", duration: "30 يوم", highlight: maxLevel >= 30 && maxLevel < 40 },
              { level: "40+", duration: "60 يوم", highlight: maxLevel >= 40 && maxLevel < 50 },
              { level: "50+", duration: "مؤبدة (دائمة)", highlight: maxLevel >= 50 },
            ].map((rule) => (
              <div
                key={rule.level}
                className={`flex items-center justify-between rounded-lg p-2.5 transition-colors ${
                  rule.highlight ? "bg-primary/15 border border-primary/30" : "bg-muted/30"
                }`}
              >
                <div className="flex items-center gap-2">
                  {rule.highlight && <CheckCircle className="w-3.5 h-3.5 text-primary" />}
                  <span className={rule.highlight ? "font-bold text-primary" : "text-muted-foreground"}>
                    لفل {rule.level}
                  </span>
                </div>
                <span className={rule.highlight ? "font-bold text-foreground" : "text-muted-foreground"}>
                  {rule.duration}
                </span>
              </div>
            ))}
          </div>

          {!durationConfig?.eligible && (
            <p className="text-xs text-destructive text-center mt-2">
              ⚠️ يجب أن يكون لديك لفل 30 على الأقل (شحن أو كاريزما أو دعم)
            </p>
          )}
        </div>

        {/* معلومات الحساب */}
        {authUser && (
          <div className="glass-card p-4 space-y-3 css-fade-up-d2">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              معلومات الحساب
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex justify-between bg-muted/30 rounded-lg p-2.5">
                <span className="text-muted-foreground">الاسم</span>
                <span className="font-bold text-foreground">{authUser.name}</span>
              </div>
              <div className="flex justify-between bg-muted/30 rounded-lg p-2.5">
                <span className="text-muted-foreground">ID</span>
                <span className="font-bold text-foreground">{authUser.uuid}</span>
              </div>
              <div className="flex justify-between bg-muted/30 rounded-lg p-2.5">
                <span className="text-muted-foreground">أعلى لفل</span>
                <span className="font-bold text-foreground">{maxLevel}</span>
              </div>
              {durationConfig?.eligible && (
                <div className="flex justify-between bg-primary/10 rounded-lg p-2.5 border border-primary/20">
                  <span className="text-muted-foreground">المدة</span>
                  <span className="font-bold text-primary">{durationConfig.label}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* رفع صورة GIF */}
        <div className="glass-card p-4 space-y-3 css-fade-up-d3">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Image className="w-4 h-4 text-orange-400" />
            رفع الصورة المتحركة (GIF)
          </h3>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/gif"
            className="hidden"
            onChange={handleFileChange}
          />

          {gifPreview ? (
            <div className="relative rounded-xl overflow-hidden border border-border/30 bg-muted/20">
              <img src={gifPreview} alt="GIF Preview" className="w-full max-h-[200px] object-contain mx-auto" />
              <button
                onClick={() => { setGifFile(null); setGifPreview(null); }}
                className="absolute top-2 left-2 bg-destructive/80 text-destructive-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-border/40 rounded-xl p-8 flex flex-col items-center gap-3 hover:border-primary/40 transition-colors"
            >
              <Upload className="w-8 h-8 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">اضغط لرفع صورة GIF</span>
              <span className="text-[10px] text-muted-foreground/60">الحد الأقصى 10 ميغابايت</span>
            </button>
          )}
        </div>


        <div className="css-fade-up-d4">
          <Button
            onClick={handleSubmit}
            disabled={!gifFile || !durationConfig?.eligible || submitting}
            className="w-full gold-gradient text-primary-foreground font-bold h-12 text-base disabled:opacity-40"
          >
            {submitting ? (
              <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              <>
                <Send className="w-5 h-5 ml-2" />
                إرسال الطلب
              </>
            )}
          </Button>
        </div>
      </div>
    </MobileLayout>
  );
};

export default AnimatedPhotoRequest;
