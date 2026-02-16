import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { UserPlus, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Invitation {
  id: string;
  bd_uuid: string;
  bd_name: string;
  bd_referral_code: string;
  member_type: string;
  created_at: string;
}

const BDInvitationBanner: React.FC = () => {
  const { user } = useAuth();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [responding, setResponding] = useState<string | null>(null);

  const fetchInvitations = useCallback(async () => {
    if (!user?.uuid) return;
    const { data } = await supabase.functions.invoke("bd-referral", {
      body: { action: "get_invitations", member_uuid: user.uuid },
    });
    if (data?.success && data.data?.length > 0) {
      setInvitations(data.data);
    } else {
      setInvitations([]);
    }
  }, [user?.uuid]);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  // Realtime subscription
  useEffect(() => {
    if (!user?.uuid) return;
    const channel = supabase
      .channel("bd-invitations-" + user.uuid)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bd_member_invitations",
          filter: `member_uuid=eq.${user.uuid}`,
        },
        () => fetchInvitations()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.uuid, fetchInvitations]);

  const handleRespond = async (invId: string, response: "accept" | "reject") => {
    setResponding(invId);
    try {
      const { data } = await supabase.functions.invoke("bd-referral", {
        body: { action: "respond_invitation", invitation_id: invId, response },
      });
      if (data?.success) {
        toast.success(response === "accept" ? "تم قبول الدعوة بنجاح" : "تم رفض الدعوة");
        setInvitations((prev) => prev.filter((inv) => inv.id !== invId));
      } else {
        toast.error(data?.error || "فشلت العملية");
      }
    } catch {
      toast.error("خطأ في الاتصال");
    }
    setResponding(null);
  };

  if (invitations.length === 0) return null;

  return (
    <div className="px-3 space-y-2 mb-3" dir="rtl">
      {invitations.map((inv) => (
        <div
          key={inv.id}
          className="glass-card p-3 border border-primary/30 bg-primary/5 animate-in slide-in-from-top-2"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <UserPlus className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-foreground mb-0.5">
                لقد تلقيت دعوة!
              </p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                دعوة من <strong className="text-primary">{inv.bd_name}</strong>
                {" • "}
                <span className="text-muted-foreground/70">ID: {inv.bd_uuid}</span>
                {inv.bd_referral_code && (
                  <>
                    {" • "}
                    <span className="text-muted-foreground/70">كود: {inv.bd_referral_code}</span>
                  </>
                )}
              </p>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                نوع العضوية: {inv.member_type === "supporter" ? "داعم" : "وكالة"}
              </p>
            </div>
          </div>

          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              onClick={() => handleRespond(inv.id, "accept")}
              disabled={responding === inv.id}
              className="flex-1 gap-1.5 h-8 text-xs"
            >
              {responding === inv.id ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              موافقة
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleRespond(inv.id, "reject")}
              disabled={responding === inv.id}
              className="flex-1 gap-1.5 h-8 text-xs border-destructive/30 text-destructive hover:bg-destructive/10"
            >
              <X className="w-3.5 h-3.5" />
              رفض
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default BDInvitationBanner;
