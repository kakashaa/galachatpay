import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle, XCircle, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";

interface Invitation {
  id: string;
  bd_name: string;
  bd_referral_code: string;
  member_type: string;
  created_at: string;
}

const BDInvitationBanner: React.FC = () => {
  const { user } = useAuth();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [accountPassword, setAccountPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPasswordFor, setShowPasswordFor] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uuid) return;
    loadInvitations();
    // Realtime subscription
    const channel = supabase
      .channel("bd_invitations_" + user.uuid)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "bd_member_invitations",
        filter: `member_uuid=eq.${user.uuid}`,
      }, () => loadInvitations())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.uuid]);

  const loadInvitations = async () => {
    if (!user?.uuid) return;
    try {
      const { data } = await supabase.functions.invoke("bd-manage", {
        body: { action: "get_invitations", user_uuid: user.uuid },
      });
      setInvitations(data?.invitations || []);
    } catch {
      // silent - don't block page load
    }
  };

  const handleRespond = async (inviteId: string, response: "accept" | "reject") => {
    if (response === "accept" && !password.trim()) {
      toast.error("يرجى إدخال كود الإحالة الخاص بالبيدي");
      return;
    }
    if (response === "accept" && !accountPassword.trim()) {
      toast.error("يرجى إدخال كلمة سر حسابك للتحقق من أهليتك");
      return;
    }

    setLoading(true);
    setRespondingId(inviteId);
    try {
      const result = await supabase.functions.invoke("bd-manage", {
        body: {
          action: "respond_invite",
          invitation_id: inviteId,
          response,
          user_uuid: user?.uuid,
          password: response === "accept" ? password : undefined,
          account_password: response === "accept" ? accountPassword : undefined,
        },
      });

      // Handle function invocation errors (network, timeout, etc.)
      if (result.error) {
        const errMsg = result.error?.message || "خطأ في الاتصال بالخادم";
        console.error("BD invite response error:", result.error);
        toast.error(`فشل الاتصال: ${errMsg}`);
        return;
      }

      const data = result.data;

      if (data?.error) {
        toast.error(data.error);
        if (data?.dismissed) {
          setInvitations((prev) => prev.filter((i) => i.id !== inviteId));
          setShowPasswordFor(null);
          setPassword("");
          setAccountPassword("");
        }
      } else {
        toast.success(data?.message || (response === "accept" ? "تم قبول الدعوة!" : "تم رفض الدعوة"));
        setInvitations((prev) => prev.filter((i) => i.id !== inviteId));
        setShowPasswordFor(null);
        setPassword("");
        setAccountPassword("");
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "خطأ غير معروف";
      console.error("BD invite catch error:", err);
      toast.error(`فشل الرد على الدعوة: ${errorMessage}`);
    } finally {
      setLoading(false);
      setRespondingId(null);
    }
  };

  if (invitations.length === 0) return null;

  return (
    <div className="space-y-2 mb-3">
      <AnimatePresence>
        {invitations.map((inv) => (
          <motion.div
            key={inv.id}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-primary/5 border border-primary/30 rounded-2xl p-4 space-y-3"
            dir="rtl"
          >
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" />
              <span className="text-sm font-bold text-foreground">دعوة انضمام لبيدي</span>
            </div>
            <p className="text-xs text-muted-foreground">
              لقد تلقيت دعوة من <span className="font-bold text-foreground">{inv.bd_name}</span>
              {" "}للانضمام كـ{inv.member_type === "supporter" ? "داعم" : "وكيل"}
            </p>

            {showPasswordFor === inv.id ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">أدخل كود الإحالة وكلمة سر حسابك للتحقق:</p>
                <Input
                  type="text"
                  placeholder="كود الإحالة..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value.toUpperCase())}
                  dir="ltr"
                  className="text-center font-mono tracking-widest"
                />
                <Input
                  type="password"
                  placeholder="كلمة سر حسابك في التطبيق..."
                  value={accountPassword}
                  onChange={(e) => setAccountPassword(e.target.value)}
                  dir="ltr"
                  className="text-center"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleRespond(inv.id, "accept")}
                    disabled={loading && respondingId === inv.id}
                    size="sm"
                    className="flex-1"
                  >
                    {loading && respondingId === inv.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle className="w-4 h-4 ml-1" />تأكيد القبول</>}
                  </Button>
                  <Button onClick={() => { setShowPasswordFor(null); setPassword(""); setAccountPassword(""); }} size="sm" variant="outline" className="flex-1">
                    إلغاء
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowPasswordFor(inv.id)}
                  size="sm"
                  className="flex-1"
                >
                  <CheckCircle className="w-4 h-4 ml-1" />موافقة
                </Button>
                <Button
                  onClick={() => handleRespond(inv.id, "reject")}
                  disabled={loading && respondingId === inv.id}
                  size="sm"
                  variant="outline"
                  className="flex-1"
                >
                  {loading && respondingId === inv.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><XCircle className="w-4 h-4 ml-1" />رفض</>}
                </Button>
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default BDInvitationBanner;
