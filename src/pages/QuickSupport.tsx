import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Headset, ShieldCheck, Send, AlertTriangle, User, Crown, Star, Lock } from "lucide-react";
import MobileLayout from "@/components/MobileLayout";

const requestTypes = [
  "مشكلة تقنية",
  "استفسار عن الحساب",
  "طلب استرجاع",
  "مشكلة في الشحن",
  "مشكلة في البث",
  "أخرى",
];

const QuickSupport: React.FC = () => {
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState("");
  const [description, setDescription] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const userVipLevel = 5;
  const hasAccess = userVipLevel >= 5;

  const user = {
    id: "123456789",
    name: "محمد أحمد",
    level: 35,
    role: "مستخدم",
    vip: userVipLevel,
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedType || !description.trim()) return;
    setSubmitted(true);
  };

  if (!hasAccess) {
    return (
      <MobileLayout showHeader headerTitle="الدعم السريع" onBack={() => navigate("/dashboard")}>
        <div className="flex flex-col items-center justify-center px-6 py-20">
          <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mb-6 css-scale-up">
            <Lock className="w-10 h-10 text-destructive" />
          </div>
          <div className="text-center css-fade-up-d2">
            <h2 className="text-lg font-bold text-foreground mb-2">غير متاح</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              خدمة الدعم السريع مخصصة حصريًا لكبار الشخصيات
            </p>
          </div>

          <div className="w-full mt-8 glass-card p-5 css-fade-up-d4">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-4 h-4 text-primary flex-shrink-0" />
              <p className="text-sm font-bold text-foreground">الشروط المطلوبة</p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-xl border border-border/30 bg-card/50">
                <Crown className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm font-semibold text-foreground">VIP 5</p>
                  <p className="text-[11px] text-muted-foreground">الحد الأدنى للوصول</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl border border-border/30 bg-card/50">
                <Star className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm font-semibold text-foreground">VIP 6</p>
                  <p className="text-[11px] text-muted-foreground">أولوية قصوى</p>
                </div>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-4 text-center">
              مستوى VIP الحالي: <span className="text-destructive font-bold">VIP {userVipLevel || "بدون"}</span>
            </p>
          </div>
        </div>
      </MobileLayout>
    );
  }

  if (submitted) {
    return (
      <MobileLayout showHeader headerTitle="الدعم السريع" onBack={() => navigate("/dashboard")}>
        <div className="flex flex-col items-center justify-center px-6 py-20">
          <div className="w-20 h-20 rounded-full bg-[hsl(var(--success)/0.15)] flex items-center justify-center mb-6 css-scale-up">
            <ShieldCheck className="w-10 h-10 text-[hsl(var(--success-foreground))]" />
          </div>
          <div className="text-center css-fade-up-d3">
            <h2 className="text-lg font-bold text-foreground mb-2">تم إرسال طلبك بنجاح</h2>
            <p className="text-sm text-muted-foreground">سيتم معالجة طلبك بأولوية عالية</p>
          </div>
          <div className="w-full mt-8 glass-card p-4 space-y-2 css-fade-up-d5">
            <InfoRow label="نوع الطلب" value={selectedType} />
            <InfoRow label="معرف الحساب" value={user.id} />
            <InfoRow label="الأولوية" value="عالية جدًا" highlight />
          </div>
          <button
            onClick={() => navigate("/dashboard")}
            className="mt-6 w-full h-12 rounded-xl border border-primary/30 text-primary font-bold bg-primary/5 hover:bg-primary/10 transition-colors css-fade-up-d7 active:scale-95"
          >
            العودة للرئيسية
          </button>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout showHeader headerTitle="الدعم السريع" onBack={() => navigate("/dashboard")}>
      <div className="px-5 py-6 space-y-6">
        <div className="glass-card p-4 flex items-center gap-4 glow-gold css-fade-up">
          <div className="w-12 h-12 rounded-full gold-gradient flex items-center justify-center flex-shrink-0">
            <Crown className="w-6 h-6 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-foreground">دعم كبار الشخصيات</p>
            <p className="text-[11px] text-muted-foreground">VIP {user.vip} • أولوية عالية جدًا</p>
          </div>
          <Headset className="w-5 h-5 text-primary" />
        </div>

        <div className="glass-card p-4 css-fade-up-d1">
          <div className="flex items-center gap-2 mb-3">
            <User className="w-4 h-4 text-primary" />
            <p className="text-sm font-bold text-foreground">معلومات الحساب</p>
          </div>
          <div className="space-y-2">
            <InfoRow label="المعرف" value={user.id} />
            <InfoRow label="نوع الحساب" value={user.role} />
            <InfoRow label="المستوى" value={`Level ${user.level}`} />
            <InfoRow label="VIP" value={`VIP ${user.vip}`} highlight />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 css-fade-up-d2">
          <div className="space-y-2">
            <label className="text-sm font-bold text-foreground">نوع الطلب / المشكلة</label>
            <div className="grid grid-cols-2 gap-2">
              {requestTypes.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSelectedType(type)}
                  className={`p-3 rounded-xl text-xs font-semibold border transition-all ${
                    selectedType === type
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/30 bg-card/50 text-muted-foreground hover:border-border"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-foreground">وصف المشكلة</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="اكتب وصفًا مختصرًا للمشكلة أو الطلب..."
              rows={4}
              maxLength={500}
              className="w-full p-4 bg-input rounded-xl text-foreground placeholder:text-muted-foreground border border-border/50 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all resize-none text-sm leading-relaxed"
            />
            <p className="text-[11px] text-muted-foreground text-left" dir="ltr">
              {description.length}/500
            </p>
          </div>

          <button
            type="submit"
            disabled={!selectedType || !description.trim()}
            className="w-full h-12 gold-gradient rounded-xl text-primary-foreground font-bold flex items-center justify-center gap-2 disabled:opacity-40 transition-opacity active:scale-95"
          >
            <Send className="w-5 h-5" />
            إرسال الطلب
          </button>
        </form>
      </div>
    </MobileLayout>
  );
};

const InfoRow: React.FC<{ label: string; value: string; highlight?: boolean }> = ({ label, value, highlight }) => (
  <div className="flex items-center justify-between py-1.5">
    <span className="text-xs text-muted-foreground">{label}</span>
    <span className={`text-xs font-bold ${highlight ? "text-primary" : "text-foreground"}`}>{value}</span>
  </div>
);

export default QuickSupport;
