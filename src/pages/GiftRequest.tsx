import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Gift, User, Shield, Send, CheckCircle, Sparkles, Frame, DoorOpen } from "lucide-react";
import CustomGiftGallery from "@/components/CustomGiftGallery";
import MobileLayout from "@/components/MobileLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ServicePreviousRequests from "@/components/ServicePreviousRequests";

const GiftRequest: React.FC = () => {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const [giftType, setGiftType] = useState("");
  const [description, setDescription] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleGiftTypeChange = (value: string) => {
    if (value === "custom") {
      navigate("/custom-gift");
      return;
    }
    setGiftType(value);
  };

  const giftTypes = [
    { value: "custom", label: "هدية مخصصة", icon: <Sparkles className="w-5 h-5" />, desc: "تصميم هدية خاصة بك" },
    { value: "entry", label: "هدية دخولية", icon: <DoorOpen className="w-5 h-5" />, desc: "هدية تظهر عند الدخول" },
    { value: "frame", label: "إطار", icon: <Frame className="w-5 h-5" />, desc: "إطار مميز لصورتك" },
  ];

  const handleSubmit = async () => {
    if (!giftType || !description.trim() || !authUser) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("gala-actions?action=submit-request", {
        body: {
          user_uuid: authUser.uuid,
          user_name: authUser.name,
          request_type: "gift",
          details: { gift_type: giftType, description: description.trim() },
        },
      }).catch(() => ({ data: null, error: null }));
      if (error) throw error;
      setSubmitted(true);
      toast.success("تم إرسال الطلب بنجاح");
    } catch (err: any) {
      toast.error(err?.message || "فشل إرسال الطلب");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <MobileLayout showHeader headerTitle="طلب هدية" onBack={() => navigate("/dashboard")}>
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
    <MobileLayout showHeader headerTitle="طلب هدية" onBack={() => navigate("/dashboard")}>
      <div className="px-5 py-4 space-y-5">
        {/* طلباتي السابقة */}
        {authUser?.uuid && <ServicePreviousRequests userUuid={authUser.uuid} serviceType="gift" />}

        <div className="glass-card p-4 space-y-3 css-fade-up">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            معلومات الحساب
          </h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex justify-between bg-muted/30 rounded-lg p-2.5">
              <span className="text-muted-foreground">ID</span>
              <span className="font-bold text-foreground">{authUser?.id}</span>
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
              <span className="text-muted-foreground">النوع</span>
              <span className="font-bold text-foreground">{authUser?.type_user === 1 ? "مستخدم" : "وكيل"}</span>
            </div>
          </div>
        </div>

        <div className="glass-card p-4 space-y-3 css-fade-up-d1">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Gift className="w-4 h-4 text-primary" />
            نوع الهدية
          </h3>
          <RadioGroup value={giftType} onValueChange={handleGiftTypeChange} className="space-y-2">
            {giftTypes.map((type) => (
              <Label
                key={type.value}
                htmlFor={type.value}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  giftType === type.value
                    ? "border-primary bg-primary/10"
                    : "border-border/30 bg-muted/20 hover:bg-muted/40"
                }`}
              >
                <RadioGroupItem value={type.value} id={type.value} />
                <div className={`p-2 rounded-lg ${giftType === type.value ? "bg-primary/20 text-primary" : "bg-muted/30 text-muted-foreground"}`}>
                  {type.icon}
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">{type.label}</p>
                  <p className="text-[11px] text-muted-foreground">{type.desc}</p>
                </div>
              </Label>
            ))}
          </RadioGroup>
        </div>

        <div className="glass-card p-4 space-y-3 css-fade-up-d2">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            وصف الهدية أو الفكرة
          </h3>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 500))}
            placeholder="اكتب وصفًا للهدية التي تريدها..."
            className="bg-muted/30 border-border/30 min-h-[100px] text-sm resize-none"
            dir="rtl"
          />
          <p className="text-[11px] text-muted-foreground text-left">{description.length}/500</p>
        </div>

        <div className="css-fade-up-d3">
          <Button
            onClick={handleSubmit}
            disabled={!giftType || !description.trim() || submitting}
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

        {/* Custom Gift Gallery */}
        <div className="css-fade-up-d4">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-primary" />
            هدايا المشاهير
          </h3>
          <CustomGiftGallery />
        </div>
      </div>
    </MobileLayout>
  );
};

export default GiftRequest;
