import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PlayCircle, User, Shield, Send, CheckCircle, Clock, Star } from "lucide-react";
import PulsingHelpIcon from "@/components/PulsingHelpIcon";
import MobileLayout from "@/components/MobileLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const getDurationConfig = (user: { level: { charger_level: number; sender_level: number; receiver_level: number } } | null) => {
  if (!user) return null;
  const maxLevel = Math.max(user.level.charger_level, user.level.sender_level, user.level.receiver_level);
  if (maxLevel >= 50) return { days: 0, label: "مؤبدة (دائمة)", eligible: true, icon: Infinity };
  if (maxLevel >= 40) return { days: 60, label: "60 يوم", eligible: true, icon: Clock };
  if (maxLevel >= 30) return { days: 30, label: "30 يوم", eligible: true, icon: Clock };
  return { days: 0, label: "غير مؤهل", eligible: false, icon: null };
};

const AnimatedPhotoRequest: React.FC = () => {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const [description, setDescription] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const durationConfig = getDurationConfig(authUser);
  const maxLevel = authUser ? Math.max(authUser.level.charger_level, authUser.level.sender_level, authUser.level.receiver_level) : 0;

  const handleSubmit = () => {
    if (!description.trim() || !durationConfig?.eligible) return;
    setSubmitted(true);
  };

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
          <p className="text-xs text-muted-foreground text-center">صمّم صورة متحركة مميزة لملفك الشخصي</p>
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

        {/* وصف الصورة */}
        <div className="glass-card p-4 space-y-3 css-fade-up-d3">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Shield className="w-4 h-4 text-orange-400" />
            وصف الصورة المطلوبة
          </h3>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 500))}
            placeholder="اكتب وصفاً للصورة المتحركة التي تريدها..."
            className="bg-muted/30 border-border/30 min-h-[100px] text-sm resize-none"
            dir="rtl"
          />
          <p className="text-[11px] text-muted-foreground text-left">{description.length}/500</p>
        </div>

        <div className="css-fade-up-d4">
          <Button
            onClick={handleSubmit}
            disabled={!description.trim() || !durationConfig?.eligible}
            className="w-full gold-gradient text-primary-foreground font-bold h-12 text-base disabled:opacity-40"
          >
            <Send className="w-5 h-5 ml-2" />
            إرسال الطلب
          </Button>
        </div>
      </div>
    </MobileLayout>
  );
};

export default AnimatedPhotoRequest;
