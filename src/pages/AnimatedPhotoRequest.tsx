import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PlayCircle, User, Shield, Send, CheckCircle } from "lucide-react";
import MobileLayout from "@/components/MobileLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";

const AnimatedPhotoRequest: React.FC = () => {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const [description, setDescription] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!description.trim()) return;
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
    <MobileLayout showHeader headerTitle="صورة متحركة" onBack={() => navigate("/dashboard")}>
      <div className="px-5 py-4 space-y-5">
        <div className="flex flex-col items-center gap-2 py-4 css-fade-up">
          <div className="w-16 h-16 rounded-2xl bg-orange-500/15 flex items-center justify-center">
            <PlayCircle className="w-8 h-8 text-orange-400" />
          </div>
          <h2 className="text-base font-black text-foreground">طلب صورة متحركة</h2>
          <p className="text-xs text-muted-foreground text-center">صمّم صورة متحركة مميزة لحسابك</p>
        </div>

        {authUser && (
          <div className="glass-card p-4 space-y-3 css-fade-up-d1">
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
            </div>
          </div>
        )}

        <div className="glass-card p-4 space-y-3 css-fade-up-d2">
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

        <div className="css-fade-up-d3">
          <Button
            onClick={handleSubmit}
            disabled={!description.trim()}
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
