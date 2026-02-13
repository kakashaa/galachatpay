import React from "react";
import { useNavigate } from "react-router-dom";
import { Zap, MessageSquare, Headset, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const SupportHub: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="mobile-container bg-background min-h-screen flex flex-col" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 bg-card/90 backdrop-blur-xl border-b border-border/30">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/15 border border-primary/30 hover:bg-primary/25 transition-colors"
        >
          <ArrowRight className="w-5 h-5 text-primary" />
          <span className="text-sm font-semibold text-primary">رجوع</span>
        </button>
        <h1 className="text-sm font-bold text-foreground">الدعم الفني</h1>
        <div className="w-16" />
      </header>

      <div className="flex-1 flex flex-col px-5 py-8">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="text-center mb-8"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.1 }}
            className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-3"
          >
            <Headset className="w-8 h-8 text-primary" />
          </motion.div>
          <h2 className="text-lg font-bold text-foreground">كيف نقدر نساعدك؟</h2>
        </motion.div>

        {/* Two options only */}
        <div className="space-y-4">
          {/* Quick Support */}
          <motion.button
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            onClick={() => navigate("/quick-support")}
            className="w-full glass-card p-5 relative overflow-hidden group transition-all active:scale-[0.97]"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
                <Zap className="w-7 h-7 text-amber-400" />
              </div>
              <div className="flex-1 text-right">
                <h3 className="text-sm font-bold text-foreground">دعم سريع ⚡</h3>
                <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                  أدخل كود الغرفة وسوبر أدمن بيجيك خلال دقائق
                </p>
              </div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-l from-amber-500/5 to-transparent pointer-events-none" />
          </motion.button>

          {/* Open Ticket */}
          <motion.button
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.35 }}
            onClick={() => navigate("/support/tickets")}
            className="w-full glass-card p-5 relative overflow-hidden group transition-all active:scale-[0.97]"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
                <MessageSquare className="w-7 h-7 text-blue-400" />
              </div>
              <div className="flex-1 text-right">
                <h3 className="text-sm font-bold text-foreground">فتح تذكرة 📩</h3>
                <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                  ارفع تذكرة وسيتم الرد عليك من فريق الدعم
                </p>
              </div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-l from-blue-500/5 to-transparent pointer-events-none" />
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default SupportHub;
