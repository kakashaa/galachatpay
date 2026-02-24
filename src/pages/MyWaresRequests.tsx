import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MobileLayout from "@/components/MobileLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Loader2, PackageOpen, Frame, DoorOpen, User, Gem } from "lucide-react";

const TYPE_MAP: Record<string, { label: string; emoji: string; icon: React.ElementType }> = {
  frame: { label: "إطار", emoji: "🖼", icon: Frame },
  entry_room: { label: "دخلة غرفة", emoji: "🚪", icon: DoorOpen },
  entry_profile: { label: "دخلة ملف شخصي", emoji: "👤", icon: User },
  necklace: { label: "قلادة", emoji: "📿", icon: Gem },
};

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "🟡 قيد المراجعة", color: "text-yellow-400", bg: "bg-yellow-500/10" },
  approved: { label: "🟢 تمت الموافقة", color: "text-emerald-400", bg: "bg-emerald-500/10" },
  rejected: { label: "🔴 مرفوض", color: "text-red-400", bg: "bg-red-500/10" },
  failed: { label: "🟠 فشل التنفيذ", color: "text-orange-400", bg: "bg-orange-500/10" },
};

interface WareRequest {
  id: number | string;
  ware_type: string;
  image_type: string;
  days: number;
  status: string;
  created_at: string;
}

const MyWaresRequests: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [uuid, setUuid] = useState(user?.uuid || "");
  const [requests, setRequests] = useState<WareRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const fetchRequests = async () => {
    if (!uuid) return;
    setLoading(true);
    setSearched(true);
    try {
      const { data, error } = await supabase.functions.invoke("wares-request", {
        body: { action: "my-requests", uuid },
      });
      if (error) throw error;
      const list = data?.requests || data?.data || [];
      setRequests(Array.isArray(list) ? list : []);
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.uuid) fetchRequests();
  }, []);

  return (
    <MobileLayout showHeader headerTitle="طلباتي" onBack={() => navigate(-1)}>
      <div className="p-4 space-y-4" dir="rtl">
        {/* Search */}
        <div className="flex gap-2">
          <Input
            type="number"
            value={uuid}
            onChange={e => setUuid(e.target.value)}
            placeholder="ادخل الآيدي..."
            className="rounded-xl flex-1"
          />
          <Button onClick={fetchRequests} disabled={!uuid || loading} className="rounded-xl">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </Button>
        </div>

        {/* Results */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="mr-2 text-sm text-muted-foreground">جاري البحث...</span>
          </div>
        )}

        {!loading && searched && requests.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <PackageOpen className="w-12 h-12 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">لا توجد طلبات بعد</p>
          </div>
        )}

        {!loading && requests.length > 0 && (
          <div className="space-y-3">
            {requests.map((req, idx) => {
              const typeInfo = TYPE_MAP[req.ware_type] || { label: req.ware_type, emoji: "📦", icon: Frame };
              const statusInfo = STATUS_MAP[req.status] || STATUS_MAP.pending;
              return (
                <div key={req.id || idx} className="bg-card rounded-2xl border border-border/50 p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-muted-foreground">#{req.id}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${statusInfo.bg} ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{typeInfo.emoji}</span>
                    <span className="font-bold text-sm text-foreground">{typeInfo.label}</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>الصيغة: {req.image_type?.toUpperCase()}</span>
                    <span>المدة: {req.days} يوم</span>
                  </div>
                  {req.created_at && (
                    <p className="text-xs text-muted-foreground/60">
                      {new Date(req.created_at).toLocaleDateString("ar-SA")}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </MobileLayout>
  );
};

export default MyWaresRequests;
