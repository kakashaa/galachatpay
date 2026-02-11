import React, { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Sparkles, User, Shield, Send, CheckCircle } from "lucide-react";
import MobileLayout from "@/components/MobileLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";

const EntryRequest: React.FC = () => {
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
      <MobileLayout showHeader headerTitle="دخولية" onBack={() => navigate("/dashboard")}>
        <div className="flex flex-col items-center justify-center px-6 py-20">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.6 }}
            className="w-20 h-20 rounded-full bg-cyan-500/20 flex items-center justify-center mb-6"
          >
            <CheckCircle className="w-10 h-10 text-cyan-400" />
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
    <MobileLayout showHeader headerTitle="دخولية" onBack={() => navigate("/dashboard")}>
      <div className="px-5 py-4 space-y-5">
        {/* Header Icon */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-2 py-4">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/15 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-cyan-400" />
          </div>
          <h2 className="text-base font-black text-foreground">طلب دخولية</h2>
          <p className="text-xs text-muted-foreground text-center">صمّم دخولية مميزة تظهر عند دخولك</p>
        </motion.div>

        {/* User Info */}
        {authUser && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-4 space-y-3">
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
          </motion.div>
        )}

        {/* Description */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-4 space-y-3">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Shield className="w-4 h-4 text-cyan-400" />
            وصف الدخولية المطلوبة
          </h3>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 500))}
            placeholder="اكتب وصفاً للدخولية التي تريدها..."
            className="bg-muted/30 border-border/30 min-h-[100px] text-sm resize-none"
            dir="rtl"
          />
          <p className="text-[11px] text-muted-foreground text-left">{description.length}/500</p>
        </motion.div>

        {/* Submit */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Button
            onClick={handleSubmit}
            disabled={!description.trim()}
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

export default EntryRequest;
