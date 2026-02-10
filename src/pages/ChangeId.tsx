import React, { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { IdCard, User, Crown, Shield, Send, CheckCircle, AlertCircle, XCircle, Info } from "lucide-react";
import MobileLayout from "@/components/MobileLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const userTypeLabels: Record<number, string> = {
  0: "مستخدم عادي",
  1: "مستخدم عادي",
  2: "مضيف",
  3: "وكيل مضيفين",
  4: "وكيل شحن",
  5: "وكيل شحن ومضيفين",
  6: "مضيف ووكيل شحن",
};

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
  const { user } = useAuth();
  const [newId, setNewId] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "taken" | "ineligible" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  if (!user) {
    navigate("/");
    return null;
  }

  const maxLevel = Math.max(user.level.receiver_level, user.level.sender_level);
  const currentRange = levelRanges.find((r) => maxLevel >= r.min && maxLevel <= r.max);
  const availableRanges = levelRanges.filter((r) => maxLevel >= r.min);

  const handleSubmit = async () => {
    if (!newId.trim() || !currentRange) return;
    if (maxLevel < 20) {
      setStatus("ineligible");
      return;
    }

    setStatus("loading");
    setErrorMsg("");

    try {
      const { data, error } = await supabase.functions.invoke("gala-request", {
        body: { uuid: user.uuid, type: "uuid", value: newId.trim() },
      });

      if (error) {
        setStatus("error");
        setErrorMsg("حدث خطأ في الاتصال. حاول مرة أخرى.");
        return;
      }

      if (!data?.success) {
        const msg = data?.error || "";
        if (msg.toLowerCase().includes("taken") || msg.toLowerCase().includes("used")) {
          setStatus("taken");
        } else {
          setStatus("error");
          setErrorMsg(msg || "فشل الطلب. حاول مرة أخرى.");
        }
        return;
      }

      setStatus("success");
    } catch {
      setStatus("error");
      setErrorMsg("حدث خطأ غير متوقع.");
    }
  };

  if (status === "success") {
    return (
      <MobileLayout showHeader headerTitle="تغيير الـ ID" onBack={() => navigate("/dashboard")}>
        <div className="flex flex-col items-center justify-center px-6 py-20">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", duration: 0.6 }} className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center mb-6">
            <CheckCircle className="w-10 h-10 text-success" />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="text-center">
            <h2 className="text-lg font-bold text-foreground mb-2">تم إرسال طلب تغيير الـ ID</h2>
            <p className="text-sm text-muted-foreground">المعرف المطلوب: <span className="font-bold text-primary" dir="ltr">{newId}</span></p>
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
            <Button onClick={() => navigate("/dashboard")} className="mt-8 gold-gradient text-primary-foreground font-bold">العودة للرئيسية</Button>
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
              <span className="font-bold text-foreground" dir="ltr">{user.uuid}</span>
            </div>
            <div className="flex justify-between bg-muted/30 rounded-lg p-2.5">
              <span className="text-muted-foreground">مستوى المستقبل</span>
              <span className="font-bold text-foreground">{user.level.receiver_level}</span>
            </div>
            <div className="flex justify-between bg-muted/30 rounded-lg p-2.5">
              <span className="text-muted-foreground">مستوى المرسل</span>
              <span className="font-bold text-foreground">{user.level.sender_level}</span>
            </div>
            <div className="flex justify-between bg-muted/30 rounded-lg p-2.5">
              <span className="text-muted-foreground">النوع</span>
              <span className="font-bold text-foreground">{userTypeLabels[user.type_user] || "مستخدم"}</span>
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
              <span className="text-primary-foreground font-bold text-sm">{maxLevel}</span>
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">{currentRange?.label || "غير مؤهل"}</p>
              <p className="text-[11px] text-muted-foreground">
                {maxLevel >= 20 ? "مؤهل لتغيير الـ ID" : "يجب أن يكون مستواك 20 أو أعلى"}
              </p>
            </div>
          </div>
          {maxLevel < 20 && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-xl">
              <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
              <p className="text-xs text-destructive">مستواك أقل من 20. لا يمكنك تغيير الـ ID حالياً.</p>
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
              <div key={idx} className={`p-3 rounded-xl border transition-colors ${currentRange === range ? "border-primary/30 bg-primary/5" : "border-border/20 bg-muted/20"}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">{range.label}</span>
                  {currentRange === range && <span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded-full">مستواك</span>}
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
            onChange={(e) => { setNewId(e.target.value); setStatus("idle"); }}
            placeholder="اكتب الـ ID الذي تريده"
            dir="ltr"
            className="h-12 bg-muted/30 border-border/30 text-center text-base"
            disabled={maxLevel < 20}
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
          {status === "error" && errorMsg && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-xl">
              <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
              <p className="text-xs text-destructive">{errorMsg}</p>
            </div>
          )}
        </motion.div>

        {/* Submit */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Button
            onClick={handleSubmit}
            disabled={!newId.trim() || maxLevel < 20 || status === "loading"}
            className="w-full gold-gradient text-primary-foreground font-bold h-12 text-base disabled:opacity-40"
          >
            {status === "loading" ? (
              <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              <>
                <Send className="w-5 h-5 ml-2" />
                إرسال الطلب
              </>
            )}
          </Button>
        </motion.div>
      </div>
    </MobileLayout>
  );
};

export default ChangeId;
