import React, { useState } from "react";
import { Gift, User, Star, ArrowRight, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { matchesPattern } from "@/utils/idPatternValidator";

/** ID patterns available for star purchase, with their star cost */
const STAR_ID_OPTIONS = [
  { stars: 10, label: "آيدي خماسي موحد", patterns: ["AAAAA"], digits: 5, example: "77777" },
  { stars: 9, label: "آيدي خماسي مع رقم", patterns: ["AAAAB", "ABBBB"], digits: 5, example: "77778" },
  { stars: 8, label: "آيدي ثلاثي + ثنائي", patterns: ["AAABB", "AABBB"], digits: 5, example: "77788" },
  { stars: 7, label: "آيدي نمط متكرر", patterns: ["AABAB", "ABABA", "ABCBA"], digits: 5, example: "77878" },
];

interface Props {
  totalStars: number;
  onBack: () => void;
  onSuccess: () => void;
  fetchStarBalance: () => void;
  starBalance: any;
}

const StarIdPurchase: React.FC<Props> = ({ totalStars, onBack, onSuccess, fetchStarBalance, starBalance }) => {
  const { user, setUser } = useAuth();
  const [step, setStep] = useState<"select" | "form" | "confirm">("select");
  const [selectedOption, setSelectedOption] = useState<typeof STAR_ID_OPTIONS[0] | null>(null);
  const [newId, setNewId] = useState("");
  const [isGift, setIsGift] = useState(false);
  const [recipientUuid, setRecipientUuid] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSelectOption = (opt: typeof STAR_ID_OPTIONS[0]) => {
    if (totalStars < opt.stars) {
      toast.error(`تحتاج ${opt.stars} نجوم. لديك ${totalStars} فقط.`);
      return;
    }
    setSelectedOption(opt);
    setStep("form");
    setError("");
  };

  const validateAndConfirm = () => {
    const trimmedId = newId.trim();
    if (!trimmedId) { setError("أدخل الآيدي المطلوب"); return; }
    if (!/^\d+$/.test(trimmedId)) { setError("الآيدي يجب أن يحتوي على أرقام فقط"); return; }
    if (!selectedOption) return;

    if (trimmedId.length !== selectedOption.digits) {
      setError(`يجب أن يكون الآيدي ${selectedOption.digits} أرقام`);
      return;
    }

    const matchesAny = selectedOption.patterns.some(p => matchesPattern(trimmedId, p));
    if (!matchesAny) {
      setError(`الآيدي لا يطابق الصيغة المطلوبة (${selectedOption.patterns.join(" / ")})`);
      return;
    }

    if (isGift) {
      if (!recipientUuid.trim()) { setError("أدخل آيدي المستلم"); return; }
      if (!/^\d+$/.test(recipientUuid.trim())) { setError("آيدي المستلم يجب أن يحتوي على أرقام فقط"); return; }
      if (recipientUuid.trim() === user?.uuid) { setError("لا يمكنك إهداء لنفسك عبر وضع الإهداء"); return; }
    }

    setError("");
    setStep("confirm");
  };

  const handleSubmit = async () => {
    if (!user?.uuid || !starBalance || !selectedOption) return;
    setSubmitting(true);
    setError("");

    try {
      const trimmedId = newId.trim();
      const targetUuid = isGift ? recipientUuid.trim() : user.uuid;

      // Call the gala-request API to change the ID
      const { data, error: fnError } = await supabase.functions.invoke("gala-request", {
        body: { uuid: targetUuid, type: "uuid", value: trimmedId }
      });

      if (fnError || !data?.success) {
        const msg = data?.error || "";
        if (/taken|already.?in.?use|used/i.test(msg)) {
          setError("🚫 هذا الآيدي مستخدم بالفعل. اختر آخر.");
        } else if (/uuid.?is.?invalid|invalid.?uuid|selected.?uuid/i.test(msg)) {
          setError(isGift ? "🚫 آيدي المستلم غير موجود في النظام." : "🚫 الآيدي غير متاح. جرّب رقم مختلف.");
        } else {
          setError(`❌ ${msg || "فشل الطلب. حاول مرة أخرى."}`);
        }
        setStep("form");
        setSubmitting(false);
        return;
      }

      // Deduct stars
      const newTotal = totalStars - selectedOption.stars;
      const { error: deductError } = await supabase
        .from("user_star_balance")
        .update({ total_stars: newTotal, carryover_stars: Math.max(0, newTotal) })
        .eq("id", starBalance.id);
      if (deductError) throw deductError;

      // Log the star usage
      await supabase.from("star_gift_logs").insert({
        sender_uuid: user.uuid,
        sender_name: user.name,
        recipient_uuid: isGift ? recipientUuid.trim() : "ID_PURCHASE",
        amount: selectedOption.stars,
      } as any);

      // Save to id_changes
      await supabase.from("id_changes").insert({
        user_uuid: isGift ? recipientUuid.trim() : user.uuid,
        new_id: newId.trim(),
        level_milestone: 0, // star purchase
      });

      // Notifications
      if (isGift) {
        // Notify recipient
        await supabase.from("notifications").insert([
          {
            user_uuid: recipientUuid.trim(),
            title: "🎁 هدية آيدي جديد!",
            body: `قام ${user.name} (${user.uuid}) بإهدائك الآيدي ${newId.trim()} عبر النجوم.`,
            target: "user",
          },
          {
            user_uuid: newId.trim(),
            title: "🎁 هدية آيدي جديد!",
            body: `قام ${user.name} (${user.uuid}) بإهدائك الآيدي ${newId.trim()} عبر النجوم.`,
            target: "user",
          },
        ]);
        // Notify sender
        await supabase.from("notifications").insert({
          user_uuid: user.uuid,
          title: "تم إهداء آيدي بنجاح ⭐",
          body: `تم إهداء الآيدي ${newId.trim()} للمستخدم ${recipientUuid.trim()} مقابل ${selectedOption.stars} نجوم.`,
          target: "user",
        });
      } else {
        // Self purchase - update local user
        setUser({ ...user, uuid: newId.trim() });
        await supabase.from("notifications").insert({
          user_uuid: newId.trim(),
          title: "تم شراء آيدي بالنجوم ⭐",
          body: `تم تغيير آيديك إلى ${newId.trim()} مقابل ${selectedOption.stars} نجوم.`,
          target: "user",
        });
      }

      fetchStarBalance();
      toast.success(isGift ? `تم إهداء الآيدي ${newId.trim()} بنجاح! 🎁` : `تم تغيير آيديك إلى ${newId.trim()} بنجاح! ⭐`);
      onSuccess();
    } catch (err: any) {
      setError(err?.message || "حدث خطأ. حاول مرة أخرى.");
      setStep("form");
    } finally {
      setSubmitting(false);
    }
  };

  // Step 1: Select pattern
  if (step === "select") {
    return (
      <div className="space-y-3 pt-2 animate-fade-in" dir="rtl">
        <p className="text-xs text-muted-foreground text-center">اختر نوع الآيدي المطلوب</p>
        <div className="space-y-2">
          {STAR_ID_OPTIONS.map((opt) => {
            const canAfford = totalStars >= opt.stars;
            return (
              <button
                key={opt.stars}
                onClick={() => handleSelectOption(opt)}
                disabled={!canAfford}
                className={`w-full rounded-xl p-3 text-right transition-all border ${
                  canAfford
                    ? "bg-muted/20 border-border/30 hover:border-primary/40 hover:bg-primary/5 active:scale-[0.98]"
                    : "bg-muted/10 border-border/10 opacity-50 cursor-not-allowed"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs font-bold text-foreground">{opt.label}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      صيغة: <span dir="ltr" className="font-mono">{opt.patterns.join(" / ")}</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      مثال: <span dir="ltr" className="font-mono text-primary">{opt.example}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1 bg-accent/15 rounded-lg px-2 py-1">
                    <Star className="w-3 h-3 text-accent fill-accent" />
                    <span className="text-sm font-black text-accent">{opt.stars}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-center text-muted-foreground">رصيدك: {totalStars} نجمة ⭐</p>
        <button onClick={onBack} className="w-full text-center text-sm text-muted-foreground py-1">رجوع</button>
      </div>
    );
  }

  // Step 2: Enter ID + gift toggle
  if (step === "form") {
    return (
      <div className="space-y-3 pt-2 animate-fade-in" dir="rtl">
        <div className="flex items-center justify-between bg-accent/10 rounded-xl p-2.5">
          <div>
            <p className="text-xs font-bold text-foreground">{selectedOption?.label}</p>
            <p className="text-[10px] text-muted-foreground">صيغة: <span dir="ltr" className="font-mono">{selectedOption?.patterns.join(" / ")}</span></p>
          </div>
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 text-accent fill-accent" />
            <span className="text-sm font-black text-accent">{selectedOption?.stars}</span>
          </div>
        </div>

        {/* Gift toggle */}
        <div className="flex gap-2 p-1 bg-muted/20 rounded-xl">
          <button
            onClick={() => { setIsGift(false); setError(""); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
              !isGift ? "gold-gradient text-primary-foreground shadow-md" : "text-muted-foreground"
            }`}
          >
            <User className="w-3.5 h-3.5" />
            لنفسي
          </button>
          <button
            onClick={() => { setIsGift(true); setError(""); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
              isGift ? "gold-gradient text-primary-foreground shadow-md" : "text-muted-foreground"
            }`}
          >
            <Gift className="w-3.5 h-3.5" />
            إهداء
          </button>
        </div>

        {isGift && (
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">آيدي المستلم</label>
            <Input
              type="text"
              value={recipientUuid}
              onChange={(e) => { setRecipientUuid(e.target.value); setError(""); }}
              placeholder="أدخل آيدي المستخدم المستلم"
              dir="ltr"
              className="h-10 bg-muted/20 border-border/20 text-center text-sm"
            />
          </div>
        )}

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">الآيدي الجديد ({selectedOption?.digits} أرقام)</label>
          <Input
            type="text"
            value={newId}
            onChange={(e) => { setNewId(e.target.value); setError(""); }}
            placeholder={`مثال: ${selectedOption?.example}`}
            dir="ltr"
            className="h-10 bg-muted/20 border-border/20 text-center text-sm font-mono"
            maxLength={selectedOption?.digits}
          />
        </div>

        {error && (
          <div className="flex items-center gap-1.5 p-2 bg-destructive/10 border border-destructive/15 rounded-lg">
            <AlertCircle className="w-3 h-3 text-destructive shrink-0" />
            <p className="text-[10px] text-destructive">{error}</p>
          </div>
        )}

        <Button onClick={validateAndConfirm} className="w-full gold-gradient text-primary-foreground font-bold h-10 text-sm">
          <ArrowRight className="w-4 h-4 ml-1.5" />
          متابعة
        </Button>
        <button onClick={() => { setStep("select"); setError(""); }} className="w-full text-center text-sm text-muted-foreground py-1">رجوع</button>
      </div>
    );
  }

  // Step 3: Confirm
  return (
    <div className="space-y-3 pt-2 animate-fade-in" dir="rtl">
      <div className="text-center py-2">
        <div className="w-14 h-14 mx-auto rounded-full bg-yellow-500/20 flex items-center justify-center mb-2">
          <span className="text-3xl">⚠️</span>
        </div>
        <p className="text-sm font-bold text-foreground">تأكيد {isGift ? "إهداء" : "شراء"} الآيدي</p>
      </div>

      <div className="rounded-xl p-3 space-y-2" style={{ background: "rgba(234,179,8,0.1)", border: "1px solid rgba(234,179,8,0.25)" }}>
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">الآيدي</span>
          <span className="font-black text-foreground font-mono" dir="ltr">{newId.trim()}</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">النوع</span>
          <span className="font-bold text-foreground">{selectedOption?.label}</span>
        </div>
        {isGift && (
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">المستلم</span>
            <span className="font-bold text-foreground" dir="ltr">{recipientUuid.trim()}</span>
          </div>
        )}
        <div className="border-t border-border/20 pt-2 flex justify-between items-center text-sm">
          <span className="text-muted-foreground">التكلفة</span>
          <span className="font-black text-accent">{selectedOption?.stars} ⭐</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">الرصيد بعد الشراء</span>
          <span className="font-black text-foreground">{totalStars - (selectedOption?.stars || 0)} ⭐</span>
        </div>
      </div>

      <div className="bg-destructive/10 rounded-xl p-2.5 text-[10px] text-center text-muted-foreground">
        <p className="font-bold text-destructive mb-0.5">⚠️ تنبيه</p>
        <p>هذا الإجراء لا يمكن التراجع عنه بعد التأكيد</p>
      </div>

      {error && (
        <div className="flex items-center gap-1.5 p-2 bg-destructive/10 border border-destructive/15 rounded-lg">
          <AlertCircle className="w-3 h-3 text-destructive shrink-0" />
          <p className="text-[10px] text-destructive">{error}</p>
        </div>
      )}

      <Button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full font-bold h-11 bg-emerald-600 hover:bg-emerald-700 text-white"
      >
        {submitting ? "جاري التنفيذ..." : `✅ تأكيد ${isGift ? "الإهداء" : "الشراء"}`}
      </Button>
      <button onClick={() => setStep("form")} className="w-full text-center text-sm text-muted-foreground py-1">رجوع</button>
    </div>
  );
};

export default StarIdPurchase;
