import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { IdCard, User, Send, CheckCircle, AlertCircle, XCircle, Info, ChevronDown } from "lucide-react";
import MobileLayout from "@/components/MobileLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import IdFormatCarousel from "@/components/IdFormatCarousel";
import { levelFormats } from "@/data/idFormats";
import { validateIdAgainstPatterns } from "@/utils/idPatternValidator";

const userTypeLabels: Record<number, string> = {
  0: "مستخدم عادي", 1: "مستخدم عادي", 2: "مضيف",
  3: "وكيل مضيفين", 4: "وكيل شحن", 5: "وكيل شحن ومضيفين", 6: "مضيف ووكيل شحن",
};

const LEVEL_MILESTONES = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

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
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "taken" | "ineligible" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [showFormats, setShowFormats] = useState(false);
  const [alreadyChanged, setAlreadyChanged] = useState<{ changed: boolean; lastLevel: number | null; newId: string | null; date: string | null }>({ changed: false, lastLevel: null, newId: null, date: null });
  const [loadingCheck, setLoadingCheck] = useState(true);

  useEffect(() => {
    if (!user) return;
    const maxLvl = Math.max(user.level.receiver_level, user.level.sender_level);
    
    // Check database for previous ID changes
    const checkDbHistory = async () => {
      setLoadingCheck(true);
      try {
        // Search by current uuid OR by new_id (since uuid changes after ID change)
        const { data, error } = await supabase
          .from("id_changes")
          .select("*")
          .or(`user_uuid.eq.${user.uuid},new_id.eq.${user.uuid}`)
          .order("created_at", { ascending: false })
          .limit(1);
        
        if (error) {
          console.error("Error checking id_changes:", error);
          setLoadingCheck(false);
          return;
        }

        if (data && data.length > 0) {
          const lastChange = data[0];
          const lastMilestone = lastChange.level_milestone;
          const currentMilestone = getCurrentMilestone(maxLvl);
          
          if (currentMilestone > lastMilestone) {
            // User has reached a new milestone, can change again
            setAlreadyChanged({ changed: false, lastLevel: lastMilestone, newId: lastChange.new_id, date: lastChange.created_at });
          } else {
            // Same milestone, can't change
            setAlreadyChanged({ changed: true, lastLevel: lastMilestone, newId: lastChange.new_id, date: lastChange.created_at });
          }
        } else {
          setAlreadyChanged({ changed: false, lastLevel: null, newId: null, date: null });
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
  const currentRange = levelFormats.find((r) => maxLevel >= r.minLevel && maxLevel <= r.maxLevel);
  const availableRanges = levelFormats.filter((r) => maxLevel >= r.minLevel);
  const currentLevelIndex = availableRanges.findIndex((r) => r === currentRange);
  const allowedDigits = availableRanges.flatMap((r) => r.groups.map((g) => g.digits));
  const uniqueAllowedDigits = [...new Set(allowedDigits)].sort((a, b) => a - b);

  const handleSubmit = async () => {
    const trimmedId = newId.trim();
    if (!trimmedId || !currentRange) return;
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
     if (!uniqueAllowedDigits.includes(trimmedId.length)) { 
       setStatus("error"); 
       setErrorMsg(`📏 طول الـ ID غير صحيح. الأطوال المتاحة لمستواك: ${uniqueAllowedDigits.join(" أو ")}`); 
       return; 
     }

     const allAllowedPatterns = availableRanges.flatMap((r) => r.groups).filter((g) => g.digits === trimmedId.length).flatMap((g) => g.patterns);
     if (!validateIdAgainstPatterns(trimmedId, allAllowedPatterns)) { 
       setStatus("error"); 
       setErrorMsg("⚠️ الـ ID لا يطابق الأنماط المتاحة. تحقق من الصيغ أعلاه واختر رقماً يطابق أحدها."); 
       return; 
     }

     setStatus("loading"); setErrorMsg("");
     try {
       const { data, error } = await supabase.functions.invoke("gala-request", { body: { uuid: user.uuid, type: "change_id", value: trimmedId } });
       if (error) {
         const apiMsg = data?.error || "";
         if (apiMsg.toLowerCase().includes("taken") || apiMsg.toLowerCase().includes("used")) {
           setStatus("taken");
           setErrorMsg("🚫 هذا المعرف مستخدم بالفعل. اختر معرّفاً آخر.");
         } else { 
           setStatus("error"); 
           setErrorMsg(`❌ ${apiMsg || "فشل طلب التغيير. تأكد من صحة البيانات وحاول مرة أخرى."}`); 
         }
         return;
       }
       if (!data?.success) {
         const msg = data?.error || "";
         if (msg.toLowerCase().includes("taken") || msg.toLowerCase().includes("used")) {
           setStatus("taken");
           setErrorMsg("🚫 هذا المعرف مستخدم بالفعل. اختر معرّفاً آخر.");
         } else { 
           setStatus("error"); 
           setErrorMsg(`❌ ${msg || "فشل الطلب. حاول مرة أخرى بعد قليل."}`); 
         }
         return;
       }

       // Save to database
       const milestone = getCurrentMilestone(maxLevel);
       await supabase.from("id_changes").insert({
         user_uuid: user.uuid,
         new_id: trimmedId,
         level_milestone: milestone,
       });

       setAlreadyChanged({ changed: true, lastLevel: milestone, newId: trimmedId, date: new Date().toISOString() });
       setUser({ ...user, uuid: trimmedId });
       setStatus("success");
     } catch { 
       setStatus("error"); 
       setErrorMsg("⚠️ حدث خطأ في الاتصال. تأكد من الاتصال بالإنترنت وحاول مرة أخرى."); 
     }
  };

  if (status === "success") {
    return (
      <MobileLayout showHeader headerTitle="تغيير الـ ID" onBack={() => navigate("/dashboard")}>
        <div className="flex flex-col items-center justify-center px-6 py-16">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4 animate-scale-in">
            <CheckCircle className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-base font-bold text-foreground mb-1">تم تغيير الـ ID بنجاح! 🎉</h2>
          <p className="text-xs text-muted-foreground">المعرف الجديد: <span className="font-bold text-primary" dir="ltr">{newId}</span></p>
          <Button onClick={() => navigate("/dashboard")} className="mt-6 gold-gradient text-primary-foreground font-bold text-sm h-10">العودة للرئيسية</Button>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout showHeader headerTitle="تغيير الـ ID" onBack={() => navigate("/dashboard")}>
      <div className="px-4 py-3 space-y-3">
        {/* Warning if already changed */}
        {alreadyChanged.changed && (
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

        {/* Formats - Collapsible */}
        <div className="glass-card overflow-hidden">
          <button
            onClick={() => setShowFormats(!showFormats)}
            className="w-full p-3 flex items-center justify-between"
            dir="rtl"
          >
            <div className="flex items-center gap-2">
              <IdCard className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-bold text-foreground">الصيغ المتاحة ({currentRange?.label || "—"})</span>
            </div>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${showFormats ? "rotate-180" : ""}`} />
          </button>
          {showFormats && (
            <div className="px-3 pb-3">
              {availableRanges.length > 0 ? (
                <IdFormatCarousel availableLevels={availableRanges} currentLevelIndex={Math.max(0, currentLevelIndex)} maxLevel={maxLevel} />
              ) : (
                <p className="text-[10px] text-muted-foreground text-center py-2">يجب أن يكون مستواك 20+</p>
              )}
            </div>
          )}
        </div>

        {/* Info tip */}
        <div className="flex items-start gap-1.5 px-1">
          <Info className="w-3 h-3 text-primary shrink-0 mt-0.5" />
          <p className="text-[10px] text-muted-foreground">تغيير الـ ID <strong>مرة واحدة لكل 10 مستويات</strong>. السجل محفوظ في النظام.</p>
        </div>

        {/* Input + Submit */}
        <div className="glass-card p-3 space-y-2.5">
          <h3 className="text-xs font-bold text-foreground" dir="rtl">الـ ID الجديد</h3>
          <Input
            type="text"
            value={newId}
            onChange={(e) => { setNewId(e.target.value); setStatus("idle"); }}
            placeholder="اكتب الـ ID الذي تريده"
            dir="ltr"
            className="h-10 bg-muted/20 border-border/20 text-center text-sm"
            disabled={maxLevel < 20 || alreadyChanged.changed || loadingCheck}
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
            onClick={handleSubmit}
            disabled={!newId.trim() || maxLevel < 20 || status === "loading" || alreadyChanged.changed || loadingCheck}
            className="w-full gold-gradient text-primary-foreground font-bold h-10 text-sm disabled:opacity-40"
          >
            {status === "loading" || loadingCheck ? (
              <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
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
