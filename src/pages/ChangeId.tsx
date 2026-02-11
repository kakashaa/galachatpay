import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { IdCard, User, Send, CheckCircle, AlertCircle, XCircle, Info } from "lucide-react";
import MobileLayout from "@/components/MobileLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";

import { supabase } from "@/integrations/supabase/client";
import IdFormatCarousel from "@/components/IdFormatCarousel";
import { levelFormats } from "@/data/idFormats";
import { validateIdAgainstPatterns } from "@/utils/idPatternValidator";

const userTypeLabels: Record<number, string> = {
  0: "مستخدم عادي",
  1: "مستخدم عادي",
  2: "مضيف",
  3: "وكيل مضيفين",
  4: "وكيل شحن",
  5: "وكيل شحن ومضيفين",
  6: "مضيف ووكيل شحن",
};

const ID_CHANGE_KEY = "gala_id_changed";
const LEVEL_MILESTONES = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

function getCurrentMilestone(level: number): number {
  // Find the highest milestone the user has reached
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

function getIdChangeInfo(uuid: string, currentLevel: number): { changed: boolean; lastLevel: number | null; newId: string | null; date: string | null } {
  try {
    const stored = localStorage.getItem(ID_CHANGE_KEY);
    if (!stored) return { changed: false, lastLevel: null, newId: null, date: null };
    const data = JSON.parse(stored);
    if (data.uuid !== uuid) return { changed: false, lastLevel: null, newId: null, date: null };
    const lastMilestone = data.levelMilestone || 0;
    const currentMilestone = getCurrentMilestone(currentLevel);
    // User can change again only if they reached a NEW milestone
    if (currentMilestone > lastMilestone) {
      return { changed: false, lastLevel: lastMilestone, newId: data.newId, date: data.date };
    }
    return { changed: true, lastLevel: lastMilestone, newId: data.newId, date: data.date };
  } catch {
    return { changed: false, lastLevel: null, newId: null, date: null };
  }
}

function saveIdChange(uuid: string, newId: string, level: number) {
  const milestone = getCurrentMilestone(level);
  localStorage.setItem(ID_CHANGE_KEY, JSON.stringify({ uuid, newId, levelMilestone: milestone, date: new Date().toISOString() }));
}


const ChangeId: React.FC = () => {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const [newId, setNewId] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "taken" | "ineligible" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [alreadyChanged, setAlreadyChanged] = useState<{ changed: boolean; lastLevel: number | null; newId: string | null; date: string | null }>({ changed: false, lastLevel: null, newId: null, date: null });

  useEffect(() => {
    if (user) {
      const maxLvl = Math.max(user.level.receiver_level, user.level.sender_level);
      setAlreadyChanged(getIdChangeInfo(user.uuid, maxLvl));
    }
  }, [user]);

  if (!user) {
    navigate("/");
    return null;
  }

  const maxLevel = Math.max(user.level.receiver_level, user.level.sender_level);
  const currentRange = levelFormats.find((r) => maxLevel >= r.minLevel && maxLevel <= r.maxLevel);
  const availableRanges = levelFormats.filter((r) => maxLevel >= r.minLevel);
  const currentLevelIndex = availableRanges.findIndex((r) => r === currentRange);

  // Get allowed digit counts for the user's level
  const allowedDigits = availableRanges.flatMap((r) => r.groups.map((g) => g.digits));
  const uniqueAllowedDigits = [...new Set(allowedDigits)].sort((a, b) => a - b);

  const handleSubmit = async () => {
    const trimmedId = newId.trim();
    if (!trimmedId || !currentRange) return;
    if (alreadyChanged.changed) {
      const next = getNextMilestone(maxLevel);
      setStatus("error");
      setErrorMsg(next ? `لم تصل للفل المطلوب. يجب أن تصل للفل ${next} لتغيير الـ ID مرة أخرى.` : "وصلت لأعلى مستوى. لا يمكن التغيير مجدداً.");
      return;
    }
    if (maxLevel < 20) {
      setStatus("ineligible");
      return;
    }

    // Validate: must be numeric only
    if (!/^\d+$/.test(trimmedId)) {
      setStatus("error");
      setErrorMsg("الـ ID يجب أن يحتوي على أرقام فقط.");
      return;
    }

    // Validate: check digit count matches allowed formats
    if (!uniqueAllowedDigits.includes(trimmedId.length)) {
      setStatus("error");
      setErrorMsg(`عدد الأرقام غير مسموح. الأطوال المتاحة لمستواك: ${uniqueAllowedDigits.join("، ")}`);
      return;
    }

    // Validate: check ID matches at least one allowed pattern for the user's level
    const allAllowedPatterns = availableRanges
      .flatMap((r) => r.groups)
      .filter((g) => g.digits === trimmedId.length)
      .flatMap((g) => g.patterns);

    if (!validateIdAgainstPatterns(trimmedId, allAllowedPatterns)) {
      setStatus("error");
      setErrorMsg("الـ ID لا يطابق أي صيغة متاحة لمستواك. تأكد من أن نمط الأرقام يتوافق مع إحدى الصيغ المعروضة.");
      return;
    }

    setStatus("loading");
    setErrorMsg("");

    try {
      const { data, error } = await supabase.functions.invoke("gala-request", {
        body: { uuid: user.uuid, type: "uuid", value: trimmedId },
      });

      if (error) {
        // Edge function may return error with data in the body
        const errBody = typeof error === "object" && error?.context ? error.context : null;
        const apiMsg = data?.error || errBody?.error || "";
        if (apiMsg.toLowerCase().includes("invalid")) {
          setStatus("error");
          setErrorMsg("المعرف غير صالح. تأكد أنه يطابق إحدى الصيغ المتاحة لمستواك.");
        } else if (apiMsg.toLowerCase().includes("taken") || apiMsg.toLowerCase().includes("used")) {
          setStatus("taken");
        } else {
          setStatus("error");
          setErrorMsg(apiMsg || "حدث خطأ في الاتصال. حاول مرة أخرى.");
        }
        return;
      }

      if (!data?.success) {
        const msg = data?.error || "";
        if (msg.toLowerCase().includes("taken") || msg.toLowerCase().includes("used")) {
          setStatus("taken");
        } else if (msg.toLowerCase().includes("invalid")) {
          setStatus("error");
          setErrorMsg("المعرف غير صالح. تأكد أنه يطابق إحدى الصيغ المتاحة لمستواك.");
        } else {
          setStatus("error");
          setErrorMsg(msg || "فشل الطلب. حاول مرة أخرى.");
        }
        return;
      }

      // Update UUID in session immediately since change is now instant
      saveIdChange(user.uuid, trimmedId, maxLevel);
      setAlreadyChanged({ changed: true, lastLevel: getCurrentMilestone(maxLevel), newId: trimmedId, date: new Date().toISOString() });
      setUser({ ...user, uuid: trimmedId });
      setStatus("success");
    } catch {
      setStatus("error");
      setErrorMsg("حدث خطأ غير متوقع.");
    }
  };

  if (status === "success") {
    return (
      <MobileLayout showHeader headerTitle="تغيير الـ ID" onBack={() => navigate("/dashboard")}>
        <div className="flex flex-col items-center justify-center px-6 py-20">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", duration: 0.6 }} className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center mb-6">
            <CheckCircle className="w-10 h-10 text-success" />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="text-center">
           <h2 className="text-lg font-bold text-foreground mb-2">تم تغيير الـ ID بنجاح! 🎉</h2>
            <p className="text-sm text-muted-foreground">المعرف الجديد: <span className="font-bold text-primary" dir="ltr">{newId}</span></p>
            <p className="text-xs text-muted-foreground mt-2">تم تحديث الـ ID تلقائياً في حسابك</p>
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
            <Button onClick={() => navigate("/dashboard")} className="mt-8 gold-gradient text-primary-foreground font-bold">العودة للرئيسية</Button>
          </motion.div>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout showHeader headerTitle="تغيير الـ ID" onBack={() => navigate("/dashboard")}>
      <div className="px-5 py-4 space-y-5">
        {/* Monthly Limit Warning */}
        {alreadyChanged.changed && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-foreground">لم تصل للفل المطلوب</p>
              <p className="text-xs text-muted-foreground mt-1">
                آخر تغيير كان عند اللفل <span className="font-bold">{alreadyChanged.lastLevel}</span> إلى <span className="font-bold" dir="ltr">{alreadyChanged.newId}</span>.
                {getNextMilestone(maxLevel) ? ` يجب أن تصل للفل ${getNextMilestone(maxLevel)} لتغيير الـ ID مرة أخرى.` : " وصلت لأعلى مستوى."}
              </p>
            </div>
          </motion.div>
        )}

        {/* User Info */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4 space-y-3">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            معلومات الحساب
          </h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex justify-between bg-muted/30 rounded-lg p-2.5">
              <span className="text-muted-foreground">ID الحالي</span>
              <span className="font-bold text-foreground" dir="ltr">{user.uuid}</span>
            </div>
            <div className="flex justify-between bg-muted/30 rounded-lg p-2.5">
              <span className="text-muted-foreground">مستوى المستقبل</span>
              <span className="font-bold text-foreground">{user.level.receiver_level}</span>
            </div>
            <div className="flex justify-between bg-muted/30 rounded-lg p-2.5">
              <span className="text-muted-foreground">مستوى المرسل</span>
              <span className="font-bold text-foreground">{user.level.sender_level}</span>
            </div>
            <div className="flex justify-between bg-muted/30 rounded-lg p-2.5">
              <span className="text-muted-foreground">النوع</span>
              <span className="font-bold text-foreground">{userTypeLabels[user.type_user] || "مستخدم"}</span>
            </div>
          </div>
        </motion.div>

        {/* Level & Eligibility */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-4 space-y-3">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <IdCard className="w-4 h-4 text-primary" />
            مستواك الحالي
          </h3>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full gold-gradient flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">{maxLevel}</span>
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">{currentRange?.label || "غير مؤهل"}</p>
              <p className="text-[11px] text-muted-foreground">
                {maxLevel >= 20 ? "مؤهل لتغيير الـ ID" : "يجب أن يكون مستواك 20 أو أعلى"}
              </p>
            </div>
          </div>
          {maxLevel < 20 && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-xl">
              <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
              <p className="text-xs text-destructive">مستواك أقل من 20. لا يمكنك تغيير الـ ID حالياً.</p>
            </div>
          )}
        </motion.div>

        {/* Available Formats */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
            <IdCard className="w-4 h-4 text-primary" />
            الصيغ المتاحة لمستواك
          </h3>
          {availableRanges.length > 0 ? (
            <IdFormatCarousel
              availableLevels={availableRanges}
              currentLevelIndex={Math.max(0, currentLevelIndex)}
              maxLevel={maxLevel}
            />
          ) : (
            <div className="glass-card p-4 text-center">
              <p className="text-sm text-muted-foreground">يجب أن يكون مستواك 20 أو أعلى لعرض الصيغ المتاحة</p>
            </div>
          )}
          <div className="flex items-start gap-2 p-3 bg-primary/5 border border-primary/10 rounded-xl mt-3">
            <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="text-[11px] text-muted-foreground">يُسمح بتغيير الـ ID <strong>مرة واحدة لكل لفل</strong> (كل 10 مستويات).</p>
          </div>
        </motion.div>

        {/* New ID Input */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-4 space-y-3">
          <h3 className="text-sm font-bold text-foreground">الـ ID الجديد</h3>
          <Input
            type="text"
            value={newId}
            onChange={(e) => { setNewId(e.target.value); setStatus("idle"); }}
            placeholder="اكتب الـ ID الذي تريده"
            dir="ltr"
            className="h-12 bg-muted/30 border-border/30 text-center text-base"
            disabled={maxLevel < 20 || alreadyChanged.changed}
          />
          {status === "taken" && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-xl">
              <XCircle className="w-4 h-4 text-destructive shrink-0" />
              <p className="text-xs text-destructive">عذراً، هذا المعرف مستخدم من قبل شخص آخر</p>
            </div>
          )}
          {status === "ineligible" && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-xl">
              <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
              <p className="text-xs text-destructive">غير مؤهل لتغيير الـ ID حالياً</p>
            </div>
          )}
          {status === "error" && errorMsg && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-xl">
              <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
              <p className="text-xs text-destructive">{errorMsg}</p>
            </div>
          )}
        </motion.div>

        {/* Submit */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Button
            onClick={handleSubmit}
            disabled={!newId.trim() || maxLevel < 20 || status === "loading" || alreadyChanged.changed}
            className="w-full gold-gradient text-primary-foreground font-bold h-12 text-base disabled:opacity-40"
          >
            {status === "loading" ? (
              <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : alreadyChanged.changed ? (
              <>
                <AlertCircle className="w-5 h-5 ml-2" />
                لم تصل للفل المطلوب
              </>
            ) : (
              <>
                <Send className="w-5 h-5 ml-2" />
                إرسال الطلب
              </>
            )}
          </Button>
        </motion.div>
      </div>
    </MobileLayout>
  );
};

export default ChangeId;
