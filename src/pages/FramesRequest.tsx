import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { X, Star, Send, User as UserIcon, HelpCircle, Lock, Frame } from "lucide-react";
import MobileLayout from "@/components/MobileLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { toast } from "sonner";
import SvgaPlayer from "@/components/SvgaPlayer";
import GuestLoginPrompt from "@/components/GuestLoginPrompt";

interface FrameItem {
  id: string;
  title: string;
  file_url: string;
  thumbnail_url: string | null;
  star_level: number;
  is_active: boolean;
  display_order: number;
}

interface FrameClaim {
  id: string;
  frame_id: string;
  claim_type: string;
  claim_month: string;
  charger_level_at_claim: number;
}

const getLevelConfig = (chargerLevel: number) => {
  if (chargerLevel >= 50) return { maxStars: 3, monthlyLimit: 6 };
  if (chargerLevel >= 40) return { maxStars: 2, monthlyLimit: 3 };
  if (chargerLevel >= 30) return { maxStars: 1, monthlyLimit: 2 };
  return { maxStars: 0, monthlyLimit: 0 };
};

const getCurrentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const FramesRequest: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [frames, setFrames] = useState<FrameItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFrame, setSelectedFrame] = useState<FrameItem | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showClaimDialog, setShowClaimDialog] = useState(false);
  const [claimType, setClaimType] = useState<"self" | "friend">("self");
  const [friendUuid, setFriendUuid] = useState("");
  const [claims, setClaims] = useState<FrameClaim[]>([]);
  const [showRules, setShowRules] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showGuestLogin, setShowGuestLogin] = useState(false);

  const chargerLevel = user?.level?.charger_level ?? 0;
  const config = getLevelConfig(chargerLevel);
  const currentMonth = getCurrentMonth();

  const getLastMonthLevel = useCallback(() => {
    if (!user?.uuid) return chargerLevel;
    const stored = localStorage.getItem(`frame_charger_${user.uuid}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.month === currentMonth) return parsed.lastLevel;
    }
    return null;
  }, [user?.uuid, chargerLevel, currentMonth]);

  useEffect(() => {
    if (!user?.uuid) return;
    const key = `frame_charger_${user.uuid}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.month !== currentMonth) {
        localStorage.setItem(key, JSON.stringify({ month: currentMonth, lastLevel: parsed.currentLevel }));
      } else {
        localStorage.setItem(key, JSON.stringify({ ...parsed, currentLevel: chargerLevel }));
      }
    } else {
      localStorage.setItem(key, JSON.stringify({ month: currentMonth, lastLevel: chargerLevel, currentLevel: chargerLevel }));
    }
  }, [user?.uuid, chargerLevel, currentMonth]);

  const monthClaims = claims.filter((c) => c.claim_month === currentMonth);
  const remainingClaims = config.monthlyLimit - monthClaims.length;
  const lastLevel = getLastMonthLevel();
  const levelIncreased = lastLevel !== null && chargerLevel > lastLevel;

  useEffect(() => {
    fetchFrames();
    if (user?.uuid) fetchClaims();
  }, [user?.uuid]);

  const fetchFrames = async () => {
    try {
      const { data, error } = await supabase
        .from("frames")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      if (error) throw error;
      setFrames((data || []) as unknown as FrameItem[]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchClaims = async () => {
    if (!user?.uuid) return;
    try {
      const { data, error } = await supabase
        .from("frame_claims")
        .select("*")
        .eq("user_uuid", user.uuid);
      if (error) throw error;
      setClaims((data || []) as unknown as FrameClaim[]);
    } catch (err) {
      console.error(err);
    }
  };

  const canClaimFrame = (frame: FrameItem) => {
    if (config.monthlyLimit === 0) return false;
    if (frame.star_level > config.maxStars) return false;
    if (remainingClaims <= 0 && !levelIncreased) return false;
    return true;
  };

  const handleClaimStart = (frame: FrameItem) => {
    if (!user) {
      setShowGuestLogin(true);
      return;
    }
    setSelectedFrame(frame);
    setClaimType("self");
    setFriendUuid("");
    setShowClaimDialog(true);
  };

  const handleSubmitClaim = async () => {
    if (!user?.uuid || !selectedFrame) return;
    if (claimType === "friend" && !friendUuid.trim()) {
      toast.error("أدخل UUID الصديق");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("frame_claims").insert({
        user_uuid: user.uuid,
        frame_id: selectedFrame.id,
        claim_type: claimType,
        friend_uuid: claimType === "friend" ? friendUuid.trim() : null,
        claim_month: currentMonth,
        charger_level_at_claim: chargerLevel,
      } as any);
      if (error) throw error;
      toast.success(claimType === "self" ? "تم لبس الإطار بنجاح!" : "تم إرسال الإطار لصديقك!");
      setShowClaimDialog(false);
      fetchClaims();
    } catch (err: any) {
      toast.error(err?.message || "فشل الإرسال");
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (level: number) => (
    <div className="flex gap-0.5">
      {Array.from({ length: level }).map((_, i) => (
        <Star key={i} className="w-3 h-3 text-yellow-400 fill-yellow-400" />
      ))}
    </div>
  );

  const isSvga = (url: string) => url.toLowerCase().endsWith(".svga");

  const renderFramePreview = (frame: FrameItem, size: "sm" | "lg" = "sm") => {
    const dim = size === "sm" ? 120 : 280;
    if (isSvga(frame.file_url)) {
      return <SvgaPlayer src={frame.file_url} width={dim} height={dim} className={size === "sm" ? "w-full h-full object-contain" : "w-[280px] h-[280px]"} />;
    }
    return <img src={frame.file_url} alt={frame.title} className="w-full h-full object-contain" />;
  };

  return (
    <MobileLayout showHeader headerTitle="الإطارات" onBack={() => navigate("/dashboard")}>
      <div className="px-3 py-4 space-y-4">
        {/* Status Bar */}
        <div className="glass-card p-3 css-fade-up">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={() => setShowRules(true)} className="p-1.5 rounded-full bg-primary/10 animate-bounce-slow shadow-[0_0_8px_hsl(var(--primary)/0.4)]">
                <HelpCircle className="w-4 h-4 text-primary" />
              </button>
              <span className="text-[10px] text-muted-foreground">الشروط</span>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">لفل الشحن:</span>
                <span className="font-bold text-primary">{chargerLevel}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">المتبقي:</span>
                <span className="font-bold text-accent">{Math.max(0, remainingClaims)}/{config.monthlyLimit}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">الحد:</span>
                {renderStars(config.maxStars)}
              </div>
            </div>
          </div>
        </div>

        {/* Frames Grid - 3 per row */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : frames.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Frame className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">لا توجد إطارات حالياً</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 css-fade-up-d1" dir="rtl">
            {frames.map((frame) => {
              const canClaim = canClaimFrame(frame);
              return (
                <div key={frame.id} className="relative group">
                  <button
                    onClick={() => { setSelectedFrame(frame); setShowPreview(true); }}
                    className="w-full aspect-square rounded-xl overflow-hidden bg-muted/30 border border-border/20 relative"
                  >
                    <div className="absolute inset-0 flex items-center justify-center p-1">
                      {renderFramePreview(frame, "sm")}
                    </div>

                    {/* Overlay - stars only */}
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 pt-4 z-10">
                      <div className="flex items-center justify-center gap-1">
                        {renderStars(frame.star_level)}
                      </div>
                    </div>

                    {!canClaim && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
                        <Lock className="w-5 h-5 text-white/60" />
                      </div>
                    )}
                  </button>

                  {canClaim && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleClaimStart(frame); }}
                      className="absolute top-1.5 left-1.5 z-20 w-6 h-6 rounded-full bg-primary/90 flex items-center justify-center shadow-lg"
                    >
                      <Send className="w-3 h-3 text-primary-foreground" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={() => setShowPreview(false)}>
        <DialogContent className="max-w-sm w-full p-0 bg-background border rounded-2xl overflow-hidden [&>button]:hidden">
          <VisuallyHidden><DialogTitle>{selectedFrame?.title || "إطار"}</DialogTitle></VisuallyHidden>
          <div className="relative">
            <button onClick={() => setShowPreview(false)} className="absolute top-3 right-3 z-20 w-8 h-8 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white">
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center justify-center p-6 min-h-[300px] bg-muted/10">
              {selectedFrame && renderFramePreview(selectedFrame, "lg")}
            </div>
            {selectedFrame && (
              <div className="p-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold">{selectedFrame.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      {renderStars(selectedFrame.star_level)}
                      <span className="text-xs text-muted-foreground">ملف شخصي فقط</span>
                    </div>
                  </div>
                  {canClaimFrame(selectedFrame) && (
                    <Button onClick={() => { setShowPreview(false); handleClaimStart(selectedFrame); }} className="gold-gradient text-primary-foreground font-bold" size="sm">
                      <Send className="w-4 h-4 ml-1" />
                      احصل عليه
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Claim Dialog */}
      <Dialog open={showClaimDialog} onOpenChange={() => setShowClaimDialog(false)}>
        <DialogContent className="max-w-sm rounded-2xl [&>button]:hidden">
          <DialogTitle className="text-center font-bold text-base">{selectedFrame?.title}</DialogTitle>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <p className="text-xs font-bold text-muted-foreground">اختر الطريقة:</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setClaimType("self")}
                  className={`p-3 rounded-xl border text-center text-sm font-bold transition-all ${
                    claimType === "self" ? "border-primary bg-primary/10 text-primary" : "border-border/30 text-muted-foreground"
                  }`}
                >
                  <UserIcon className="w-5 h-5 mx-auto mb-1" />
                  ألبسه أنا
                </button>
                <button
                  onClick={() => setClaimType("friend")}
                  className={`p-3 rounded-xl border text-center text-sm font-bold transition-all ${
                    claimType === "friend" ? "border-primary bg-primary/10 text-primary" : "border-border/30 text-muted-foreground"
                  }`}
                >
                  <Send className="w-5 h-5 mx-auto mb-1" />
                  أرسله لصديق
                </button>
              </div>
            </div>

            {claimType === "friend" && (
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
            )}

            <Button onClick={handleSubmitClaim} disabled={submitting} className="w-full gold-gradient text-primary-foreground font-bold h-11">
              {submitting ? "جاري الإرسال..." : claimType === "self" ? "تأكيد اللبس" : "إرسال للصديق"}
            </Button>
            <button onClick={() => setShowClaimDialog(false)} className="w-full text-center text-sm text-muted-foreground py-1">إلغاء</button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rules Dialog */}
      <Dialog open={showRules} onOpenChange={() => setShowRules(false)}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogTitle className="text-center font-bold">شروط الإطارات</DialogTitle>
          <div className="space-y-3 text-sm" dir="rtl">
            <div className="bg-muted/30 rounded-xl p-3 space-y-2">
              <p className="font-bold text-primary">⭐ نجمة واحدة</p>
              <p className="text-xs text-muted-foreground">لفل الشحن 30+ • إطارين بالشهر</p>
            </div>
            <div className="bg-muted/30 rounded-xl p-3 space-y-2">
              <p className="font-bold text-primary">⭐⭐ نجمتين</p>
              <p className="text-xs text-muted-foreground">لفل الشحن 40+ • 3 إطارات بالشهر</p>
            </div>
            <div className="bg-muted/30 rounded-xl p-3 space-y-2">
              <p className="font-bold text-primary">⭐⭐⭐ ثلاث نجوم</p>
              <p className="text-xs text-muted-foreground">لفل الشحن 50+ • 6 إطارات بالشهر</p>
            </div>
            <div className="bg-accent/10 rounded-xl p-3">
              <p className="text-xs text-muted-foreground">
                💡 إذا زاد لفل الشحن عن الشهر السابق بدرجة واحدة على الأقل، تتجدد الصلاحيات.
                <br />الإطارات متاحة للملف الشخصي فقط.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <GuestLoginPrompt open={showGuestLogin} onClose={() => setShowGuestLogin(false)} />
    </MobileLayout>
  );
};

export default FramesRequest;
