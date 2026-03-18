import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell, CheckCheck, ArrowRight, Star, Hash, Sparkles,
  Frame, Camera, Gift, ShieldBan, Shield, DollarSign, Wallet, Scissors
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import MobileLayout from "@/components/MobileLayout";

interface Notification {
  id: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
  type?: string;
}

const notificationIcons: Record<string, { icon: React.ElementType; color: string }> = {
  vip_approved: { icon: Star, color: "text-amber-400" },
  vip_rejected: { icon: Star, color: "text-red-400" },
  id_change_approved: { icon: Hash, color: "text-purple-400" },
  id_change_rejected: { icon: Hash, color: "text-red-400" },
  entry_approved: { icon: Sparkles, color: "text-cyan-400" },
  entry_rejected: { icon: Sparkles, color: "text-red-400" },
  frame_approved: { icon: Frame, color: "text-blue-400" },
  frame_rejected: { icon: Frame, color: "text-red-400" },
  animated_photo_approved: { icon: Camera, color: "text-orange-400" },
  animated_photo_rejected: { icon: Camera, color: "text-red-400" },
  custom_gift_approved: { icon: Gift, color: "text-pink-400" },
  custom_gift_rejected: { icon: Gift, color: "text-red-400" },
  account_banned: { icon: ShieldBan, color: "text-red-400" },
  account_unbanned: { icon: Shield, color: "text-emerald-400" },
  salary_approved: { icon: DollarSign, color: "text-green-400" },
  salary_rejected: { icon: DollarSign, color: "text-red-400" },
  salary_charged: { icon: Wallet, color: "text-emerald-400" },
  hair_approved: { icon: Scissors, color: "text-pink-400" },
  hair_rejected: { icon: Scissors, color: "text-red-400" },
};

const getNotifIcon = (notif: Notification) => {
  const match = notificationIcons[notif.type || ""];
  if (match) return match;
  // Fallback: try to detect from title
  const t = notif.title || "";
  if (t.includes("VIP")) return t.includes("✅") ? notificationIcons.vip_approved : notificationIcons.vip_rejected;
  if (t.includes("راتب") || t.includes("سحب")) return t.includes("✅") ? notificationIcons.salary_approved : notificationIcons.salary_rejected;
  if (t.includes("كوينز")) return notificationIcons.salary_charged;
  if (t.includes("حظر") || t.includes("تعليق")) return notificationIcons.account_banned;
  if (t.includes("تفعيل حسابك")) return notificationIcons.account_unbanned;
  return { icon: Bell, color: "text-muted-foreground" };
};

const Notifications: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [prevCount, setPrevCount] = useState(0);

  const playNotificationSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = 800;
      oscillator.type = "sine";
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
      setTimeout(() => audioContext.close(), 600);
    } catch { /* silent */ }
  };

  const triggerNotificationEffect = () => {
    playNotificationSound();
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
  };

  const fetchNotifs = async () => {
    if (!user?.uuid) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .or(`target.eq.all,user_uuid.eq.${user.uuid}`)
      .order("created_at", { ascending: false })
      .limit(50);
    const newNotifications = (data as unknown as Notification[]) ?? [];

    if (prevCount > 0 && newNotifications.length > prevCount) {
      triggerNotificationEffect();
    }

    setNotifications(newNotifications);
    setPrevCount(newNotifications.length);
    setLoading(false);

    if (data && data.length > 0) {
      const unreadIds = (data as unknown as Notification[])
        .filter((n) => !n.is_read)
        .map((n) => n.id);
      if (unreadIds.length > 0) {
        await supabase
          .from("notifications")
          .update({ is_read: true })
          .in("id", unreadIds);
      }
    }
  };

  useEffect(() => {
    if (!user?.uuid) return;
    fetchNotifs();

    const channel = supabase
      .channel("notifications_realtime_" + user.uuid)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "notifications",
      }, () => {
        fetchNotifs();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.uuid]);

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "الآن";
    if (mins < 60) return `منذ ${mins} د`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `منذ ${hours} س`;
    const days = Math.floor(hours / 24);
    return `منذ ${days} ي`;
  };

  return (
    <MobileLayout showHeader headerTitle="الإشعارات" onBack={() => navigate(-1 as any)}>
      <div className="px-4 py-4 space-y-2" dir="rtl">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-14 h-14 rounded-full bg-muted/30 flex items-center justify-center">
              <Bell className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">لا توجد إشعارات حالياً</p>
          </div>
        ) : (
          notifications.map((notif) => {
            const receiptMatch = notif.body.match(/📎 إيصال الشحن: (https?:\/\/[^\s]+)/);
            const receiptUrl = receiptMatch ? receiptMatch[1] : null;
            const displayBody = receiptUrl ? notif.body.replace(/\n?📎 إيصال الشحن: https?:\/\/[^\s]+/, "") : notif.body;
            const { icon: NotifIcon, color: iconColor } = getNotifIcon(notif);

            return (
              <div
                key={notif.id}
                className={`rounded-xl p-3.5 border transition-colors ${
                  notif.is_read
                    ? "bg-muted/10 border-border/20"
                    : "bg-primary/5 border-primary/20"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className={`mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    notif.is_read ? "bg-muted/30" : "bg-primary/15"
                  }`}>
                    <NotifIcon className={`w-3.5 h-3.5 ${iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-bold text-foreground truncate">{notif.title}</h4>
                      {!notif.is_read && (
                        <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{displayBody}</p>
                    {receiptUrl && (
                      <a
                        href={receiptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-1.5 text-[11px] text-primary font-bold bg-primary/10 rounded-lg px-2.5 py-1.5 hover:bg-primary/20 transition-colors"
                      >
                        📎 فتح إيصال الشحن
                        <ArrowRight className="w-3 h-3" />
                      </a>
                    )}
                    <span className="text-[10px] text-muted-foreground/60 mt-1 block">{timeAgo(notif.created_at)}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </MobileLayout>
  );
};

export default Notifications;
