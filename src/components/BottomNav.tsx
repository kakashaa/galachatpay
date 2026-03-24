import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Home, MessageSquare, User, ShieldBan, MessageCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import GuestLoginPrompt from "./GuestLoginPrompt";

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
  requiresAuth?: boolean;
  badgeKey?: string;
}

const navItems: NavItem[] = [
  { icon: User, label: "حسابي", path: "/my-requests", badgeKey: "requests" },
  { icon: MessageCircle, label: "الرسائل", path: "/messages", requiresAuth: true, badgeKey: "messages" },
  { icon: Home, label: "الرئيسية", path: "/dashboard" },
  { icon: MessageSquare, label: "دعم عادي", path: "/support-main", requiresAuth: true, badgeKey: "support" },
  { icon: ShieldBan, label: "حظر", path: "/report" },
];

const BottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [tappedIndex, setTappedIndex] = useState<number | null>(null);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [pendingTickets, setPendingTickets] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

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

      // Unread DM count
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
    setTappedIndex(index);
    navigate(item.path);
  };

  const isActive = (item: NavItem, index: number) => {
    return tappedIndex === index && location.pathname === item.path;
  };

  React.useEffect(() => {
    const dockPaths = navItems.map(i => i.path);
    if (!dockPaths.includes(location.pathname)) {
      setTappedIndex(null);
    }
  }, [location.pathname]);

  const getBadge = (key?: string) => {
    if (key === "requests") return pendingRequests;
    if (key === "support") return pendingTickets;
    if (key === "messages") return unreadMessages;
    return 0;
  };

  return (
    <>
      <div className="fixed left-1/2 -translate-x-1/2 z-50" style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)" }}>
        <nav
          className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-white/10 css-slide-up"
          style={{
            background: "rgba(15, 15, 25, 0.88)",
            boxShadow: "0 8px 32px -6px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06) inset",
            backdropFilter: "blur(16px)",
          }}
        >
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const active = isActive(item, index);
            const badge = getBadge(item.badgeKey);

            return (
              <button
                key={index}
                onClick={() => handleNav(item, index)}
                className={`relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-2xl transition-all duration-300 active:scale-90 group ${
                  active ? "bg-primary/15" : "hover:bg-white/5"
                }`}
                style={active ? { boxShadow: "0 0 14px hsl(8 88% 62% / 0.25)" } : undefined}
              >
                <div className={`relative transition-transform duration-300 ${active ? "animate-dock-bounce" : "group-hover:animate-dock-wiggle"}`}>
                  <Icon
                    className={`w-5 h-5 transition-colors duration-200 ${
                      active ? "text-primary" : "text-muted-foreground"
                    }`}
                  />
                  {badge > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-[14px] h-[14px] px-0.5 rounded-full bg-destructive text-[8px] font-black text-white flex items-center justify-center">
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                </div>
                <span
                  className={`text-[9px] font-bold transition-colors duration-200 ${
                    active ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
      <GuestLoginPrompt open={showLogin} onClose={() => setShowLogin(false)} />
    </>
  );
};

export default BottomNav;
