import React, { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Gift, User, Shield, Crown, Send, CheckCircle, Sparkles, Frame, DoorOpen } from "lucide-react";
import MobileLayout from "@/components/MobileLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

const GiftRequest: React.FC = () => {
  const navigate = useNavigate();
  const [giftType, setGiftType] = useState("");
  const [description, setDescription] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // Demo user data
  const user = {
    id: "123456789",
    name: "محمد أحمد",
    level: 35,
    accountType: "مستخدم",
    vipLevel: 3,
  };

  const giftTypes = [
    { value: "custom", label: "هدية مخصصة", icon: <Sparkles className="w-5 h-5" />, desc: "تصميم هدية خاصة بك" },
    { value: "entry", label: "هدية دخولية", icon: <DoorOpen className="w-5 h-5" />, desc: "هدية تظهر عند الدخول" },
    { value: "frame", label: "إطار", icon: <Frame className="w-5 h-5" />, desc: "إطار مميز لصورتك" },
  ];

  const handleSubmit = () => {
    if (!giftType || !description.trim()) return;
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <MobileLayout showHeader headerTitle="طلب هدية" onBack={() => navigate("/dashboard")}>
        <div className="flex flex-col items-center justify-center px-6 py-20">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.6 }}
            className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center mb-6"
          >
            <CheckCircle className="w-10 h-10 text-success" />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="text-center">
            <h2 className="text-lg font-bold text-foreground mb-2">تم إرسال طلبك بنجاح</h2>
            <p className="text-sm text-muted-foreground">سيتم مراجعة طلبك وإشعارك بالنتيجة</p>
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
            <Button onClick={() => navigate("/dashboard")} className="mt-8 gold-gradient text-primary-foreground font-bold">
              العودة للرئيسية
            </Button>
          </motion.div>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout showHeader headerTitle="طلب هدية" onBack={() => navigate("/dashboard")}>
      <div className="px-5 py-4 space-y-5">
        {/* User Info */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4 space-y-3">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            معلومات الحساب
          </h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex justify-between bg-muted/30 rounded-lg p-2.5">
              <span className="text-muted-foreground">ID</span>
              <span className="font-bold text-foreground">{user.id}</span>
            </div>
            <div className="flex justify-between bg-muted/30 rounded-lg p-2.5">
              <span className="text-muted-foreground">المستوى</span>
              <span className="font-bold text-foreground">{user.level}</span>
            </div>
            <div className="flex justify-between bg-muted/30 rounded-lg p-2.5">
              <span className="text-muted-foreground">النوع</span>
              <span className="font-bold text-foreground">{user.accountType}</span>
            </div>
            <div className="flex justify-between bg-muted/30 rounded-lg p-2.5">
              <span className="text-muted-foreground">VIP</span>
              <span className="font-bold text-primary flex items-center gap-1">
                <Crown className="w-3 h-3" /> {user.vipLevel}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Gift Type Selection */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-4 space-y-3">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Gift className="w-4 h-4 text-primary" />
            نوع الهدية
          </h3>
          <RadioGroup value={giftType} onValueChange={setGiftType} className="space-y-2">
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
        </motion.div>

        {/* Description */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-4 space-y-3">
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
        </motion.div>

        {/* Submit */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Button
            onClick={handleSubmit}
            disabled={!giftType || !description.trim()}
            className="w-full gold-gradient text-primary-foreground font-bold h-12 text-base disabled:opacity-40"
          >
            <Send className="w-5 h-5 ml-2" />
            إرسال الطلب
          </Button>
        </motion.div>
      </div>
    </MobileLayout>
  );
};

export default GiftRequest;
