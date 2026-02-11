import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Play, X, Star, Send, User as UserIcon, HelpCircle, Lock } from "lucide-react";
import MobileLayout from "@/components/MobileLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { toast } from "sonner";
import SvgaPlayer from "@/components/SvgaPlayer";
import GuestLoginPrompt from "@/components/GuestLoginPrompt";

interface EntryGift {
  id: string;
  title: string;
  video_url: string;
  thumbnail_url: string | null;
  gift_type: string; // profile | room | both
  star_level: number; // 1-3
  is_active: boolean;
  display_order: number;
}

interface CustomGift {
  id: string;
  title: string;
  video_url: string;
  thumbnail_url: string | null;
  user_name: string;
  user_gala_id: string | null;
  user_uuid: string;
  status: string;
}

interface ClaimRecord {
  id: string;
  gift_id: string;
  claim_type: string;
  gift_usage: string;
  claim_month: string;
  charger_level_at_claim: number;
}

// Rules based on charger level
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

const EntryRequest: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [gifts, setGifts] = useState<EntryGift[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGift, setSelectedGift] = useState<EntryGift | null>(null);
  const [showVideo, setShowVideo] = useState(false);
  const [showClaimDialog, setShowClaimDialog] = useState(false);
  const [claimType, setClaimType] = useState<"self" | "friend">("self");
  const [friendUuid, setFriendUuid] = useState("");
  const [giftUsage, setGiftUsage] = useState<"profile" | "room">("profile");
  const [claims, setClaims] = useState<ClaimRecord[]>([]);
  const [showRules, setShowRules] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [customGifts, setCustomGifts] = useState<CustomGift[]>([]);
  const [selectedCustomGift, setSelectedCustomGift] = useState<CustomGift | null>(null);
  const [showCustomVideo, setShowCustomVideo] = useState(false);
  const [showGuestLogin, setShowGuestLogin] = useState(false);

  const chargerLevel = user?.level?.charger_level ?? 0;
  const config = getLevelConfig(chargerLevel);
  const currentMonth = getCurrentMonth();

  // Check if user's charger level changed from last month (stored locally)
  const getLastMonthLevel = useCallback(() => {
    if (!user?.uuid) return chargerLevel;
    const stored = localStorage.getItem(`entry_charger_${user.uuid}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.month === currentMonth) return parsed.lastLevel;
    }
    return null;
  }, [user?.uuid, chargerLevel, currentMonth]);

  // Save current level for next month comparison
  useEffect(() => {
    if (!user?.uuid) return;
    const key = `entry_charger_${user.uuid}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.month !== currentMonth) {
        // New month - save last month's level
        localStorage.setItem(key, JSON.stringify({ month: currentMonth, lastLevel: parsed.currentLevel }));
      } else {
        // Same month - update current
        localStorage.setItem(key, JSON.stringify({ ...parsed, currentLevel: chargerLevel }));
      }
    } else {
      localStorage.setItem(key, JSON.stringify({ month: currentMonth, lastLevel: chargerLevel, currentLevel: chargerLevel }));
    }
  }, [user?.uuid, chargerLevel, currentMonth]);

  const monthClaims = claims.filter((c) => c.claim_month === currentMonth);
  const remainingClaims = config.monthlyLimit - monthClaims.length;

  // Check if level increased from last month (to reset eligibility)
  const lastLevel = getLastMonthLevel();
  const levelIncreased = lastLevel !== null && chargerLevel > lastLevel;

  useEffect(() => {
    fetchGifts();
    fetchCustomGifts();
    if (user?.uuid) fetchClaims();
  }, [user?.uuid]);

  const fetchGifts = async () => {
    try {
      const { data, error } = await supabase
        .from("entry_gifts")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      if (error) throw error;
      setGifts((data || []) as unknown as EntryGift[]);
    } catch (err) {
      console.error("Error fetching entry gifts:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomGifts = async () => {
    try {
      const { data, error } = await supabase
        .from("custom_gifts")
        .select("*")
        .eq("status", "approved") as any;
      if (error) throw error;
      setCustomGifts((data || []) as CustomGift[]);
    } catch (err) {
      console.error("Error fetching custom gifts:", err);
    }
  };

  const fetchClaims = async () => {
    if (!user?.uuid) return;
    try {
      const { data, error } = await supabase
        .from("entry_gift_claims")
        .select("*")
        .eq("user_uuid", user.uuid);
      if (error) throw error;
      setClaims((data || []) as unknown as ClaimRecord[]);
    } catch (err) {
      console.error(err);
    }
  };

  const canClaimGift = (gift: EntryGift) => {
    if (config.monthlyLimit === 0) return false;
    if (gift.star_level > config.maxStars) return false;
    if (remainingClaims <= 0 && !levelIncreased) return false;
    return true;
  };

  const handleOpenVideo = (gift: EntryGift) => {
    setSelectedGift(gift);
    setShowVideo(true);
  };

  const handleClaimStart = (gift: EntryGift) => {
    if (!user) {
      setShowGuestLogin(true);
      return;
    }
    setSelectedGift(gift);
    setClaimType("self");
    setFriendUuid("");
    // Set usage based on gift type
    if (gift.gift_type === "profile") setGiftUsage("profile");
    else if (gift.gift_type === "room") setGiftUsage("room");
    else setGiftUsage("profile");
    setShowClaimDialog(true);
  };

  const handleSubmitClaim = async () => {
    if (!user?.uuid || !selectedGift) return;
    if (claimType === "friend" && !friendUuid.trim()) {
      toast.error("أدخل UUID الصديق");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("entry_gift_claims").insert({
        user_uuid: user.uuid,
        gift_id: selectedGift.id,
        claim_type: claimType,
        friend_uuid: claimType === "friend" ? friendUuid.trim() : null,
        gift_usage: giftUsage,
        claim_month: currentMonth,
        charger_level_at_claim: chargerLevel,
      } as any);
      if (error) throw error;
      toast.success(claimType === "self" ? "تم لبس الدخولية بنجاح!" : "تم إرسال الدخولية لصديقك!");
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

  const isVideoFormat = (url: string) => {
    const lower = url.toLowerCase();
    return lower.endsWith(".mp4") || lower.endsWith(".webm") || lower.endsWith(".mov");
  };

  const isSvga = (url: string) => url.toLowerCase().endsWith(".svga");

  return (
    <MobileLayout showHeader headerTitle="الدخوليات" onBack={() => navigate("/dashboard")}>
      <div className="px-3 py-4 space-y-4">
        {/* User Status Bar */}
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

        {/* Gifts Grid - 3 per row */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : gifts.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Play className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">لا توجد دخوليات حالياً</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 css-fade-up-d1" dir="rtl">
            {gifts.map((gift) => {
              const canClaim = canClaimGift(gift);
              return (
                <div key={gift.id} className="relative group">
                  <button
                    onClick={() => handleOpenVideo(gift)}
                    className="w-full aspect-[9/16] rounded-xl overflow-hidden bg-muted/30 border border-border/20 relative"
                  >
                    {/* Thumbnail or video preview */}
                    {gift.thumbnail_url ? (
                      <img src={gift.thumbnail_url} alt={gift.title} className="w-full h-full object-cover" />
                    ) : isVideoFormat(gift.video_url) ? (
                      <video
                        src={gift.video_url}
                        muted
                        autoPlay
                        loop
                        playsInline
                        className="w-full h-full object-cover"
                      />
                    ) : isSvga(gift.video_url) ? (
                      <SvgaPlayer src={gift.video_url} width={120} height={200} className="w-full h-full" />
                    ) : gift.video_url.toLowerCase().endsWith(".webp") ? (
                      <img src={gift.video_url} alt={gift.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10">
                        <Play className="w-8 h-8 text-primary/50" />
                      </div>
                    )}

                    {/* Overlay info */}
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-2 pt-6">
                      <p className="text-[10px] font-bold text-white line-clamp-1">{gift.title}</p>
                      <div className="flex items-center justify-between mt-0.5">
                        {renderStars(gift.star_level)}
                        <span className="text-[8px] text-white/60">
                          {gift.gift_type === "profile" ? "ملف" : gift.gift_type === "room" ? "روم" : "الكل"}
                        </span>
                      </div>
                    </div>

                    {/* Lock overlay if can't claim */}
                    {!canClaim && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Lock className="w-6 h-6 text-white/60" />
                      </div>
                    )}
                  </button>

                  {/* Claim button */}
                  {canClaim && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleClaimStart(gift); }}
                      className="absolute top-1.5 left-1.5 w-7 h-7 rounded-full bg-primary/90 flex items-center justify-center shadow-lg"
                    >
                      <Send className="w-3 h-3 text-primary-foreground" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Custom Gifts Section */}
        {customGifts.length > 0 && (
          <div className="space-y-3 css-fade-up-d2">
            <div className="flex items-center gap-2 pr-1">
              <div className="w-1 h-3.5 rounded-full bg-gradient-to-b from-pink-400 to-purple-500" />
              <h3 className="text-xs font-black text-foreground">هدايا مخصصة</h3>
              <span className="text-[10px] text-muted-foreground">(للمشاهدة فقط)</span>
            </div>
            <div className="grid grid-cols-3 gap-2" dir="rtl">
              {customGifts.map((cg) => (
                <div key={cg.id} className="relative">
                  <button
                    onClick={() => { setSelectedCustomGift(cg); setShowCustomVideo(true); }}
                    className="w-full aspect-[9/16] rounded-xl overflow-hidden bg-muted/30 border border-border/20 relative"
                  >
                    {cg.thumbnail_url ? (
                      <img src={cg.thumbnail_url} alt={cg.title} className="w-full h-full object-cover" />
                    ) : isVideoFormat(cg.video_url) ? (
                      <video src={cg.video_url} muted autoPlay loop playsInline className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10">
                        <Play className="w-8 h-8 text-primary/50" />
                      </div>
                    )}
                    {/* Owner badge */}
                    <div className="absolute top-1.5 right-1.5 bg-primary/90 rounded-full px-1.5 py-0.5">
                      <span className="text-[7px] font-bold text-primary-foreground">{cg.user_gala_id}</span>
                    </div>
                    {/* Overlay info */}
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-2 pt-6">
                      <p className="text-[10px] font-bold text-white line-clamp-1">{cg.title}</p>
                      <p className="text-[8px] text-white/60">{cg.user_name}</p>
                    </div>
                    {/* View-only overlay */}
                    <div className="absolute top-1.5 left-1.5 bg-black/50 rounded-full px-1.5 py-0.5">
                      <span className="text-[7px] text-white/80">👁 مشاهدة</span>
                    </div>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Video Fullscreen Dialog (TikTok style) */}
      <Dialog open={showVideo} onOpenChange={() => setShowVideo(false)}>
        <DialogContent className="max-w-[95vw] sm:max-w-md w-full h-[90vh] max-h-[800px] p-0 bg-black border-0 rounded-2xl overflow-hidden flex flex-col [&>button]:hidden">
          <VisuallyHidden><DialogTitle>{selectedGift?.title || "دخولية"}</DialogTitle></VisuallyHidden>
          <div className="relative w-full h-full flex flex-col">
            <button onClick={() => setShowVideo(false)} className="absolute top-4 right-4 z-20 w-10 h-10 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white">
              <X className="w-5 h-5" />
            </button>

            {selectedGift && (
              <div className="flex-1 flex items-center justify-center bg-black min-h-0">
                {isVideoFormat(selectedGift.video_url) ? (
                  <video
                    key={selectedGift.id}
                    src={selectedGift.video_url}
                    autoPlay
                    loop
                    muted={false}
                    playsInline
                    className="w-full h-full object-contain"
                  />
                ) : isSvga(selectedGift.video_url) ? (
                  <SvgaPlayer src={selectedGift.video_url} width={300} height={500} className="w-full h-full" />
                ) : selectedGift.video_url.toLowerCase().endsWith(".webp") ? (
                  <img
                    src={selectedGift.video_url}
                    alt={selectedGift.title}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-white text-center p-4">
                    <Play className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>صيغة غير مدعومة</p>
                  </div>
                )}
              </div>
            )}

            {selectedGift && (
              <div className="bg-gradient-to-t from-black/90 to-transparent p-4 pt-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white text-lg font-bold">{selectedGift.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      {renderStars(selectedGift.star_level)}
                      <span className="text-white/60 text-xs">
                        {selectedGift.gift_type === "profile" ? "ملف شخصي" : selectedGift.gift_type === "room" ? "روم" : "ملف + روم"}
                      </span>
                    </div>
                  </div>
                  {canClaimGift(selectedGift) && (
                    <Button
                      onClick={() => { setShowVideo(false); handleClaimStart(selectedGift); }}
                      className="gold-gradient text-primary-foreground font-bold"
                      size="sm"
                    >
                      <Send className="w-4 h-4 ml-1" />
                      احصل عليها
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
          <DialogTitle className="text-center font-bold text-base">
            {selectedGift?.title}
          </DialogTitle>
          <div className="space-y-4 pt-2">
            {/* Claim type */}
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
                  ألبسها أنا
                </button>
                <button
                  onClick={() => setClaimType("friend")}
                  className={`p-3 rounded-xl border text-center text-sm font-bold transition-all ${
                    claimType === "friend" ? "border-primary bg-primary/10 text-primary" : "border-border/30 text-muted-foreground"
                  }`}
                >
                  <Send className="w-5 h-5 mx-auto mb-1" />
                  أرسلها لصديق
                </button>
              </div>
            </div>

            {/* Friend UUID */}
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

            {/* Gift usage - only if gift type is "both" */}
            {selectedGift?.gift_type === "both" && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-muted-foreground">نوع الاستخدام:</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setGiftUsage("profile")}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                      giftUsage === "profile" ? "border-primary bg-primary/10 text-primary" : "border-border/30 text-muted-foreground"
                    }`}
                  >
                    دخولية ملف شخصي
                  </button>
                  <button
                    onClick={() => setGiftUsage("room")}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                      giftUsage === "room" ? "border-primary bg-primary/10 text-primary" : "border-border/30 text-muted-foreground"
                    }`}
                  >
                    دخولية روم
                  </button>
                </div>
              </div>
            )}

            <Button
              onClick={handleSubmitClaim}
              disabled={submitting || (claimType === "friend" && !friendUuid.trim())}
              className="w-full gold-gradient text-primary-foreground font-bold h-11"
            >
              {submitting ? "جاري الإرسال..." : claimType === "self" ? "لبس الدخولية" : "إرسال لصديق"}
            </Button>

            <button onClick={() => setShowClaimDialog(false)} className="w-full text-center text-sm text-muted-foreground py-1">
              إلغاء
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rules Dialog */}
      <Dialog open={showRules} onOpenChange={() => setShowRules(false)}>
        <DialogContent className="max-w-sm rounded-2xl [&>button]:hidden">
          <DialogTitle className="text-center font-bold text-base">شروط الدخوليات</DialogTitle>
          <div className="space-y-3 text-sm" dir="rtl">
            <div className="glass-card p-3 space-y-1.5">
              <p className="font-bold text-xs text-primary flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5" /> مستوى الشحن 30+
              </p>
              <p className="text-xs text-muted-foreground">• دخوليتان شهرياً بمستوى نجمة واحدة ⭐</p>
            </div>
            <div className="glass-card p-3 space-y-1.5">
              <p className="font-bold text-xs text-primary flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5" /> مستوى الشحن 40+
              </p>
              <p className="text-xs text-muted-foreground">• 3 دخوليات شهرياً بمستوى نجمتين ⭐⭐</p>
            </div>
            <div className="glass-card p-3 space-y-1.5">
              <p className="font-bold text-xs text-primary flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5" /> مستوى الشحن 50+
              </p>
              <p className="text-xs text-muted-foreground">• 6 دخوليات شهرياً بمستوى 3 نجمات ⭐⭐⭐</p>
            </div>
            <div className="glass-card p-3 space-y-1.5">
              <p className="font-bold text-xs text-accent">ملاحظات:</p>
              <p className="text-xs text-muted-foreground">• يمكنك لبس الدخولية أو إرسالها لصديق</p>
              <p className="text-xs text-muted-foreground">• تتجدد الصلاحيات عند زيادة مستوى الشحن عن الشهر السابق</p>
              <p className="text-xs text-muted-foreground">• الدخوليات تنقسم إلى: ملف شخصي، روم، أو كلاهما</p>
            </div>
            <Button onClick={() => setShowRules(false)} variant="outline" className="w-full">فهمت</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Custom Gift Video Dialog */}
      <Dialog open={showCustomVideo} onOpenChange={() => setShowCustomVideo(false)}>
        <DialogContent className="max-w-[95vw] sm:max-w-md w-full h-[90vh] max-h-[800px] p-0 bg-black border-0 rounded-2xl overflow-hidden flex flex-col [&>button]:hidden">
          <VisuallyHidden><DialogTitle>{selectedCustomGift?.title || "هدية مخصصة"}</DialogTitle></VisuallyHidden>
          <div className="relative w-full h-full flex flex-col">
            <button onClick={() => setShowCustomVideo(false)} className="absolute top-4 right-4 z-20 w-10 h-10 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white">
              <X className="w-5 h-5" />
            </button>

            {selectedCustomGift && (
              <div className="flex-1 flex items-center justify-center bg-black min-h-0">
                {isVideoFormat(selectedCustomGift.video_url) ? (
                  <video
                    key={selectedCustomGift.id}
                    src={selectedCustomGift.video_url}
                    autoPlay
                    loop
                    muted={false}
                    playsInline
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-white text-center p-4">
                    <Play className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>صيغة غير مدعومة</p>
                  </div>
                )}
              </div>
            )}

            {selectedCustomGift && (
              <div className="bg-gradient-to-t from-black/90 to-transparent p-4 pt-8">
                <h3 className="text-white text-lg font-bold">{selectedCustomGift.title}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="bg-primary/90 rounded-full px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                    {selectedCustomGift.user_gala_id}
                  </span>
                  <span className="text-white/60 text-xs">{selectedCustomGift.user_name}</span>
                </div>
                <p className="text-white/40 text-[10px] mt-1">هدية مخصصة - للمشاهدة فقط</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <GuestLoginPrompt open={showGuestLogin} onClose={() => setShowGuestLogin(false)} />
    </MobileLayout>
  );
};

export default EntryRequest;
