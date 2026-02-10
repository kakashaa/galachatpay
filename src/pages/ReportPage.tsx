import React, { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ShieldAlert, User, Crown, Send, CheckCircle, Upload, Image, X, AlertTriangle, Ban, MessageSquareWarning } from "lucide-react";
import MobileLayout from "@/components/MobileLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

const reportTypes = [
  { value: "abuse", label: "سلوك مسيء", icon: <MessageSquareWarning className="w-5 h-5" />, desc: "تحرش، إهانة، أو إساءة" },
  { value: "violation", label: "مخالفة", icon: <AlertTriangle className="w-5 h-5" />, desc: "مخالفة سياسات التطبيق" },
  { value: "ban", label: "طلب حظر", icon: <Ban className="w-5 h-5" />, desc: "طلب حظر حساب مستخدم" },
  { value: "other", label: "أخرى", icon: <ShieldAlert className="w-5 h-5" />, desc: "نوع آخر من البلاغات" },
];

const ReportPage: React.FC = () => {
  const navigate = useNavigate();
  const [reportType, setReportType] = useState("");
  const [targetId, setTargetId] = useState("");
  const [description, setDescription] = useState("");
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
    if (!reportType || !targetId.trim() || !description.trim()) return;
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <MobileLayout showHeader headerTitle="بلاغ / حظر" onBack={() => navigate("/dashboard")}>
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
            <h2 className="text-lg font-bold text-foreground mb-2">تم إرسال البلاغ بنجاح</h2>
            <p className="text-sm text-muted-foreground">سيتم مراجعة طلبك والتعامل معه وفق سياسة التطبيق</p>
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
    <MobileLayout showHeader headerTitle="بلاغ / حظر" onBack={() => navigate("/dashboard")}>
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

        {/* Report Type */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-4 space-y-3">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-primary" />
            نوع البلاغ
          </h3>
          <RadioGroup value={reportType} onValueChange={setReportType} className="space-y-2">
            {reportTypes.map((type) => (
              <Label
                key={type.value}
                htmlFor={`report-${type.value}`}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  reportType === type.value
                    ? "border-primary bg-primary/10"
                    : "border-border/30 bg-muted/20 hover:bg-muted/40"
                }`}
              >
                <RadioGroupItem value={type.value} id={`report-${type.value}`} />
                <div className={`p-2 rounded-lg ${reportType === type.value ? "bg-primary/20 text-primary" : "bg-muted/30 text-muted-foreground"}`}>
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

        {/* Target Account ID */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card p-4 space-y-3">
          <h3 className="text-sm font-bold text-foreground">ID الحساب المُبلَّغ عنه</h3>
          <Input
            type="text"
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            placeholder="أدخل ID الحساب"
            dir="ltr"
            className="h-12 bg-muted/30 border-border/30 text-center text-base"
          />
        </motion.div>

        {/* Description */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-4 space-y-3">
          <h3 className="text-sm font-bold text-foreground">وصف المشكلة</h3>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 500))}
            placeholder="اكتب وصفًا مختصرًا للمشكلة..."
            className="bg-muted/30 border-border/30 min-h-[100px] text-sm resize-none"
            dir="rtl"
          />
          <p className="text-[11px] text-muted-foreground text-left">{description.length}/500</p>
        </motion.div>

        {/* Attachment */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="glass-card p-4 space-y-3">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Image className="w-4 h-4 text-primary" />
            مرفق (اختياري)
          </h3>
          <p className="text-[11px] text-muted-foreground">يمكنك رفع صورة أو مقطع قصير لدعم البلاغ</p>

          {!attachment ? (
            <label className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-border/40 rounded-xl cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all">
              <Upload className="w-8 h-8 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">اضغط لرفع ملف</span>
              <input
                type="file"
                accept="image/*,video/*"
                onChange={handleFileChange}
                className="hidden"
              />
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

        {/* Submit */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Button
            onClick={handleSubmit}
            disabled={!reportType || !targetId.trim() || !description.trim()}
            className="w-full gold-gradient text-primary-foreground font-bold h-12 text-base disabled:opacity-40"
          >
            <Send className="w-5 h-5 ml-2" />
            إرسال البلاغ
          </Button>
        </motion.div>
      </div>
    </MobileLayout>
  );
};

export default ReportPage;
