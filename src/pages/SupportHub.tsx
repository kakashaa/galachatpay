import React from "react";
import { useNavigate } from "react-router-dom";
import { Crown, MessageSquare, Headset, Lock, Sparkles } from "lucide-react";
import MobileLayout from "@/components/MobileLayout";
import { useAuth } from "@/contexts/AuthContext";

const SupportHub: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const vipLevel = Number(user?.vip?.vip_level ?? user?.vip?.level ?? 0);
  const hasVipAccess = vipLevel >= 5;

  return (
    <MobileLayout showHeader headerTitle="الدعم الفني" onBack={() => navigate("/dashboard")}>
      <div className="px-5 py-6 space-y-5">
        {/* Header */}
        <div className="text-center space-y-1.5">
          <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <Headset className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-lg font-bold text-foreground">كيف نقدر نساعدك؟</h2>
          <p className="text-xs text-muted-foreground">اختر نوع الدعم المناسب لك</p>
        </div>

        {/* VIP Quick Support */}
        <button
          onClick={() => navigate("/quick-support")}
          className="w-full glass-card p-4 relative overflow-hidden group transition-all active:scale-[0.98]"
        >
          <div className="flex items-center gap-4" dir="rtl">
            <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center flex-shrink-0">
              <Headset className="w-7 h-7 text-primary" />
            </div>
            <div className="flex-1 text-right">
              <h3 className="text-sm font-bold text-foreground">دعم سريع</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                أدخل رقم الغرفة وسيتواصل معك المسؤول فوراً
              </p>
            </div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-l from-primary/5 to-transparent pointer-events-none" />
        </button>

        {/* VIP Chat */}
        <button
          onClick={() => hasVipAccess ? navigate("/support/vip-chat") : undefined}
          disabled={!hasVipAccess}
          className="w-full glass-card p-4 relative overflow-hidden group transition-all active:scale-[0.98] disabled:opacity-60"
        >
          {!hasVipAccess && (
            <div className="absolute top-2 left-2">
              <Lock className="w-4 h-4 text-muted-foreground" />
            </div>
          )}
          <div className="flex items-center gap-4" dir="rtl">
            <div className="w-14 h-14 rounded-2xl gold-gradient flex items-center justify-center flex-shrink-0">
              <Crown className="w-7 h-7 text-primary-foreground" />
            </div>
            <div className="flex-1 text-right">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-foreground">شات VIP</h3>
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-primary/15 text-primary font-bold">VIP</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {hasVipAccess
                  ? "شات مباشر مع السوبر أدمن • أولوية قصوى"
                  : `يتطلب VIP 5 على الأقل • مستواك: VIP ${vipLevel || "بدون"}`}
              </p>
            </div>
          </div>
          {hasVipAccess && (
            <div className="absolute inset-0 bg-gradient-to-l from-primary/5 to-transparent pointer-events-none" />
          )}
        </button>

        {/* Regular Support */}
        <button
          onClick={() => navigate("/support/tickets")}
          className="w-full glass-card p-4 relative overflow-hidden group transition-all active:scale-[0.98]"
        >
          <div className="flex items-center gap-4" dir="rtl">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/15 flex items-center justify-center flex-shrink-0">
              <MessageSquare className="w-7 h-7 text-blue-400" />
            </div>
            <div className="flex-1 text-right">
              <h3 className="text-sm font-bold text-foreground">الدعم العادي</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                ارفع تكت وسيتم الرد عليك من فريق الدعم
              </p>
            </div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-l from-blue-500/5 to-transparent pointer-events-none" />
        </button>

        {/* Bot Chat */}
        <button
          onClick={() => navigate("/support-chat")}
          className="w-full glass-card p-4 relative overflow-hidden group transition-all active:scale-[0.98]"
        >
          <div className="flex items-center gap-4" dir="rtl">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-7 h-7 text-emerald-400" />
            </div>
            <div className="flex-1 text-right">
              <h3 className="text-sm font-bold text-foreground">المساعد الذكي</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                بوت يرد على أسئلتك فوراً • الأسئلة الشائعة
              </p>
            </div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-l from-emerald-500/5 to-transparent pointer-events-none" />
        </button>
      </div>
    </MobileLayout>
  );
};

export default SupportHub;
