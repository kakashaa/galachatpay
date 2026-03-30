import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, ShieldOff, Ban, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const BDBansTab: React.FC = () => {
  const [bans, setBans] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [unbanning, setUnbanning] = useState<string | null>(null);

  const fetchBans = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("works_ban_requests" as any)
        .select("*")
        .order("created_at", { ascending: false });
      setBans(data || []);
    } catch {
      toast.error("فشل تحميل المحظورين");
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchBans(); }, [fetchBans]);

  const unbanUser = async (id: string) => {
    setUnbanning(id);
    try {
      await (supabase.from("works_ban_requests") as any)
        .update({ status: "unbanned" })
        .eq("id", id);
      toast.success("تم فك الحظر");
      fetchBans();
    } catch {
      toast.error("فشل فك الحظر");
    }
    setUnbanning(null);
  };

  const deleteRecord = async (id: string) => {
    try {
      await supabase.from("works_ban_requests").delete().eq("id", id);
      toast.success("تم الحذف");
      fetchBans();
    } catch {
      toast.error("فشل الحذف");
    }
  };

  const statusLabel = (s: string) => {
    if (s === "pending") return <Badge variant="destructive" className="text-[10px]">محظور</Badge>;
    if (s === "unbanned") return <Badge className="text-[10px] bg-emerald-500/20 text-emerald-400 border-emerald-500/30">مفكوك</Badge>;
    return <Badge variant="secondary" className="text-[10px]">{s}</Badge>;
  };

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Ban className="w-4 h-4 text-red-400" />
          <h3 className="text-sm font-bold">محظورين البيدي</h3>
          <Badge variant="outline" className="text-[10px]">{bans.length}</Badge>
        </div>
        <button onClick={fetchBans} disabled={loading} className="p-2 rounded-xl bg-muted/30 border border-border/30">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {loading && bans.length === 0 ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : bans.length === 0 ? (
        <p className="text-center text-xs text-muted-foreground py-8">لا يوجد محظورين حالياً</p>
      ) : (
        <div className="space-y-2">
          {bans.map((ban) => (
            <div key={ban.id} className="bg-card border border-border/30 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold font-mono" dir="ltr">{ban.user_uuid}</span>
                  {statusLabel(ban.status)}
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(ban.created_at).toLocaleDateString("ar-SA")}
                </span>
              </div>

              <p className="text-[11px] text-muted-foreground leading-relaxed">{ban.reason}</p>

              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <span>المحاولات: <span className="font-bold text-foreground">{ban.attempts}</span></span>
              </div>

              <div className="flex gap-2 pt-1">
                {ban.status === "pending" && (
                  <button
                    onClick={() => unbanUser(ban.id)}
                    disabled={unbanning === ban.id}
                    className="flex-1 h-8 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 disabled:opacity-50"
                  >
                    {unbanning === ban.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldOff className="w-3 h-3" />}
                    فك الحظر
                  </button>
                )}
                <button
                  onClick={() => deleteRecord(ban.id)}
                  className="h-8 px-3 rounded-lg text-[11px] font-bold bg-destructive/10 text-destructive border border-destructive/20"
                >
                  حذف
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BDBansTab;
