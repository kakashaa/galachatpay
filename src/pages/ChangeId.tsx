import React, { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { IdCard, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import MobileLayout from "@/components/MobileLayout";

const levelRanges = [
  { min: 20, max: 29, label: "Level 20-29", format: "سيتم تحديد الصيغة لاحقاً" },
  { min: 30, max: 39, label: "Level 30-39", format: "سيتم تحديد الصيغة لاحقاً" },
  { min: 40, max: 49, label: "Level 40-49", format: "سيتم تحديد الصيغة لاحقاً" },
  { min: 50, max: 59, label: "Level 50-59", format: "سيتم تحديد الصيغة لاحقاً" },
  { min: 60, max: 69, label: "Level 60-69", format: "سيتم تحديد الصيغة لاحقاً" },
  { min: 70, max: 79, label: "Level 70-79", format: "سيتم تحديد الصيغة لاحقاً" },
  { min: 80, max: 89, label: "Level 80-89", format: "سيتم تحديد الصيغة لاحقاً" },
  { min: 90, max: 100, label: "Level 90-100", format: "سيتم تحديد الصيغة لاحقاً" },
];

const ChangeId: React.FC = () => {
  const navigate = useNavigate();
  const [newId, setNewId] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  // Demo user level
  const userLevel = 35;
  const currentRange = levelRanges.find((r) => userLevel >= r.min && userLevel <= r.max);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newId.trim()) return;
    // Placeholder - will connect to API
    setStatus("success");
  };

  return (
    <MobileLayout showHeader headerTitle="تغيير الـ ID" onBack={() => navigate("/dashboard")}>
      <div className="px-5 py-6 space-y-6">
        {/* Current Level */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-4"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full gold-gradient flex items-center justify-center">
              <IdCard className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">مستواك الحالي</p>
              <p className="text-xs text-muted-foreground">Level {userLevel}</p>
            </div>
          </div>
          {currentRange && (
            <div className="p-3 bg-primary/5 rounded-xl border border-primary/10">
              <p className="text-xs text-primary font-semibold">{currentRange.label}</p>
              <p className="text-xs text-muted-foreground mt-1">الصيغة: {currentRange.format}</p>
            </div>
          )}
        </motion.div>

        {/* Available Formats */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h3 className="text-sm font-bold text-foreground mb-3">الصيغ المتاحة لمستواك</h3>
          <div className="space-y-2">
            {levelRanges
              .filter((r) => userLevel >= r.min)
              .map((range, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border transition-colors ${
                    currentRange === range
                      ? "border-primary/30 bg-primary/5"
                      : "border-border/30 bg-card/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">{range.label}</span>
                    {currentRange === range && (
                      <span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded-full">مستواك</span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">{range.format}</p>
                </div>
              ))}
          </div>
        </motion.div>

        {/* New ID Input */}
        <motion.form
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <div className="space-y-2">
            <label className="text-sm font-bold text-foreground">الـ ID الجديد</label>
            <input
              type="text"
              value={newId}
              onChange={(e) => {
                setNewId(e.target.value);
                setStatus("idle");
              }}
              placeholder="اكتب الـ ID الذي تريده"
              dir="ltr"
              className="w-full h-12 px-4 bg-input rounded-xl text-foreground placeholder:text-muted-foreground border border-border/50 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-center"
            />
          </div>

          {status === "success" && (
            <div className="flex items-center gap-2 p-3 bg-[hsl(var(--success)/0.1)] border border-[hsl(var(--success)/0.3)] rounded-xl">
              <CheckCircle2 className="w-4 h-4 text-[hsl(var(--success-foreground))]" />
              <p className="text-sm text-[hsl(var(--success-foreground))]">تم إرسال طلب تغيير الـ ID بنجاح</p>
            </div>
          )}

          {status === "error" && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-xl">
              <AlertCircle className="w-4 h-4 text-destructive" />
              <p className="text-sm text-destructive">عذراً، هذا الـ ID مستخدم من قبل شخص آخر</p>
            </div>
          )}

          <motion.button
            type="submit"
            whileTap={{ scale: 0.97 }}
            className="w-full h-12 gold-gradient rounded-xl text-primary-foreground font-bold flex items-center justify-center gap-2"
          >
            <ArrowRight className="w-5 h-5" />
            إرسال الطلب
          </motion.button>
        </motion.form>
      </div>
    </MobileLayout>
  );
};

export default ChangeId;
