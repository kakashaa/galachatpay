import React, { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { IdCard, User, Crown, Shield, Send, CheckCircle, AlertCircle, XCircle, Info } from "lucide-react";
import MobileLayout from "@/components/MobileLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const levelRanges = [
  { min: 20, max: 29, label: "Level 20-29", format: "سيتم تحديد الصيغة لاحقاً", example: "---" },
  { min: 30, max: 39, label: "Level 30-39", format: "سيتم تحديد الصيغة لاحقاً", example: "---" },
  { min: 40, max: 49, label: "Level 40-49", format: "سيتم تحديد الصيغة لاحقاً", example: "---" },
  { min: 50, max: 59, label: "Level 50-59", format: "سيتم تحديد الصيغة لاحقاً", example: "---" },
  { min: 60, max: 69, label: "Level 60-69", format: "سيتم تحديد الصيغة لاحقاً", example: "---" },
  { min: 70, max: 79, label: "Level 70-79", format: "سيتم تحديد الصيغة لاحقاً", example: "---" },
  { min: 80, max: 89, label: "Level 80-89", format: "سيتم تحديد الصيغة لاحقاً", example: "---" },
  { min: 90, max: 100, label: "Level 90-100", format: "سيتم تحديد الصيغة لاحقاً", example: "---" },
];

const ChangeId: React.FC = () => {
  const navigate = useNavigate();
  const [newId, setNewId] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "taken" | "ineligible">("idle");

  // Demo user data
  const user = {
    id: "123456789",
    name: "محمد أحمد",
    level: 35,
    accountType: "مستخدم",
    vipLevel: 3,
    changesUsed: [] as number[], // level ranges where ID was already changed
  };

  const currentRange = levelRanges.find((r) => user.level >= r.min && user.level <= r.max);
  const availableRanges = levelRanges.filter((r) => user.level >= r.min);
  const alreadyUsed = currentRange ? user.changesUsed.includes(currentRange.min) : false;

  const handleSubmit = () => {
    if (!newId.trim() || !currentRange) return;
    if (user.level < 20) {
      setStatus("ineligible");
      return;
    }
    if (alreadyUsed) {
      setStatus("ineligible");
      return;
    }
    // Simulate API check - placeholder
    const isTaken = newId.toLowerCase() === "taken";
    if (isTaken) {
      setStatus("taken");
    } else {
      setStatus("success");
    }
  };

  if (status === "success") {
    return (
      <MobileLayout showHeader headerTitle="تغيير الـ ID" onBack={() => navigate("/dashboard")}>
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
            <h2 className="text-lg font-bold text-foreground mb-2">تم تغيير الـ ID بنجاح</h2>
            <p className="text-sm text-muted-foreground">معرفك الجديد: <span className="font-bold text-primary" dir="ltr">{newId}</span></p>
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
    <MobileLayout showHeader headerTitle="تغيير الـ ID" onBack={() => navigate("/dashboard")}>
      <div className="px-5 py-4 space-y-5">
        {/* User Info */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4 space-y-3">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            معلومات الحساب
          </h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex justify-between bg-muted/30 rounded-lg p-2.5">
              <span className="text-muted-foreground">ID الحالي</span>
              <span className="font-bold text-foreground" dir="ltr">{user.id}</span>
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

        {/* Level & Eligibility */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-4 space-y-3">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <IdCard className="w-4 h-4 text-primary" />
            مستواك الحالي
          </h3>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full gold-gradient flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">{user.level}</span>
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">{currentRange?.label || "غير مؤهل"}</p>
              <p className="text-[11px] text-muted-foreground">
                {user.level >= 20 ? "مؤهل لتغيير الـ ID" : "يجب أن يكون مستواك 20 أو أعلى"}
              </p>
            </div>
          </div>

          {user.level < 20 && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-xl">
              <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
              <p className="text-xs text-destructive">مستواك أقل من 20. لا يمكنك تغيير الـ ID حالياً.</p>
            </div>
          )}

          {alreadyUsed && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-xl">
              <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
              <p className="text-xs text-destructive">لقد استخدمت فرصة تغيير الـ ID لهذا المستوى.</p>
            </div>
          )}
        </motion.div>

        {/* Available Formats */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card p-4 space-y-3">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            الصيغ المتاحة لمستواك
          </h3>
          <div className="space-y-2">
            {availableRanges.map((range, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-xl border transition-colors ${
                  currentRange === range
                    ? "border-primary/30 bg-primary/5"
                    : "border-border/20 bg-muted/20"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">{range.label}</span>
                  {currentRange === range && (
                    <span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded-full">مستواك</span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">الصيغة: {range.format}</p>
              </div>
            ))}
          </div>

          <div className="flex items-start gap-2 p-3 bg-primary/5 border border-primary/10 rounded-xl">
            <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="text-[11px] text-muted-foreground">يُسمح بتغيير الـ ID مرة واحدة فقط لكل فئة مستوى.</p>
          </div>
        </motion.div>

        {/* New ID Input */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-4 space-y-3">
          <h3 className="text-sm font-bold text-foreground">الـ ID الجديد</h3>
          <Input
            type="text"
            value={newId}
            onChange={(e) => {
              setNewId(e.target.value);
              setStatus("idle");
            }}
            placeholder="اكتب الـ ID الذي تريده"
            dir="ltr"
            className="h-12 bg-muted/30 border-border/30 text-center text-base"
            disabled={user.level < 20 || alreadyUsed}
          />

          {status === "taken" && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-xl">
              <XCircle className="w-4 h-4 text-destructive shrink-0" />
              <p className="text-xs text-destructive">عذراً، هذا المعرف مستخدم من قبل شخص آخر</p>
            </div>
          )}

          {status === "ineligible" && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-xl">
              <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
              <p className="text-xs text-destructive">غير مؤهل لتغيير الـ ID حالياً</p>
            </div>
          )}
        </motion.div>

        {/* Submit */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Button
            onClick={handleSubmit}
            disabled={!newId.trim() || user.level < 20 || alreadyUsed}
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

export default ChangeId;
