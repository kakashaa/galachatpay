import React, { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Briefcase, User, Crown, Send, CheckCircle, Upload, Image, X, FileText } from "lucide-react";
import MobileLayout from "@/components/MobileLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

const BDRequest: React.FC = () => {
  const navigate = useNavigate();
  const [experience, setExperience] = useState("");
  const [hostsCount, setHostsCount] = useState("");
  const [agentsCount, setAgentsCount] = useState("");
  const [previousBD, setPreviousBD] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Demo user data
  const user = {
    id: "123456789",
    name: "محمد أحمد",
    level: 35,
    accountType: "مستخدم",
    vipLevel: 3,
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setAttachment(file);
  };

  const handleSubmit = () => {
    if (!experience.trim() || !hostsCount || !agentsCount || !previousBD) return;
    if (previousBD === "yes" && !attachment) return;
    setSubmitted(true);
  };

  const isFormValid = experience.trim() && hostsCount && agentsCount && previousBD && (previousBD === "no" || attachment);

  if (submitted) {
    return (
      <MobileLayout showHeader headerTitle="طلب BD" onBack={() => navigate("/dashboard")}>
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
    <MobileLayout showHeader headerTitle="طلب BD" onBack={() => navigate("/dashboard")}>
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

        {/* Experience */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-4 space-y-3">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-primary" />
            معلومات الخبرة
          </h3>

          {/* Work Experience */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">كم خبرة لديك في العمل؟</Label>
            <Textarea
              value={experience}
              onChange={(e) => setExperience(e.target.value.slice(0, 300))}
              placeholder="اكتب سنوات خبرتك أو وصف خبرتك السابقة..."
              className="bg-muted/30 border-border/30 min-h-[80px] text-sm resize-none"
              dir="rtl"
            />
            <p className="text-[10px] text-muted-foreground text-left">{experience.length}/300</p>
          </div>

          {/* Hosts Count */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">كم عدد المضيفين تستطيع جلبهم في أول شهر؟</Label>
            <Input
              type="number"
              min="0"
              value={hostsCount}
              onChange={(e) => setHostsCount(e.target.value)}
              placeholder="عدد المضيفين"
              className="h-11 bg-muted/30 border-border/30 text-center"
              dir="ltr"
            />
          </div>

          {/* Agents Count */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">كم وكلاء مضيفين تستطيع جلبهم في أول شهر؟</Label>
            <Input
              type="number"
              min="0"
              value={agentsCount}
              onChange={(e) => setAgentsCount(e.target.value)}
              placeholder="عدد الوكلاء"
              className="h-11 bg-muted/30 border-border/30 text-center"
              dir="ltr"
            />
          </div>
        </motion.div>

        {/* Previous BD Experience */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card p-4 space-y-3">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            هل سبق أن عملت كـ BD من قبل؟
          </h3>
          <RadioGroup value={previousBD} onValueChange={setPreviousBD} className="space-y-2">
            <Label
              htmlFor="bd-yes"
              className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                previousBD === "yes" ? "border-primary bg-primary/10" : "border-border/30 bg-muted/20 hover:bg-muted/40"
              }`}
            >
              <RadioGroupItem value="yes" id="bd-yes" />
              <span className="text-sm font-bold text-foreground">نعم</span>
            </Label>
            <Label
              htmlFor="bd-no"
              className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                previousBD === "no" ? "border-primary bg-primary/10" : "border-border/30 bg-muted/20 hover:bg-muted/40"
              }`}
            >
              <RadioGroupItem value="no" id="bd-no" />
              <span className="text-sm font-bold text-foreground">لا</span>
            </Label>
          </RadioGroup>
        </motion.div>

        {/* Attachment - shown if previousBD is yes */}
        {previousBD === "yes" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4 space-y-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Image className="w-4 h-4 text-primary" />
              صورة تثبت الخبرة السابقة
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
          </motion.div>
        )}

        {/* Submit */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Button
            onClick={handleSubmit}
            disabled={!isFormValid}
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

export default BDRequest;
