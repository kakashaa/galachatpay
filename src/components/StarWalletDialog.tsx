import React, { useState, useEffect } from "react";
import { Star, HelpCircle, Gift, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useStarBalance } from "@/hooks/use-star-balance";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import StarSystemTutorial from "@/components/StarSystemTutorial";

const STAR_TO_USD = 5; // each star = $5, so 10 stars = $50

interface Props {
  open: boolean;
  onClose: () => void;
  initialView?: "main" | "cashout";
}

const StarWalletDialog: React.FC<Props> = ({ open, onClose, initialView = "main" }) => {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<"main" | "gift" | "cashout" | "code_result">("main");
  const [friendUuid, setFriendUuid] = useState("");
  const [giftAmount, setGiftAmount] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [generatedCode, setGeneratedCode] = useState("");
  const [generatedAmount, setGeneratedAmount] = useState(0);

  const chargerLevel = user?.level?.charger_level ?? 0;
  const { starBalance, fetchStarBalance, currentMonth, monthlyStars } = 
    useStarBalance(user?.uuid, chargerLevel);
  
  const totalStars = starBalance?.total_stars ?? 0;

  useEffect(() => {
    if (open) {
      setCurrentView(initialView);
      if (user?.uuid) fetchStarBalance();
    }
  }, [open, user?.uuid, initialView, fetchStarBalance]);

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
        .maybeSingle();
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

      await supabase.from("star_gift_logs").insert({
        sender_uuid: user.uuid,
        sender_name: user.name,
        recipient_uuid: friendUuid.trim(),
        amount: giftAmount,
      } as any);

      await supabase.from("notifications").insert({
        user_uuid: friendUuid.trim(),
        title: "نجوم مهداة 🎁",
        body: `تم إهداؤك ${giftAmount} نجمة من ${user.name}`,
        target: "individual",
      });

      toast.success(`تم إهداء ${giftAmount} نجمة لصديقك بنجاح! ⭐`);
      setCurrentView("main");
      setFriendUuid("");
      setGiftAmount(1);
      fetchStarBalance();
    } catch (err: any) {
      toast.error(err?.message || "فشل الإهداء");
    } finally {
      setSubmitting(false);
    }
  };

  const generateCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "STAR-";
    for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  };

  const handleCashout = async () => {
    if (!user?.uuid || !starBalance) return;
    if (totalStars < 10) { toast.error("يجب أن يكون لديك 10 نجوم على الأقل للتحويل"); return; }

    setSubmitting(true);
    try {
      const starsToConvert = 10;
      const usdAmount = starsToConvert * STAR_TO_USD;
      const newTotal = totalStars - starsToConvert;
      const code = generateCode();

      // Deduct stars
      const { error: deductError } = await supabase
        .from("user_star_balance")
        .update({ total_stars: newTotal, carryover_stars: Math.max(0, newTotal) })
        .eq("id", starBalance.id);
      if (deductError) throw deductError;

      // Create cashout code
      const { error: codeError } = await supabase
        .from("star_cashout_codes")
        .insert({
          code,
          user_uuid: user.uuid,
          user_name: user.name,
          stars_amount: starsToConvert,
          usd_amount: usdAmount,
        });
      if (codeError) throw codeError;

      // Log it
      await supabase.from("star_gift_logs").insert({
        sender_uuid: user.uuid,
        sender_name: user.name,
        recipient_uuid: "CASHOUT",
        amount: starsToConvert,
      } as any);

      setGeneratedCode(code);
      setGeneratedAmount(usdAmount);
      setCurrentView("code_result");
      fetchStarBalance();
    } catch (err: any) {
      toast.error(err?.message || "فشل التحويل");
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
      <Dialog open={open} onOpenChange={(v) => { if (!v) { onClose(); setCurrentView("main"); } }}>
        <DialogContent className="max-w-sm rounded-2xl [&>button]:hidden">
          <DialogTitle className="text-center font-bold text-base flex items-center justify-center gap-2">
            <Star className="w-5 h-5 text-accent fill-accent" />
            محفظة النجوم
          </DialogTitle>

          {currentView === "main" && (
            <div className="space-y-4 pt-2" dir="rtl">
              <div className="text-center py-4">
                <p className="text-4xl font-black text-accent">{totalStars}</p>
                <p className="text-xs text-muted-foreground mt-1">نجمة متاحة</p>
                {renderStars(totalStars)}
              </div>

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

              {/* Cash value info */}
              <div className="rounded-xl p-3 text-center" style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)" }}>
                <p className="text-[10px] text-muted-foreground">قيمة نجومك النقدية</p>
                <p className="text-xl font-black text-emerald-400">${totalStars * STAR_TO_USD}</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">كل نجمة = ${STAR_TO_USD}</p>
              </div>

              <div className="flex gap-2">
                {totalStars > 0 && (
                  <>
                    <Button
                      onClick={() => setCurrentView("gift")}
                      className="flex-1 bg-accent/15 border border-accent/20 text-accent hover:bg-accent/25"
                      variant="outline"
                    >
                      <Gift className="w-4 h-4 ml-1" />
                      إهداء
                    </Button>
                    <Button
                      onClick={() => setCurrentView("cashout")}
                      className="flex-1 bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/25"
                      variant="outline"
                    >
                      <DollarSign className="w-4 h-4 ml-1" />
                      تحويل لكاش
                    </Button>
                  </>
                )}
                <Button onClick={() => setShowTutorial(true)} variant="outline" className="flex-1">
                  <HelpCircle className="w-4 h-4 ml-1" />
                  الشروط
                </Button>
              </div>

              <button onClick={onClose} className="w-full text-center text-sm text-muted-foreground py-1">إغلاق</button>
            </div>
          )}

          {currentView === "gift" && (
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
                  <button onClick={() => setGiftAmount(Math.max(1, giftAmount - 1))} className="w-9 h-9 rounded-xl bg-muted/30 border border-border/30 flex items-center justify-center text-lg font-bold">-</button>
                  <div className="flex-1 text-center">
                    <span className="text-2xl font-black text-accent">{giftAmount}</span>
                    <span className="text-xs text-muted-foreground mr-1">⭐</span>
                  </div>
                  <button onClick={() => setGiftAmount(Math.min(totalStars, giftAmount + 1))} className="w-9 h-9 rounded-xl bg-muted/30 border border-border/30 flex items-center justify-center text-lg font-bold">+</button>
                </div>
              </div>
              <div className="bg-accent/10 rounded-xl p-3 text-xs text-muted-foreground">
                <p className="font-bold text-accent mb-1">سيتم خصم {giftAmount} نجمة</p>
                <p>الرصيد بعد الإهداء: {totalStars - giftAmount} نجمة</p>
              </div>
              <Button onClick={handleGiftStars} disabled={submitting || giftAmount < 1 || giftAmount > totalStars} className="w-full gold-gradient text-primary-foreground font-bold h-11">
                {submitting ? "جاري الإرسال..." : `إهداء ${giftAmount} نجمة`}
              </Button>
              <button onClick={() => setCurrentView("main")} className="w-full text-center text-sm text-muted-foreground py-1">رجوع</button>
            </div>
          )}

          {currentView === "cashout" && (
            <div className="space-y-4 pt-2" dir="rtl">
              <div className="text-center py-3">
                <DollarSign className="w-10 h-10 mx-auto text-emerald-400 mb-1" />
                <p className="text-sm font-bold text-foreground">تحويل النجوم إلى كاش</p>
                <p className="text-[10px] text-muted-foreground">10 نجوم = $50 دولار</p>
              </div>

              <div className="rounded-xl p-3" style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)" }}>
                <div className="flex justify-between items-center text-sm mb-2">
                  <span className="text-muted-foreground">نجومك الحالية</span>
                  <span className="font-black text-foreground">{totalStars} ⭐</span>
                </div>
                <div className="flex justify-between items-center text-sm mb-2">
                  <span className="text-muted-foreground">سيتم خصم</span>
                  <span className="font-black text-foreground">10 ⭐</span>
                </div>
                <div className="border-t border-border/20 pt-2 flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">ستحصل على</span>
                  <span className="font-black text-emerald-400">$50</span>
                </div>
              </div>

              {totalStars < 10 && (
                <div className="bg-destructive/10 rounded-xl p-2.5 text-[10px] text-destructive text-center">
                  <p className="font-bold">❌ لا يمكنك التحويل</p>
                  <p>تحتاج 10 نجوم على الأقل. لديك {totalStars} فقط.</p>
                </div>
              )}

              <div className="bg-yellow-500/10 rounded-xl p-2.5 text-[10px] text-muted-foreground">
                <p className="font-bold text-yellow-400 mb-0.5">📋 كيف يعمل؟</p>
                <p>1. اضغط "تحويل" وسيتم إنشاء كود خاص</p>
                <p>2. انسخ الكود واذهب لصفحة سحب الراتب</p>
                <p>3. اختر "سحب عبر كود النجوم" وأدخل الكود</p>
                <p>4. أكمل بيانات التحويل واستلم فلوسك</p>
              </div>

              <Button
                onClick={handleCashout}
                disabled={submitting || totalStars < 10}
                className="w-full font-bold h-11 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {submitting ? "جاري الإنشاء..." : "تحويل 10 نجوم إلى $50"}
              </Button>
              <button onClick={() => setCurrentView("main")} className="w-full text-center text-sm text-muted-foreground py-1">رجوع</button>
            </div>
          )}

          {currentView === "code_result" && (
            <div className="space-y-4 pt-2" dir="rtl">
              <div className="text-center py-3">
                <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center mb-2">
                  <DollarSign className="w-8 h-8 text-emerald-400" />
                </div>
                <p className="text-sm font-bold text-foreground">تم إنشاء الكود بنجاح! 🎉</p>
                <p className="text-[10px] text-muted-foreground">قيمة الكود: ${generatedAmount}</p>
              </div>

              <div className="rounded-xl p-4 text-center" style={{ background: "rgba(34,197,94,0.1)", border: "2px dashed rgba(34,197,94,0.4)" }}>
                <p className="text-[10px] text-muted-foreground mb-1">كود السحب</p>
                <p className="text-xl font-black text-emerald-400 font-mono tracking-wider">{generatedCode}</p>
              </div>

              <Button
                onClick={() => {
                  navigator.clipboard.writeText(generatedCode);
                  toast.success("تم نسخ الكود!");
                }}
                variant="outline"
                className="w-full border-emerald-500/30 text-emerald-400"
              >
                📋 نسخ الكود
              </Button>

              <div className="bg-yellow-500/10 rounded-xl p-2.5 text-[10px] text-muted-foreground">
                <p className="font-bold text-yellow-400 mb-0.5">📌 الخطوة التالية</p>
                <p>اذهب إلى صفحة "سحب الراتب" واختر "سحب عبر كود النجوم" وأدخل الكود لإكمال عملية السحب.</p>
              </div>

              <button onClick={() => { setCurrentView("main"); onClose(); }} className="w-full text-center text-sm text-muted-foreground py-1">إغلاق</button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <StarSystemTutorial open={showTutorial} onClose={() => setShowTutorial(false)} itemType="entry" />
    </>
  );
};

export default StarWalletDialog;
