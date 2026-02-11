import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import MobileLayout from "@/components/MobileLayout";

interface Notification {
  id: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

const Notifications: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [prevCount, setPrevCount] = useState(0);

  // تشغيل سوند وهزة عند إشعار جديد
  const playNotificationSound = () => {
    // إنشاء نغمة بسيطة باستخدام Web Audio API
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
  };

  const triggerNotificationEffect = () => {
    // تشغيل السوند
    playNotificationSound();

    // هزة الجوال
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }
  };

  useEffect(() => {
    if (!user?.uuid) return;
    const fetchNotifs = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .or(`target.eq.all,user_uuid.eq.${user.uuid}`)
        .order("created_at", { ascending: false })
        .limit(50);
      const newNotifications = (data as unknown as Notification[]) ?? [];
      
      // تشغيل السوند والهزة عند إشعار جديد
      if (prevCount > 0 && newNotifications.length > prevCount) {
        triggerNotificationEffect();
      }
      
      setNotifications(newNotifications);
      setPrevCount(newNotifications.length);
      setLoading(false);

      // Mark all as read
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
    fetchNotifs();
  }, [user?.uuid, prevCount]);

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
    <MobileLayout showHeader headerTitle="الإشعارات" onBack={() => navigate("/dashboard")}>
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
          notifications.map((notif) => (
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
                  <Bell className={`w-3.5 h-3.5 ${notif.is_read ? "text-muted-foreground" : "text-primary"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-bold text-foreground truncate">{notif.title}</h4>
                    {!notif.is_read && (
                      <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{notif.body}</p>
                  <span className="text-[10px] text-muted-foreground/60 mt-1 block">{timeAgo(notif.created_at)}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </MobileLayout>
  );
};

export default Notifications;
