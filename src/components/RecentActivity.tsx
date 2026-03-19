import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Wallet, Sparkles, Frame, Crown, Camera, Scissors, Clock, CheckCircle, XCircle, ChevronLeft,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ActivityItem {
  id: string;
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  status: "pending" | "approved" | "rejected" | "done";
  date: string;
  navigateTo: string;
}

const statusIcon: Record<string, React.ReactNode> = {
  pending: <Clock className="w-2.5 h-2.5 text-amber-400" />,
  approved: <CheckCircle className="w-2.5 h-2.5 text-emerald-400" />,
  rejected: <XCircle className="w-2.5 h-2.5 text-red-400" />,
  done: <CheckCircle className="w-2.5 h-2.5 text-emerald-400" />,
};

const statusLabel: Record<string, string> = {
  pending: "قيد المراجعة",
  approved: "مقبول",
  rejected: "مرفوض",
  done: "تم",
};

const statusColor: Record<string, string> = {
  pending: "text-amber-400",
  approved: "text-emerald-400",
  rejected: "text-red-400",
  done: "text-emerald-400",
};

const formatDate = (d: string) => {
  const date = new Date(d);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `منذ ${days} يوم`;
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;
};

interface Props {
  userUuid: string;
}

const RecentActivity: React.FC<Props> = ({ userUuid }) => {
  const navigate = useNavigate();
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const results: ActivityItem[] = [];

      const [salaryRes, entryRes, frameRes, vipRes, animRes, hairRes] = await Promise.all([
        supabase.from("salary_requests").select("id, request_type, status, created_at, amount_usd").eq("user_uuid", userUuid).order("created_at", { ascending: false }).limit(3),
        supabase.from("entry_gift_claims").select("id, title, status, created_at").eq("user_uuid", userUuid).order("created_at", { ascending: false }).limit(2),
        supabase.from("frame_claims").select("id, title, status, created_at").eq("user_uuid", userUuid).order("created_at", { ascending: false }).limit(2),
        supabase.from("vip_requests").select("id, vip_level, created_at").eq("user_uuid", userUuid).order("created_at", { ascending: false }).limit(2),
        supabase.from("animated_photo_requests").select("id, status, created_at").eq("user_uuid", userUuid).order("created_at", { ascending: false }).limit(2),
        supabase.from("hair_selections").select("id, status, created_at, hairs(title)").eq("user_uuid", userUuid).order("created_at", { ascending: false }).limit(2),
      ]);

      for (const r of (salaryRes.data || []) as any[]) {
        results.push({
          id: r.id, label: `سحب $${r.amount_usd}`, icon: <Wallet className="w-3.5 h-3.5" />, iconBg: "bg-primary/15",
          status: r.status, date: r.created_at, navigateTo: "/my-requests",
        });
      }
      for (const r of (entryRes.data || []) as any[]) {
        results.push({
          id: r.id, label: r.title || "دخولية", icon: <Sparkles className="w-3.5 h-3.5 text-primary" />, iconBg: "bg-primary/15",
          status: r.status === "approved" ? "approved" : r.status === "rejected" ? "rejected" : "pending",
          date: r.created_at, navigateTo: "/my-requests",
        });
      }
      for (const r of (frameRes.data || []) as any[]) {
        results.push({
          id: r.id, label: r.title || "إطار", icon: <Frame className="w-3.5 h-3.5 text-purple-400" />, iconBg: "bg-purple-500/15",
          status: r.status === "approved" ? "approved" : r.status === "rejected" ? "rejected" : "pending",
          date: r.created_at, navigateTo: "/my-requests",
        });
      }
      for (const r of (vipRes.data || []) as any[]) {
        results.push({
          id: r.id, label: `VIP ${r.vip_level}`, icon: <Crown className="w-3.5 h-3.5 text-amber-400" />, iconBg: "bg-amber-500/15",
          status: "done", date: r.created_at, navigateTo: "/my-requests",
        });
      }
      for (const r of (animRes.data || []) as any[]) {
        results.push({
          id: r.id, label: "صورة متحركة", icon: <Camera className="w-3.5 h-3.5 text-pink-400" />, iconBg: "bg-pink-500/15",
          status: r.status === "approved" ? "approved" : r.status === "rejected" ? "rejected" : "pending",
          date: r.created_at, navigateTo: "/my-requests",
        });
      }
      for (const r of (hairRes.data || []) as any[]) {
        results.push({
          id: r.id, label: (r as any).hairs?.title || "تسريحة", icon: <Scissors className="w-3.5 h-3.5 text-violet-400" />, iconBg: "bg-violet-500/15",
          status: r.status === "approved" ? "approved" : r.status === "rejected" ? "rejected" : "pending",
          date: r.created_at, navigateTo: "/my-requests",
        });
      }

      results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setItems(results.slice(0, 5));
      setLoading(false);
    };
    fetch();
  }, [userUuid]);

  if (loading) return null;
  if (items.length === 0) return null;

  return (
    <div className="mt-4 mb-2">
      <div className="flex items-center justify-between mb-2.5 px-1">
        <div className="flex items-center gap-2">
          <div className="w-1 h-3.5 rounded-full gold-gradient" />
          <h3 className="text-xs font-black text-foreground">آخر العمليات</h3>
        </div>
        <button onClick={() => navigate("/my-requests")} className="text-[10px] text-primary font-bold flex items-center gap-0.5">
          عرض الكل <ChevronLeft className="w-3 h-3" />
        </button>
      </div>

      <div className="space-y-1.5">
        {items.map(item => (
          <button
            key={item.id}
            onClick={() => navigate(item.navigateTo)}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-card/40 border border-border/15 active:scale-[0.98] transition-all"
            dir="rtl"
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${item.iconBg}`}>
              {item.icon}
            </div>
            <div className="flex-1 min-w-0 text-right">
              <p className="text-[11px] font-bold text-foreground truncate">{item.label}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`flex items-center gap-0.5 text-[9px] font-bold ${statusColor[item.status]}`}>
                  {statusIcon[item.status]} {statusLabel[item.status]}
                </span>
                <span className="text-[8px] text-muted-foreground/60">•</span>
                <span className="text-[9px] text-muted-foreground">{formatDate(item.date)}</span>
              </div>
            </div>
            <ChevronLeft className="w-3 h-3 text-muted-foreground/30 shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
};

export default RecentActivity;
