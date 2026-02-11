import React, { useState, useEffect } from "react";
import { Star, HelpCircle, Gift } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import StarSystemTutorial from "@/components/StarSystemTutorial";

interface UserStarBalance {
  id: string;
  user_uuid: string;
  current_month: string;
  monthly_stars: number;
  carryover_stars: number;
  total_stars: number;
  last_level: number;
}

const getMonthlyStars = (chargerLevel: number) => {
  if (chargerLevel >= 100) return 8;
  if (chargerLevel >= 90) return 7;
  if (chargerLevel >= 80) return 6;
  if (chargerLevel >= 70) return 5;
  if (chargerLevel >= 60) return 4;
  if (chargerLevel >= 50) return 3;
  if (chargerLevel >= 40) return 2;
  if (chargerLevel >= 30) return 1;
  return 0;
};

const getCurrentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

interface Props {
  open: boolean;
  onClose: () => void;
}

const StarWalletDialog: React.FC<Props> = ({ open, onClose }) => {
  const { user } = useAuth();
  const [starBalance, setStarBalance] = useState<UserStarBalance | null>(null);
  const [showGiftView, setShowGiftView] = useState(false);
  const [friendUuid, setFriendUuid] = useState("");
  const [giftAmount, setGiftAmount] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  const chargerLevel = user?.level?.charger_level ?? 0;
  const currentMonth = getCurrentMonth();
  const monthlyStars = getMonthlyStars(chargerLevel);
  const totalStars = starBalance?.total_stars ?? 0;

  useEffect(() => {
    if (open && user?.uuid) fetchStarBalance();
  }, [open, user?.uuid]);

  const fetchStarBalance = async () => {
    if (!user?.uuid) return;
    try {
      const { data, error } = await supabase
        .from("user_star_balance")
        .select("*")
        .eq("user_uuid", user.uuid)
        .eq("current_month", currentMonth)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      if (!data) {
        const lastLevel = localStorage.getItem(`star_last_level_${user.uuid}`)
          ? parseInt(localStorage.getItem(`star_last_level_${user.uuid}`)!)
          : chargerLevel;
        const levelDiff = chargerLevel - lastLevel;
        const levelBonus = levelDiff >= 5 ? Math.floor(levelDiff / 5) : 0;
        const newTotal = monthlyStars + levelBonus;

        const { error: insertError } = await supabase
          .from("user_star_balance")
          .insert({
            user_uuid: user.uuid,
            current_month: currentMonth,
            monthly_stars: monthlyStars,
            carryover_stars: 0,
            total_stars: newTotal,
            last_level: chargerLevel,
          });
        if (insertError) throw insertError;
        localStorage.setItem(`star_last_level_${user.uuid}`, chargerLevel.toString());
        setStarBalance({
          id: "", user_uuid: user.uuid, current_month: currentMonth,
          monthly_stars: monthlyStars, carryover_stars: 0, total_stars: newTotal, last_level: chargerLevel,
        });
      } else {
        setStarBalance(data as UserStarBalance);
      }
    } catch (err) {
      console.error("Error fetching star balance:", err);
    }
  };

  const handleGiftStars = async () => {
    if (!user?.uuid || !starBalance) return;
    if (!friendUuid.trim()) { toast.error("أدخل UUID الصديق"); return; }
    if (friendUuid.trim() === user.uuid) { toast.error("لا يمكنك إهداء نجوم لنفسك"); return; }
    if (giftAmount < 1 || giftAmount > totalStars) { toast.error("عدد النجوم غير صحيح"); return; }

    setSubmitting(true);
    try {
      const newSenderTotal = totalStars - giftAmount;
      const { error: senderError } = await supabase
        .from("user_star_balance")
        .update({ total_stars: newSenderTotal, carryover_stars: Math.max(0, newSenderTotal) })
        .eq("id", starBalance.id);
      if (senderError) throw senderError;

      const { data: recipientData, error: recipientFetchError } = await supabase
        .from("user_star_balance")
        .select("*")
        .eq("user_uuid", friendUuid.trim())
        .eq("current_month", currentMonth)
        .single();
      if (recipientFetchError && recipientFetchError.code !== "PGRST116") throw recipientFetchError;

      if (recipientData) {
        const { error: recipientError } = await supabase
          .from("user_star_balance")
          .update({
            total_stars: (recipientData as any).total_stars + giftAmount,
            carryover_stars: (recipientData as any).carryover_stars + giftAmount,
          })
          .eq("id", (recipientData as any).id);
        if (recipientError) throw recipientError;
      } else {
        const { error: insertError } = await supabase
          .from("user_star_balance")
          .insert({
            user_uuid: friendUuid.trim(), current_month: currentMonth,
            monthly_stars: 0, carryover_stars: giftAmount, total_stars: giftAmount, last_level: 0,
          });
        if (insertError) throw insertError;
      }

      // Create notification for recipient
      await supabase.from("notifications").insert({
        user_uuid: friendUuid.trim(),
        title: "نجوم مهداة 🎁",
        body: `تم إهداؤك ${giftAmount} نجمة من ${user.name}`,
        target: "individual",
      });

      toast.success(`تم إهداء ${giftAmount} نجمة لصديقك بنجاح! ⭐`);
      setShowGiftView(false);
      setFriendUuid("");
      setGiftAmount(1);
      fetchStarBalance();
    } catch (err: any) {
      toast.error(err?.message || "فشل الإهداء");
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (count: number) => (
    <div className="flex gap-0.5 justify-center">
      {Array.from({ length: Math.min(count, 8) }).map((_, i) => (
        <Star key={i} className="w-3 h-3 text-yellow-400 fill-yellow-400" />
      ))}
    </div>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { if (!v) { onClose(); setShowGiftView(false); } }}>
        <DialogContent className="max-w-sm rounded-2xl [&>button]:hidden">
          <DialogTitle className="text-center font-bold text-base flex items-center justify-center gap-2">
            <Star className="w-5 h-5 text-accent fill-accent" />
            محفظة النجوم
          </DialogTitle>

          {!showGiftView ? (
            <div className="space-y-4 pt-2" dir="rtl">
              {/* Big Balance */}
              <div className="text-center py-4">
                <p className="text-4xl font-black text-accent">{totalStars}</p>
                <p className="text-xs text-muted-foreground mt-1">نجمة متاحة</p>
                {renderStars(totalStars)}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl p-2.5 text-center bg-muted/30 border border-border/20">
                  <p className="text-[9px] text-muted-foreground">الشهرية</p>
                  <p className="text-sm font-black text-foreground">{monthlyStars}</p>
                </div>
                <div className="rounded-xl p-2.5 text-center bg-muted/30 border border-border/20">
                  <p className="text-[9px] text-muted-foreground">مُرحّلة</p>
                  <p className="text-sm font-black text-foreground">{starBalance?.carryover_stars ?? 0}</p>
                </div>
                <div className="rounded-xl p-2.5 text-center bg-muted/30 border border-border/20">
                  <p className="text-[9px] text-muted-foreground">لفل الشحن</p>
                  <p className="text-sm font-black text-primary">{chargerLevel}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                {totalStars > 0 && (
                  <Button
                    onClick={() => setShowGiftView(true)}
                    className="flex-1 bg-accent/15 border border-accent/20 text-accent hover:bg-accent/25"
                    variant="outline"
                  >
                    <Gift className="w-4 h-4 ml-1" />
                    إهداء نجوم
                  </Button>
                )}
                <Button
                  onClick={() => setShowTutorial(true)}
                  variant="outline"
                  className="flex-1"
                >
                  <HelpCircle className="w-4 h-4 ml-1" />
                  الشروط
                </Button>
              </div>

              <button onClick={onClose} className="w-full text-center text-sm text-muted-foreground py-1">إغلاق</button>
            </div>
          ) : (
            /* Gift View */
            <div className="space-y-4 pt-2" dir="rtl">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">UUID الصديق</label>
                <input
                  type="text"
                  value={friendUuid}
                  onChange={(e) => setFriendUuid(e.target.value)}
                  placeholder="أدخل UUID صديقك في غلا لايف"
                  className="w-full bg-muted/30 border border-border/30 rounded-xl px-3 py-2.5 text-sm"
                  dir="ltr"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">عدد النجوم</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setGiftAmount(Math.max(1, giftAmount - 1))}
                    className="w-9 h-9 rounded-xl bg-muted/30 border border-border/30 flex items-center justify-center text-lg font-bold"
                  >-</button>
                  <div className="flex-1 text-center">
                    <span className="text-2xl font-black text-accent">{giftAmount}</span>
                    <span className="text-xs text-muted-foreground mr-1">⭐</span>
                  </div>
                  <button
                    onClick={() => setGiftAmount(Math.min(totalStars, giftAmount + 1))}
                    className="w-9 h-9 rounded-xl bg-muted/30 border border-border/30 flex items-center justify-center text-lg font-bold"
                  >+</button>
                </div>
              </div>

              <div className="bg-accent/10 rounded-xl p-3 text-xs text-muted-foreground">
                <p className="font-bold text-accent mb-1">سيتم خصم {giftAmount} نجمة</p>
                <p>الرصيد بعد الإهداء: {totalStars - giftAmount} نجمة</p>
              </div>

              <Button
                onClick={handleGiftStars}
                disabled={submitting || giftAmount < 1 || giftAmount > totalStars}
                className="w-full gold-gradient text-primary-foreground font-bold h-11"
              >
                {submitting ? "جاري الإرسال..." : `إهداء ${giftAmount} نجمة`}
              </Button>
              <button onClick={() => setShowGiftView(false)} className="w-full text-center text-sm text-muted-foreground py-1">رجوع</button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <StarSystemTutorial open={showTutorial} onClose={() => setShowTutorial(false)} itemType="entry" />
    </>
  );
};

export default StarWalletDialog;
