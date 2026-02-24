import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { IdCard, User, Send, CheckCircle, AlertCircle, XCircle, Info, Gift } from "lucide-react";
import MobileLayout from "@/components/MobileLayout";
import { levelFormats, giftLevelFormats } from "@/data/idFormats";
import { matchesPattern } from "@/utils/idPatternValidator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import ServicePreviousRequests from "@/components/ServicePreviousRequests";
import { syncBdMemberIdChange } from "@/utils/bdMemberIdSync";

/** Allowed digit lengths per level range */
const LEVEL_ALLOWED_LENGTHS: { min: number; max: number; lengths: number[] }[] = [
  { min: 20, max: 29, lengths: [7] },
  { min: 30, max: 39, lengths: [6, 7] },
  { min: 40, max: 49, lengths: [5, 6, 7] },
  { min: 50, max: 59, lengths: [5, 6, 7] },
  { min: 60, max: 69, lengths: [5, 6, 7] },
  { min: 70, max: 79, lengths: [4, 5, 6, 7] },
  { min: 80, max: 89, lengths: [4, 5, 6, 7] },
  { min: 90, max: 100, lengths: [3, 4, 5, 6, 7] },
];

function getAllowedLengths(level: number): number[] {
  const lengths = new Set<number>();
  for (const range of LEVEL_ALLOWED_LENGTHS) {
    if (level >= range.min) {
      range.lengths.forEach((l) => lengths.add(l));
    }
  }
  return [...lengths].sort((a, b) => a - b);
}


const userTypeLabels: Record<number, string> = {
  0: "مستخدم عادي", 1: "مضيف", 2: "وكيل مضيفين",
  3: "وكيل شحن", 4: "وكيل شحن ومضيفين", 5: "وكيل شحن ومضيف", 6: "الكل",
};

const LEVEL_MILESTONES = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

const API_ERROR_MAP: Array<[RegExp, string]> = [
  [/taken|already.?in.?use|used/i, "🚫 هذا المعرف مستخدم بالفعل. اختر معرّفاً آخر."],
  [/uuid.?is.?invalid|invalid.?uuid|selected.?uuid/i, "🚫 سيرفر Gala رفض هذا الـ ID. الرقم قد يكون محجوز أو غير متاح. جرّب رقم مختلف تماماً."],
  [/type.?is.?invalid/i, "❌ نوع الطلب غير صحيح. حاول مرة أخرى."],
  [/too.?short|too.?long|length/i, "📏 طول الـ ID غير مناسب. راجع الصيغ المتاحة."],
  [/not.?allowed|forbidden|permission/i, "🔒 لا تملك صلاحية لهذا التغيير."],
  [/rate.?limit|too.?many/i, "⏳ طلبات كثيرة. انتظر قليلاً وحاول مرة أخرى."],
  [/server|internal/i, "🔧 خطأ في السيرفر. حاول مرة أخرى لاحقاً."],
];

function translateApiError(msg: string): string {
  if (!msg) return "❌ فشل الطلب. حاول مرة أخرى بعد قليل.";
  for (const [pattern, arabic] of API_ERROR_MAP) {
    if (pattern.test(msg)) return arabic;
  }
  return `❌ ${msg}`;
}

function getCurrentMilestone(level: number): number {
  for (let i = LEVEL_MILESTONES.length - 1; i >= 0; i--) {
    if (level >= LEVEL_MILESTONES[i]) return LEVEL_MILESTONES[i];
  }
  return 0;
}

function getNextMilestone(level: number): number | null {
  const current = getCurrentMilestone(level);
  const idx = LEVEL_MILESTONES.indexOf(current);
  if (idx < 0 || idx >= LEVEL_MILESTONES.length - 1) return null;
  return LEVEL_MILESTONES[idx + 1];
}

const ChangeId: React.FC = () => {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const [newId, setNewId] = useState("");
  const [isGiftMode, setIsGiftMode] = useState(false);
  const [recipientId, setRecipientId] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "taken" | "ineligible" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  
  const [alreadyChanged, setAlreadyChanged] = useState<{ changed: boolean; lastLevel: number | null; newId: string | null; date: string | null }>({ changed: false, lastLevel: null, newId: null, date: null });
  const [giftCount, setGiftCount] = useState(0);
  const [loadingCheck, setLoadingCheck] = useState(true);

  useEffect(() => {
    if (!user) return;
    const maxLvl = Math.max(user.level.receiver_level, user.level.sender_level);
    
    const checkDbHistory = async () => {
      setLoadingCheck(true);
      try {
        // Check self-change history
        const { data, error } = await supabase
          .from("id_changes")
          .select("*")
          .or(`user_uuid.eq.${user.uuid},new_id.eq.${user.uuid}`)
          .order("created_at", { ascending: false })
          .limit(10);
        
        if (error) {
          console.error("Error checking id_changes:", error);
          setLoadingCheck(false);
          return;
        }

        if (data && data.length > 0) {
          // Check self-change (level_milestone > 0 means self-change)
          const selfChanges = data.filter(d => d.level_milestone > 0);
          if (selfChanges.length > 0) {
            const lastChange = selfChanges[0];
            const lastMilestone = lastChange.level_milestone;
            const currentMilestone = getCurrentMilestone(maxLvl);
            
            if (currentMilestone > lastMilestone) {
              setAlreadyChanged({ changed: false, lastLevel: lastMilestone, newId: lastChange.new_id, date: lastChange.created_at });
            } else {
              setAlreadyChanged({ changed: true, lastLevel: lastMilestone, newId: lastChange.new_id, date: lastChange.created_at });
            }
          } else {
            setAlreadyChanged({ changed: false, lastLevel: null, newId: null, date: null });
          }

          // Check gift history (level_milestone = 0 means gift)
          const giftChanges = data.filter(d => d.level_milestone === 0);
          setGiftCount(giftChanges.length);
        } else {
          setAlreadyChanged({ changed: false, lastLevel: null, newId: null, date: null });
          setGiftCount(0);
        }
      } catch (err) {
        console.error("Error checking id change history:", err);
      }
      setLoadingCheck(false);
    };

    checkDbHistory();
  }, [user]);

  if (!user) { navigate("/"); return null; }

  const maxLevel = Math.max(user.level.receiver_level, user.level.sender_level);
  const canGift = maxLevel >= 70;
  const maxGifts = maxLevel >= 90 ? 3 : maxLevel >= 80 ? 2 : maxLevel >= 70 ? 1 : 0;
  const giftsRemaining = maxGifts - giftCount;
  const alreadyGifted = giftsRemaining <= 0;

  // Not eligible (level < 20)
  if (maxLevel < 20 && !loadingCheck) {
    return (
      <MobileLayout showHeader headerTitle="تغيير الـ ID" onBack={() => navigate("/dashboard")}>
        <div className="px-5 py-6 space-y-5">
          <ServicePreviousRequests userUuid={user.uuid} serviceType="change_id" />
          <div className="glass-card p-5 text-center space-y-4 css-fade-up">
            <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8 text-yellow-500" />
            </div>
            <h2 className="text-lg font-bold text-foreground">تغيير الـ ID غير متاح</h2>
            <p className="text-sm text-muted-foreground">
              مستواك الحالي: <span className="font-bold text-primary">{maxLevel}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              يجب أن يكون مستواك <span className="font-bold text-primary">20</span> على الأقل (المستقبل أو المرسل)
            </p>
          </div>

          <div className="glass-card p-4 space-y-3 css-fade-up-d1">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <IdCard className="w-4 h-4 text-primary" />
              شروط تغيير الـ ID
            </h3>
            <div className="space-y-2 text-xs" dir="rtl">
              {LEVEL_MILESTONES.filter(m => m >= 20).slice(0, 5).map((milestone) => (
                <div key={milestone} className="flex items-center justify-between bg-muted/30 rounded-lg p-2.5">
                  <span className="text-muted-foreground">لفل {milestone}</span>
                  <span className="text-foreground">تغيير واحد</span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-4 space-y-2 css-fade-up-d2">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Info className="w-4 h-4 text-primary" />
              ملاحظات مهمة
            </h3>
            <ul className="space-y-1.5 text-xs text-muted-foreground" dir="rtl">
              <li>• تغيير الـ ID مرة واحدة لكل 10 مستويات</li>
              <li>• الـ ID يجب أن يحتوي على أرقام فقط</li>
              <li>• طول الأرقام يعتمد على مستواك</li>
              <li>• التغيير نهائي حتى تصل للمستوى التالي</li>
            </ul>
          </div>
        </div>
      </MobileLayout>
    );
  }
  const allowedLengths = getAllowedLengths(maxLevel);

  const handleSubmit = async () => {
    const trimmedId = newId.trim();
    if (!trimmedId) return;
     if (alreadyChanged.changed) {
       const next = getNextMilestone(maxLevel);
       setStatus("error");
       setErrorMsg(next ? `⏸️ تغيير الـ ID متاح مرة واحدة فقط لكل 10 مستويات. الفل الحالي: ${maxLevel} • الفل المطلوب: ${next}` : "✅ وصلت لأعلى مستوى، لا يمكن تغيير الـ ID.");
       return;
     }
     if (maxLevel < 20) { 
       setStatus("ineligible"); 
       setErrorMsg("📊 يمكنك تغيير الـ ID من الفل 20 فما فوق. الفل الحالي: " + maxLevel);
       return; 
     }
     if (!/^\d+$/.test(trimmedId)) { 
       setStatus("error"); 
       setErrorMsg("🔢 الـ ID يجب أن يحتوي على أرقام فقط (0-9)، بدون أحرف أو رموز."); 
       return; 
     }
     if (!allowedLengths.includes(trimmedId.length)) { 
       setStatus("error"); 
       setErrorMsg(`📏 طول الـ ID غير صحيح. الأطوال المتاحة لمستواك: ${allowedLengths.join(" أو ")} أرقام`); 
       return; 
     }

     // Validate against allowed patterns for user's level
     const currentLevelFormat = levelFormats.find(lf => maxLevel >= lf.minLevel && maxLevel <= lf.maxLevel);
     if (currentLevelFormat) {
       const allPatterns = currentLevelFormat.groups
         .filter(g => g.digits === trimmedId.length)
         .flatMap(g => g.patterns);
       const matchesAny = allPatterns.some(p => matchesPattern(trimmedId, p));
       if (!matchesAny) {
         setStatus("error");
         setErrorMsg("🚫 الـ ID لا يطابق أي صيغة متاحة لمستواك. راجع الصيغ المعروضة واختر رقم يناسب إحداها.");
         return;
       }
     }

     setStatus("loading"); setErrorMsg("");
     try {
       const { data, error } = await supabase.functions.invoke("gala-request", { body: { uuid: user.uuid, type: "uuid", value: trimmedId } });
       if (error) {
         const apiMsg = data?.error || "";
         setStatus(apiMsg.toLowerCase().includes("taken") || apiMsg.toLowerCase().includes("used") ? "taken" : "error");
         setErrorMsg(translateApiError(apiMsg));
         return;
       }
       if (!data?.success) {
         const msg = data?.error || "";
         setStatus(msg.toLowerCase().includes("taken") || msg.toLowerCase().includes("used") ? "taken" : "error");
         setErrorMsg(translateApiError(msg));
         return;
       }

        // Save to database
        const milestone = getCurrentMilestone(maxLevel);
        await supabase.from("id_changes").insert({
          user_uuid: user.uuid,
          new_id: trimmedId,
          level_milestone: milestone,
        });

        // Send notification
        await supabase.from("notifications").insert({
          user_uuid: user.uuid,
          title: "تم تغيير الـ ID بنجاح ✅",
          body: `تم تغيير معرّفك من ${user.uuid} إلى ${trimmedId}. هذا التغيير نهائي حتى تصل للفل التالي.`,
          target: "user",
        });

         // Sync BD member if applicable
         await syncBdMemberIdChange(user.uuid, trimmedId, user.name);

         setAlreadyChanged({ changed: true, lastLevel: milestone, newId: trimmedId, date: new Date().toISOString() });
         setUser({ ...user, uuid: trimmedId });
        setStatus("success");
     } catch { 
       setStatus("error"); 
       setErrorMsg("⚠️ حدث خطأ في الاتصال. تأكد من الاتصال بالإنترنت وحاول مرة أخرى."); 
     }
  };

  const handleGiftSubmit = async () => {
    const trimmedId = newId.trim();
    const trimmedRecipient = recipientId.trim();
    if (!trimmedId || !trimmedRecipient) return;

    if (alreadyGifted) {
      setStatus("error");
      setErrorMsg(`🚫 لقد استخدمت جميع فرص الإهداء (${maxGifts} من ${maxGifts}). ${maxLevel < 90 ? `فرصة جديدة عند لفل ${maxLevel < 80 ? 80 : 90}.` : ""}`);
      return;
    }

    if (!/^\d+$/.test(trimmedId)) {
      setStatus("error");
      setErrorMsg("🔢 الـ ID يجب أن يحتوي على أرقام فقط (0-9).");
      return;
    }

    if (!/^\d+$/.test(trimmedRecipient)) {
      setStatus("error");
      setErrorMsg("🔢 آيدي المستلم يجب أن يحتوي على أرقام فقط.");
      return;
    }

    if (trimmedRecipient === user.uuid) {
      setStatus("error");
      setErrorMsg("🚫 لا يمكنك إهداء آيدي لنفسك.");
      return;
    }

    // Validate against gift patterns
    const giftPatterns = giftLevelFormats[0]?.groups
      .filter(g => g.digits === trimmedId.length)
      .flatMap(g => g.patterns) || [];

    if (giftPatterns.length === 0) {
      setStatus("error");
      setErrorMsg(`📏 طول الـ ID غير صحيح. الأطوال المتاحة للإهداء: 5 أو 6 أو 7 أرقام`);
      return;
    }

    const matchesAny = giftPatterns.some(p => matchesPattern(trimmedId, p));
    if (!matchesAny) {
      setStatus("error");
      setErrorMsg("🚫 الـ ID لا يطابق أي صيغة إهداء متاحة. راجع الصيغ المعروضة.");
      return;
    }

    setStatus("loading"); setErrorMsg("");
    try {
      const { data, error } = await supabase.functions.invoke("gala-request", {
        body: { uuid: trimmedRecipient, type: "uuid", value: trimmedId }
      });
      if (error || !data?.success) {
        const msg = data?.error || "";
        // In gift mode, "uuid is invalid" means the RECIPIENT doesn't exist
        if (/uuid.?is.?invalid|invalid.?uuid|selected.?uuid/i.test(msg)) {
          setStatus("error");
          setErrorMsg("🚫 آيدي المستلم غير موجود في نظام Gala. تأكد من صحة آيدي المستلم وحاول مرة أخرى.");
          return;
        }
        setStatus(msg.toLowerCase().includes("taken") || msg.toLowerCase().includes("used") ? "taken" : "error");
        setErrorMsg(translateApiError(msg));
        return;
      }

      // Save gift record with level_milestone = 0 to mark as gift
      await supabase.from("id_changes").insert({
        user_uuid: user.uuid,
        new_id: trimmedId,
        level_milestone: 0,
      });

      // Notification to sender
      await supabase.from("notifications").insert({
        user_uuid: user.uuid,
        title: "تم إهداء آيدي بنجاح 🎁",
        body: `تم إهداء الآيدي ${trimmedId} للمستخدم ${trimmedRecipient}.`,
        target: "user",
      });

      // Notification to recipient – send to BOTH old uuid and new uuid
      // because after the ID change, the recipient will log in with the new uuid
      await supabase.from("notifications").insert([
        {
          user_uuid: trimmedRecipient,
          title: "🎁 هدية آيدي جديد!",
          body: `قام ${user.name} (${user.uuid}) بإهدائك الآيدي ${trimmedId}.`,
          target: "user",
        },
        {
          user_uuid: trimmedId,
          title: "🎁 هدية آيدي جديد!",
          body: `قام ${user.name} (${user.uuid}) بإهدائك الآيدي ${trimmedId}.`,
          target: "user",
        },
      ]);

      // Sync BD member if recipient is a BD member
      await syncBdMemberIdChange(trimmedRecipient, trimmedId, "");

      setGiftCount(prev => prev + 1);
      setStatus("success");
    } catch {
      setStatus("error");
      setErrorMsg("⚠️ حدث خطأ في الاتصال. تأكد من الاتصال بالإنترنت وحاول مرة أخرى.");
    }
  };

  if (status === "success") {
    return (
      <MobileLayout showHeader headerTitle={isGiftMode ? "إهداء ID" : "تغيير الـ ID"} onBack={() => navigate("/dashboard")}>
        <div className="flex flex-col items-center justify-center px-6 py-16">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4 animate-scale-in">
            <CheckCircle className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-base font-bold text-foreground mb-1">
            {isGiftMode ? "تم إهداء الـ ID بنجاح! 🎁" : "تم تغيير الـ ID بنجاح! 🎉"}
          </h2>
          <p className="text-xs text-muted-foreground">
            {isGiftMode
              ? <>الآيدي <span className="font-bold text-primary" dir="ltr">{newId}</span> تم إهداءه للمستخدم <span className="font-bold text-primary" dir="ltr">{recipientId}</span></>
              : <>المعرف الجديد: <span className="font-bold text-primary" dir="ltr">{newId}</span></>}
          </p>
          <Button onClick={() => navigate("/dashboard")} className="mt-6 gold-gradient text-primary-foreground font-bold text-sm h-10">العودة للرئيسية</Button>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout showHeader headerTitle={isGiftMode ? "إهداء ID" : "تغيير الـ ID"} onBack={() => navigate("/dashboard")}>
      <div className="px-4 py-3 space-y-3">
        {/* طلباتي السابقة */}
        <ServicePreviousRequests userUuid={user.uuid} serviceType="change_id" />

        {/* Mode toggle: Change / Gift */}
        {canGift && (
          <div className="flex gap-2 p-1 bg-muted/20 rounded-xl" dir="rtl">
            <button
              onClick={() => { setIsGiftMode(false); setStatus("idle"); setErrorMsg(""); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
                !isGiftMode ? "gold-gradient text-primary-foreground shadow-md" : "text-muted-foreground"
              }`}
            >
              <IdCard className="w-3.5 h-3.5" />
              تغيير الـ ID
            </button>
            <button
              onClick={() => { setIsGiftMode(true); setStatus("idle"); setErrorMsg(""); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
                isGiftMode ? "gold-gradient text-primary-foreground shadow-md" : "text-muted-foreground"
              }`}
            >
              <Gift className="w-3.5 h-3.5" />
              إهداء ID
            </button>
          </div>
        )}
        {/* Warning if already changed */}
        {alreadyChanged.changed && !isGiftMode && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-foreground">لم تصل للفل المطلوب</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                آخر تغيير عند اللفل {alreadyChanged.lastLevel} → <span dir="ltr">{alreadyChanged.newId}</span>.
                {getNextMilestone(maxLevel) ? ` الهدف: لفل ${getNextMilestone(maxLevel)}` : " أعلى مستوى."}
              </p>
            </div>
          </div>
        )}

        {alreadyGifted && isGiftMode && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-foreground">تم استخدام جميع فرص الإهداء ({giftCount}/{maxGifts})</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {maxLevel < 90 ? `فرصة جديدة عند لفل ${maxLevel < 80 ? 80 : 90}.` : "وصلت لأقصى عدد إهداءات."}
              </p>
            </div>
          </div>
        )}

        {!alreadyGifted && isGiftMode && canGift && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-start gap-2">
            <Gift className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-foreground">فرص الإهداء المتبقية: {giftsRemaining} من {maxGifts}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                لفل 70 = مرة • لفل 80 = مرتين • لفل 90 = 3 مرات
              </p>
            </div>
          </div>
        )}

        {/* Account Info + Level in one card */}
        <div className="glass-card p-3 space-y-2.5">
          <div className="flex items-center justify-between" dir="rtl">
            <div className="flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-bold text-foreground">معلومات الحساب</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-8 h-8 rounded-full gold-gradient flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-[10px]">Lv.{maxLevel}</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-[10px]" dir="rtl">
            {[
              { l: "ID الحالي", v: user.uuid, dir: "ltr" },
              { l: "النوع", v: userTypeLabels[user.type_user] || "مستخدم" },
              { l: "مستوى المستقبل", v: user.level.receiver_level },
              { l: "مستوى المرسل", v: user.level.sender_level },
            ].map((item, i) => (
              <div key={i} className="flex justify-between bg-muted/20 rounded-lg px-2 py-1.5">
                <span className="text-muted-foreground">{item.l}</span>
                <span className="font-bold text-foreground" dir={item.dir}>{item.v}</span>
              </div>
            ))}
        </div>
          {maxLevel < 20 && (
            <div className="flex items-center gap-1.5 p-2 bg-destructive/10 border border-destructive/15 rounded-lg">
              <AlertCircle className="w-3 h-3 text-destructive shrink-0" />
              <p className="text-[10px] text-destructive">مستواك أقل من 20. لا يمكنك التغيير حالياً.</p>
            </div>
          )}
        </div>

        {/* ID formats per level */}
        {!isGiftMode ? (
          <div className="glass-card p-3 space-y-2.5" dir="rtl">
            <div className="flex items-center gap-2">
              <IdCard className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-bold text-foreground">الصيغ المتاحة حسب المستوى</span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              يمكنكم طلب الآيدي الذي تريدونه حسب مستواكم
            </p>
            {(() => {
              const currentLevelFormat = levelFormats.find(lf => maxLevel >= lf.minLevel && maxLevel <= lf.maxLevel);
              if (!currentLevelFormat) return (
                <p className="text-[10px] text-muted-foreground">لا توجد صيغ متاحة لمستواك الحالي.</p>
              );
              return (
                <div className="rounded-lg p-2.5 space-y-1.5 border bg-primary/10 border-primary/30">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-primary">
                      {currentLevelFormat.label}
                      <span className="text-[9px] mr-1 text-primary/70">(مستواك)</span>
                    </span>
                  </div>
                  {currentLevelFormat.groups.map((g) => (
                    <div key={g.digits} className="space-y-1">
                      <span className="text-[10px] text-muted-foreground">{g.digits} أرقام:</span>
                      <div className="flex flex-wrap gap-1">
                        {g.patterns.map((p) => (
                          <span key={p} className="text-[9px] font-mono bg-muted/40 text-foreground/80 rounded px-1.5 py-0.5" dir="ltr">
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        ) : (
          /* Gift mode patterns */
          <div className="glass-card p-3 space-y-2.5" dir="rtl">
            <div className="flex items-center gap-2">
              <Gift className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-bold text-foreground">صيغ الإهداء المتاحة</span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              يمكنك إهداء آيدي لمستخدم آخر بالصيغ التالية (لفل 70+)
            </p>
            {giftLevelFormats.map((glf) => (
              <div key={glf.minLevel} className="rounded-lg p-2.5 space-y-1.5 border bg-primary/10 border-primary/30">
                <span className="text-[11px] font-bold text-primary">{glf.label}</span>
                {glf.groups.map((g) => (
                  <div key={g.digits} className="space-y-1">
                    <span className="text-[10px] text-muted-foreground">{g.digits} أرقام:</span>
                    <div className="flex flex-wrap gap-1">
                      {g.patterns.map((p) => (
                        <span key={p} className="text-[9px] font-mono bg-muted/40 text-foreground/80 rounded px-1.5 py-0.5" dir="ltr">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Info tip */}
        <div className="flex items-start gap-1.5 px-1">
          <Info className="w-3 h-3 text-primary shrink-0 mt-0.5" />
          <p className="text-[10px] text-muted-foreground">
            {isGiftMode
              ? "الإهداء متاح مرة عند لفل 70، مرتين عند لفل 80، و3 مرات عند لفل 90. لا توجد شروط على المستلم."
              : <>تغيير الـ ID <strong>مرة واحدة لكل 10 مستويات</strong>. السجل محفوظ في النظام.</>}
          </p>
        </div>

        {/* Input + Submit */}
        <div className="glass-card p-3 space-y-2.5">
          {isGiftMode && (
            <>
              <h3 className="text-xs font-bold text-foreground" dir="rtl">آيدي المستخدم المستلم</h3>
              <Input
                type="text"
                value={recipientId}
                onChange={(e) => { setRecipientId(e.target.value); setStatus("idle"); }}
                placeholder="أدخل آيدي المستخدم الذي تريد إهداءه"
                dir="ltr"
                className="h-10 bg-muted/20 border-border/20 text-center text-sm"
                disabled={status === "loading"}
              />
            </>
          )}
          <h3 className="text-xs font-bold text-foreground" dir="rtl">
            {isGiftMode ? "الـ ID الهدية" : "الـ ID الجديد"}
          </h3>
          <Input
            type="text"
            value={newId}
            onChange={(e) => { setNewId(e.target.value); setStatus("idle"); }}
            placeholder={isGiftMode ? "اكتب الـ ID الذي تريد إهداءه" : "اكتب الـ ID الذي تريده"}
            dir="ltr"
            className="h-10 bg-muted/20 border-border/20 text-center text-sm"
            disabled={(!isGiftMode && (maxLevel < 20 || alreadyChanged.changed)) || (isGiftMode && alreadyGifted) || loadingCheck}
          />
          {status === "taken" && (
            <div className="flex items-center gap-1.5 p-2 bg-destructive/10 border border-destructive/15 rounded-lg">
              <XCircle className="w-3 h-3 text-destructive shrink-0" />
              <p className="text-[10px] text-destructive">هذا المعرف مستخدم</p>
            </div>
          )}
          {status === "ineligible" && (
            <div className="flex items-center gap-1.5 p-2 bg-destructive/10 border border-destructive/15 rounded-lg">
              <AlertCircle className="w-3 h-3 text-destructive shrink-0" />
              <p className="text-[10px] text-destructive">غير مؤهل حالياً</p>
            </div>
          )}
          {status === "error" && errorMsg && (
            <div className="flex items-center gap-1.5 p-2 bg-destructive/10 border border-destructive/15 rounded-lg">
              <AlertCircle className="w-3 h-3 text-destructive shrink-0" />
              <p className="text-[10px] text-destructive">{errorMsg}</p>
            </div>
          )}
          <Button
            onClick={isGiftMode ? handleGiftSubmit : handleSubmit}
            disabled={
              !newId.trim() ||
              (isGiftMode ? (!recipientId.trim() || alreadyGifted) : (maxLevel < 20 || alreadyChanged.changed)) ||
              status === "loading" || loadingCheck
            }
            className="w-full gold-gradient text-primary-foreground font-bold h-10 text-sm disabled:opacity-40"
          >
            {status === "loading" || loadingCheck ? (
              <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : isGiftMode ? (
              <><Gift className="w-4 h-4 ml-1.5" /> إهداء الـ ID</>
            ) : alreadyChanged.changed ? (
              <><AlertCircle className="w-4 h-4 ml-1.5" /> لم تصل للفل المطلوب</>
            ) : (
              <><Send className="w-4 h-4 ml-1.5" /> إرسال الطلب</>
            )}
          </Button>
        </div>
      </div>
    </MobileLayout>
  );
};

export default ChangeId;
