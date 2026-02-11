import React, { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Zap, Users, Wallet, Shield, CheckCircle, AlertCircle, DollarSign, ChevronLeft,
} from "lucide-react";
import MobileLayout from "@/components/MobileLayout";
import { Button } from "@/components/ui/button";

const steps = [
  {
    icon: Users,
    title: "الداعم يريد يشتري كوينزات",
    description: "نوفر له جميع البنوك (أمريكا، السعودية، اليمن) عشان يختار اللي تناسبه",
  },
  {
    icon: Wallet,
    title: "الداعم يحوّل على حساباتنا",
    description: "الداعم يحول المبلغ على أحد حساباتنا البنكية المتاحة",
  },
  {
    icon: Zap,
    title: "حوّل كوينزاتك لوكالتنا",
    description: "حوّل الكوينزات لوكالة 10000 ونحن نحولها للداعم + نحوّل لك الفلوس!",
  },
];

const InstantIntro: React.FC = () => {
  const navigate = useNavigate();
  const [understood, setUnderstood] = useState(false);

  return (
    <MobileLayout showHeader headerTitle="السحب الفوري ⚡" onBack={() => navigate("/dashboard")}>
      <div className="px-5 py-4 space-y-5 pb-32">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-3"
        >
          <div className="w-20 h-20 mx-auto rounded-2xl gold-gradient flex items-center justify-center shadow-lg">
            <Zap className="w-10 h-10 text-primary-foreground" />
          </div>
          <h2 className="text-xl font-bold text-foreground">بيع راتبك بسهولة! 💰</h2>
          <p className="text-sm text-muted-foreground">نساعدك تبيع كوينزاتك لأي داعم ونوفر له كل طرق الدفع</p>
        </motion.div>

        {/* Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-4"
        >
          <h3 className="font-bold text-foreground mb-2 gradient-text">كيف نساعدك؟</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            عندك داعم يريد يشتري منك كوينزات؟ 🤔
            <br /><br />
            <strong className="text-foreground">نسهّل عليك!</strong> إحنا نوفر للداعم جميع طرق الدفع،
            الداعم يحوّل الفلوس على حساباتنا، وأنت تحوّل الكوينزات لوكالتنا{" "}
            <strong className="text-primary">(10000)</strong>،
            ونحن نحولها للداعم ونحوّل لك المبلغ على بنكك فوراً! 💸
          </p>
        </motion.div>

        {/* Profit Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass-card p-4 border-emerald-500/20"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
              <DollarSign className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-bold text-foreground mb-1">ليش تحوّل لنا بدل الداعم؟ 🤑</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                لو حوّلت الكوينزات للداعم مباشرة تحصل على <strong className="text-destructive">7,500</strong> كوينز للدولار فقط!
                <br />
                لكن لما تحوّل لوكالتنا <strong className="text-primary">(10000)</strong> تحصل على <strong className="text-emerald-400">8,500</strong> كوينز للدولار! 🎉
              </p>
            </div>
          </div>
        </motion.div>

        {/* Steps */}
        <div className="space-y-3">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <span className="w-1.5 h-4 bg-primary rounded-full" />
            كيف تعمل الخدمة؟
          </h3>
          {steps.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.08 }}
              className="glass-card p-4 flex items-start gap-3"
            >
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <s.icon className="w-6 h-6 text-primary" />
                </div>
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full gold-gradient text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                  {i + 1}
                </div>
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-foreground text-sm mb-0.5">{s.title}</h4>
                <p className="text-xs text-muted-foreground">{s.description}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Warning */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="p-4 bg-destructive/10 border border-destructive/30 rounded-2xl"
        >
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <h3 className="font-bold text-destructive text-sm">⚠️ تنبيه مهم جداً!</h3>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            لا تحوّل الكوينزات لوكالتنا إلا بعد ما تتأكد إن الداعم حوّل الفلوس وأرسلك الإيصال!
          </p>
        </motion.div>

        {/* Checklist */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-card p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-foreground text-sm">كيف تتم العملية؟</h3>
          </div>
          <ul className="space-y-2 text-xs text-muted-foreground">
            {[
              "أرسل للداعم رابط حساباتنا البنكية",
              "الداعم يحوّل ويرسلك إيصال التحويل",
              "بعد التأكد من الإيصال، حوّل الكوينزات لوكالتنا (10000)",
              "نحن نحوّل الكوينزات للداعم",
              "نحوّل لك المبلغ على بنكك خلال دقائق!",
            ].map((text, i) => (
              <li key={i} className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Confirm */}
        <motion.button
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          onClick={() => setUnderstood(!understood)}
          className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center gap-3 ${
            understood ? "border-primary bg-primary/10" : "border-border/30 bg-muted/20 hover:border-primary/30"
          }`}
        >
          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
            understood ? "border-primary bg-primary" : "border-muted-foreground"
          }`}>
            {understood && <CheckCircle className="w-4 h-4 text-primary-foreground" />}
          </div>
          <span className="font-medium text-foreground text-sm">فهمت كيف تعمل الخدمة</span>
        </motion.button>
      </div>

      {/* Fixed Bottom */}
      <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto p-5 bg-background/80 backdrop-blur-xl border-t border-border/30 z-50">
        <Button
          onClick={() => navigate("/instant/banks")}
          disabled={!understood}
          className="w-full h-12 gold-gradient text-primary-foreground font-bold text-base disabled:opacity-40"
        >
          عرض حسابات الدفع <ChevronLeft className="w-5 h-5 mr-1" />
        </Button>
      </div>
    </MobileLayout>
  );
};

export default InstantIntro;
