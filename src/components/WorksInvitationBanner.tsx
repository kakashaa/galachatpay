import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle, XCircle, Loader2, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

interface WorksInvitation {
  id: string;
  works_id: string;
  member_type: string;
  agency_id?: string | null;
  member_name?: string | null;
}

const WorksInvitationBanner: React.FC = () => {
  const { user } = useAuth();
  const [invitation, setInvitation] = useState<WorksInvitation | null>(null);
  const [worksOwnerName, setWorksOwnerName] = useState("");
  const [loading, setLoading] = useState(false);
  const [responded, setResponded] = useState<"accepted" | "rejected" | null>(null);

  useEffect(() => {
    if (!user?.uuid) return;
    loadInvitation();

    const channel = supabase
      .channel("works_inv_" + user.uuid)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "works_members",
      }, () => loadInvitation())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.uuid]);

  const loadInvitation = async () => {
    if (!user?.uuid) return;
    const { data } = await supabase
      .from("works_members")
      .select("id, works_id, member_type, agency_id, member_name")
      .eq("member_uuid", user.uuid)
      .eq("status", "pending")
      .maybeSingle();

    if (data) {
      setInvitation(data as WorksInvitation);
      // Fetch works owner name
      const { data: works } = await supabase
        .from("works_accounts" as any)
        .select("user_name")
        .eq("id", data.works_id)
        .maybeSingle();
      setWorksOwnerName((works as any)?.user_name || "مستخدم");
    } else {
      setInvitation(null);
    }
  };

  const handleRespond = async (accept: boolean) => {
    if (!invitation) return;
    setLoading(true);
    try {
      await supabase
        .from("works_members")
        .update({ status: accept ? "active" : "rejected" } as any)
        .eq("id", invitation.id);

      setResponded(accept ? "accepted" : "rejected");
      toast.success(accept ? "تم قبول الدعوة! مرحباً بك في الفريق" : "تم رفض الدعوة");

      setTimeout(() => {
        setInvitation(null);
        setResponded(null);
      }, 2000);
    } catch {
      toast.error("فشل الرد على الدعوة");
    }
    setLoading(false);
  };

  if (!invitation && !responded) return null;

  return (
    <div className="mb-3">
      <AnimatePresence>
        {responded ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, height: 0 }}
            className={`rounded-2xl p-4 text-center border ${
              responded === "accepted"
                ? "bg-emerald-500/10 border-emerald-500/20"
                : "bg-red-500/10 border-red-500/20"
            }`}
            dir="rtl"
          >
            <p className={`text-sm font-bold ${responded === "accepted" ? "text-emerald-400" : "text-red-400"}`}>
              {responded === "accepted" ? "تم الانضمام للفريق بنجاح!" : "تم رفض الدعوة"}
            </p>
          </motion.div>
        ) : invitation ? (
          <motion.div
            key={invitation.id}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 space-y-3"
            dir="rtl"
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center">
                <Briefcase className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <span className="text-sm font-bold text-foreground">دعوة انضمام للبيدي</span>
                <p className="text-[11px] text-muted-foreground">
                  من <span className="font-bold text-foreground">{worksOwnerName}</span>
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              {invitation.member_type === "agent"
                ? `تمت دعوة وكالتك للانضمام لفريق البيدي الخاص بـ ${worksOwnerName}. بعد القبول ستبدأ نسبتك من راتب الوكالة تُحسب تلقائياً.`
                : `تمت دعوتك للانضمام لفريق البيدي الخاص بـ ${worksOwnerName} كـ داعم. بعد القبول ستبدأ نسبتك تُحسب تلقائياً.`}
            </p>

            <div className="flex gap-2">
              <Button
                onClick={() => handleRespond(true)}
                disabled={loading}
                size="sm"
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-black"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 ml-1" />
                    قبول
                  </>
                )}
              </Button>
              <Button
                onClick={() => handleRespond(false)}
                disabled={loading}
                size="sm"
                variant="outline"
                className="flex-1"
              >
                <XCircle className="w-4 h-4 ml-1" />
                رفض
              </Button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

export default WorksInvitationBanner;
