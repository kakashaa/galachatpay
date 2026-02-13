import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Bot, Ticket, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const SupportChatEmbed = React.lazy(() => import("./SupportChatEmbed"));
const SupportTicketsEmbed = React.lazy(() => import("./SupportTicketsEmbed"));

type Tab = "bot" | "tickets";

const SupportMain: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("bot");

  const tabs = [
    { id: "bot" as Tab, label: "الدعم الذكي", icon: Bot },
    { id: "tickets" as Tab, label: "التذاكر", icon: Ticket },
  ];

  return (
    <div className="mobile-container bg-background min-h-screen flex flex-col" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/90 backdrop-blur-xl border-b border-border/30">
        <div className="flex items-center justify-between px-4 py-3">
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/15 border border-primary/30 hover:bg-primary/25 transition-colors"
          >
            <ArrowRight className="w-5 h-5 text-primary" />
            <span className="text-sm font-semibold text-primary">رجوع</span>
          </motion.button>
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2"
          >
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-primary" />
            </div>
            <h1 className="text-sm font-bold text-foreground">مركز الدعم</h1>
          </motion.div>
          <div className="w-16" />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 px-4 pb-3">
          {tabs.map((tab, i) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <motion.button
                key={tab.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.08 }}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 relative flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                  isActive
                    ? "text-primary-foreground"
                    : "bg-muted/30 text-muted-foreground border border-border/30 hover:bg-muted/50"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 gold-gradient rounded-xl"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <AnimatePresence mode="wait">
          {activeTab === "bot" ? (
            <motion.div
              key="bot"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              <React.Suspense fallback={<TabLoader />}>
                <SupportChatEmbed />
              </React.Suspense>
            </motion.div>
          ) : (
            <motion.div
              key="tickets"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="flex-1 overflow-y-auto"
            >
              <React.Suspense fallback={<TabLoader />}>
                <SupportTicketsEmbed />
              </React.Suspense>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const TabLoader = () => (
  <div className="flex-1 flex items-center justify-center py-20">
    <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
  </div>
);

export default SupportMain;
