import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Home, MessageSquare, User, ShieldBan, MessageCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import GuestLoginPrompt from "./GuestLoginPrompt";
import { motion, AnimatePresence } from "framer-motion";

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
  requiresAuth?: boolean;
  badgeKey?: string;
}

const navItems: NavItem[] = [
  { icon: ShieldBan, label: "حظر", path: "/report" },
  { icon: MessageSquare, label: "الدعم", path: "/support-main", requiresAuth: true, badgeKey: "support" },
  { icon: Home, label: "الرئيسية", path: "/dashboard" },
  { icon: MessageCircle, label: "الرسائل", path: "/messages", requiresAuth: true, badgeKey: "messages" },
  { icon: User, label: "حسابي", path: "/my-requests", badgeKey: "requests" },
];

const BottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [pendingTickets, setPendingTickets] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

  const activeIndex = navItems.findIndex(item => location.pathname === item.path || location.pathname.startsWith(item.path + "/"));

  const fetchBadges = useCallback(async () => {
    if (!user?.uuid) return;
    try {
      let total = 0;
      const { count: c1 } = await supabase.from("salary_requests").select("*", { count: "exact", head: true }).eq("user_uuid", user.uuid).eq("status", "pending");
      total += c1 || 0;
      const { count: c2 } = await supabase.from("frame_claims").select("*", { count: "exact", head: true }).eq("user_uuid", user.uuid).eq("status", "pending");
      total += c2 || 0;
      const { count: c3 } = await supabase.from("entry_gift_claims").select("*", { count: "exact", head: true }).eq("user_uuid", user.uuid).eq("status", "pending");
      total += c3 || 0;
      const { count: c4 } = await supabase.from("animated_photo_requests").select("*", { count: "exact", head: true }).eq("user_uuid", user.uuid).eq("status", "pending");
      total += c4 || 0;
      const { count: c5 } = await supabase.from("custom_gifts").select("*", { count: "exact", head: true }).eq("user_uuid", user.uuid).eq("status", "pending");
      total += c5 || 0;
      setPendingRequests(total);

      const { count: ticketCount } = await supabase.from("support_tickets").select("*", { count: "exact", head: true }).eq("user_uuid", user.uuid).eq("status", "open");
      setPendingTickets(ticketCount || 0);

      const { count: dmCount } = await (supabase as any).from("direct_messages").select("*", { count: "exact", head: true }).neq("sender_uuid", user.uuid).eq("status", "sent");
      setUnreadMessages(dmCount || 0);
    } catch {
      // silent
    }
  }, [user?.uuid]);

  useEffect(() => {
    fetchBadges();
    const interval = setInterval(fetchBadges, 30_000);
    return () => clearInterval(interval);
  }, [fetchBadges]);

  const handleNav = (item: NavItem, index: number) => {
    if (item.requiresAuth && !isAuthenticated) {
      setShowLogin(true);
      return;
    }
    navigate(item.path);
  };

  const getBadge = (key?: string) => {
    if (key === "requests") return pendingRequests;
    if (key === "support") return pendingTickets;
    if (key === "messages") return unreadMessages;
    return 0;
  };

  return (
    <>
      <div className="fixed left-1/2 -translate-x-1/2 z-50" style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)" }}>
        <motion.nav
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 24, delay: 0.1 }}
          className="flex items-end gap-0.5 px-2 py-1.5 rounded-[28px]"
          style={{
            background: "linear-gradient(145deg, rgba(18, 18, 32, 0.95), rgba(10, 10, 20, 0.98))",
            boxShadow: "0 12px 40px -8px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.08) inset, 0 -1px 0 0 rgba(255,255,255,0.04) inset",
            backdropFilter: "blur(20px)",
          }}
        >
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = activeIndex === index;
            const isHome = index === 2;
            const badge = getBadge(item.badgeKey);

            if (isHome) {
              return (
                <button
                  key={index}
                  onClick={() => handleNav(item, index)}
                  className="relative flex flex-col items-center mx-1 -mt-3"
                >
                  {/* Floating home button */}
                  <motion.div
                    whileTap={{ scale: 0.85 }}
                    whileHover={{ scale: 1.08 }}
                    className="relative"
                  >
                    <motion.div
                      animate={isActive ? {
                        boxShadow: [
                          "0 4px 20px hsl(8 88% 62% / 0.4)",
                          "0 4px 28px hsl(8 88% 62% / 0.6)",
                          "0 4px 20px hsl(8 88% 62% / 0.4)",
                        ]
                      } : {
                        boxShadow: "0 4px 16px hsl(8 88% 62% / 0.3)"
                      }}
                      transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                      className="w-[52px] h-[52px] rounded-full flex items-center justify-center"
                      style={{
                        background: "linear-gradient(145deg, hsl(8 88% 62%), hsl(8 80% 50%))",
                      }}
                    >
                      <Icon className="w-6 h-6 text-primary-foreground" />
                    </motion.div>
                    {/* Ring animation for active */}
                    <AnimatePresence>
                      {isActive && (
                        <motion.div
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.8, opacity: 0 }}
                          className="absolute inset-[-3px] rounded-full border-2 border-primary/40"
                        />
                      )}
                    </AnimatePresence>
                  </motion.div>
                  <span className="text-[9px] font-bold mt-1 text-primary">{item.label}</span>
                </button>
              );
            }

            return (
              <button
                key={index}
                onClick={() => handleNav(item, index)}
                className="relative flex flex-col items-center group"
              >
                <motion.div
                  whileTap={{ scale: 0.8 }}
                  className={`relative w-[46px] h-[46px] rounded-2xl flex items-center justify-center transition-all duration-300 ${
                    isActive
                      ? "bg-primary/12"
                      : "bg-transparent hover:bg-muted/20"
                  }`}
                >
                  {/* Active glow */}
                  <AnimatePresence>
                    {isActive && (
                      <motion.div
                        layoutId="nav-glow"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        className="absolute inset-0 rounded-2xl"
                        style={{
                          background: "radial-gradient(circle, hsl(var(--primary) / 0.12) 0%, transparent 70%)",
                        }}
                      />
                    )}
                  </AnimatePresence>

                  <motion.div
                    animate={isActive ? { y: -2 } : { y: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    <Icon
                      className={`w-[20px] h-[20px] transition-colors duration-300 ${
                        isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground/70"
                      }`}
                    />
                  </motion.div>

                  {/* Badge */}
                  <AnimatePresence>
                    {badge > 0 && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="absolute top-1 right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-destructive text-[8px] font-black text-destructive-foreground flex items-center justify-center"
                        style={{ boxShadow: "0 2px 8px hsl(0 72% 51% / 0.4)" }}
                      >
                        {badge > 99 ? "99+" : badge}
                      </motion.span>
                    )}
                  </AnimatePresence>

                  {/* Active dot indicator */}
                  <AnimatePresence>
                    {isActive && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-primary"
                        style={{ boxShadow: "0 0 6px hsl(8 88% 62% / 0.6)" }}
                      />
                    )}
                  </AnimatePresence>
                </motion.div>

                <motion.span
                  animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0.5, y: 0 }}
                  className={`text-[9px] font-bold -mt-0.5 transition-colors duration-300 ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {item.label}
                </motion.span>
              </button>
            );
          })}
        </motion.nav>
      </div>
      <GuestLoginPrompt open={showLogin} onClose={() => setShowLogin(false)} />
    </>
  );
};

export default BottomNav;
