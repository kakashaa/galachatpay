import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import LiveSupportChat from "@/components/LiveSupportChat";

/** Returns the on-duty super admin username based on Saudi time (UTC+3) */
const getOnDutySuperAdmin = (): string => {
  const now = new Date();
  const saudiHour = (now.getUTCHours() + 3) % 24;
  if (saudiHour >= 9 && saudiHour < 17) return "relax";
  if (saudiHour >= 17 || saudiHour < 1) return "janjoon";
  return "mars"; // 01:00-09:00
};

const SOSButton: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [chatKey, setChatKey] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [starting, setStarting] = useState(false);

  // Check for existing SOS chat on mount
  useEffect(() => {
    if (!user?.uuid) return;
    const saved = localStorage.getItem(`gala_sos_chat_${user.uuid}`);
    if (saved) {
      const check = async () => {
        try {
          const res = await supabase.functions.invoke("support-chat", {
            body: { action: "status", chat_key: saved },
          });
          if (res.data?.ok && !["ended", "closed"].includes(res.data?.status)) {
            setChatKey(saved);
          } else {
            localStorage.removeItem(`gala_sos_chat_${user.uuid}`);
          }
        } catch {
          localStorage.removeItem(`gala_sos_chat_${user.uuid}`);
        }
      };
      check();
    }
  }, [user?.uuid]);

  const openSOS = async () => {
    if (!user) return;

    // If already have active chat, just show it
    if (chatKey) {
      setShowChat(true);
      return;
    }

    setStarting(true);
    try {
      const superAdmin = getOnDutySuperAdmin();
      const res = await supabase.functions.invoke("support-chat", {
        body: {
          action: "start",
          user_uuid: user.uuid,
          user_name: user.name,
          chat_type: "sos",
        },
      });

      if (res.data?.ok && res.data?.chat_key) {
        const key = res.data.chat_key;
        setChatKey(key);
        localStorage.setItem(`gala_sos_chat_${user.uuid}`, key);

        // Send auto first message
        await supabase.functions.invoke("support-chat", {
          body: {
            action: "send",
            chat_key: key,
            sender_uuid: user.uuid,
            sender_name: user.name,
            sender_type: "user",
            message: `🆘 طلب دعم سريع من ${user.name} — السوبر أدمن المناوب: @${superAdmin}`,
          },
        });

        setShowChat(true);
        toast.success("تم فتح محادثة SOS");
      } else {
        toast.error(res.data?.error || "فشل فتح المحادثة");
      }
    } catch {
      toast.error("خطأ في الاتصال");
    } finally {
      setStarting(false);
    }
  };

  const closeChat = () => setShowChat(false);

  const endChat = () => {
    if (user?.uuid) {
      localStorage.removeItem(`gala_sos_chat_${user.uuid}`);
    }
    setChatKey(null);
    setShowChat(false);
  };

  if (!isAuthenticated) return null;

  return (
    <>
      {/* Floating SOS Button */}
      {!showChat && (
        <motion.button
          animate={{
            scale: [1, 1.15, 1],
            boxShadow: [
              "0 0 0 0 rgba(239,68,68,0.7)",
              "0 0 0 15px rgba(239,68,68,0)",
              "0 0 0 0 rgba(239,68,68,0)",
            ],
          }}
          transition={{ duration: 1.5, repeat: Infinity }}
          onClick={openSOS}
          disabled={starting}
          className="fixed bottom-20 left-4 z-40 w-14 h-14 rounded-full flex items-center justify-center shadow-lg"
          style={{
            background: "linear-gradient(135deg, hsl(350 89% 55%), hsl(20 90% 50%))",
          }}
        >
          {starting ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <span className="text-white font-black text-xs">SOS</span>
          )}
        </motion.button>
      )}

      {/* Chat Overlay */}
      <AnimatePresence>
        {showChat && chatKey && (
          <motion.div
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 bg-background flex flex-col"
            dir="rtl"
          >
            {/* Chat Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/30 bg-destructive/10">
              <button onClick={closeChat} className="p-2 rounded-xl bg-muted/50">
                <X className="w-5 h-5 text-foreground" />
              </button>
              <div className="text-center">
                <h2 className="text-sm font-black text-destructive">🆘 دعم طوارئ</h2>
                <p className="text-[10px] text-muted-foreground">
                  المناوب: @{getOnDutySuperAdmin()}
                </p>
              </div>
              <button
                onClick={endChat}
                className="px-3 py-1.5 rounded-lg bg-destructive/20 text-destructive text-[10px] font-bold"
              >
                إنهاء
              </button>
            </div>

            {/* Chat Body */}
            <div className="flex-1 overflow-hidden">
              <LiveSupportChat
                chatKey={chatKey}
                userUuid={user?.uuid || ""}
                userName={user?.name || ""}
                chatType="quick"
                onBack={closeChat}
                onEnded={endChat}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default SOSButton;
