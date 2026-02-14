import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Play, X, Star, Send, User as UserIcon, Lock } from "lucide-react";
import PulsingHelpIcon from "@/components/PulsingHelpIcon";
import TikTokInteraction from "@/components/TikTokInteraction";
import MobileLayout from "@/components/MobileLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useStarBalance } from "@/hooks/use-star-balance";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { toast } from "sonner";
import SvgaPlayer from "@/components/SvgaPlayer";
import GuestLoginPrompt from "@/components/GuestLoginPrompt";
import StarSystemTutorial from "@/components/StarSystemTutorial";
import ServicePreviousRequests from "@/components/ServicePreviousRequests";

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
  const [customGifts, setCustomGifts] = useState<CustomGift[]>([]);
  const [selectedCustomGift, setSelectedCustomGift] = useState<CustomGift | null>(null);
  const [showCustomVideo, setShowCustomVideo] = useState(false);
  const [showGuestLogin, setShowGuestLogin] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  const chargerLevel = user?.level?.charger_level ?? 0;
  const { starBalance, fetchStarBalance, currentMonth, monthlyStars } = 
    useStarBalance(user?.uuid, chargerLevel);
  const totalStars = starBalance?.total_stars ?? 0;

  useEffect(() => {
    fetchGifts();
    fetchCustomGifts();
    if (user?.uuid) {
      fetchStarBalance();
    }
  }, [user?.uuid, fetchStarBalance]);

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

  const canClaimGift = (gift: EntryGift) => {
    if (!starBalance) return false;
    return totalStars >= gift.star_level;
  };

  const [submitting, setSubmitting] = useState(false);

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
     if (!user?.uuid || !selectedGift || !starBalance) return;
     if (claimType === "friend" && !friendUuid.trim()) {
       toast.error("أدخل UUID الصديق");
       return;
     }
     setSubmitting(true);
     try {
       // Insert claim record locally
       const { error: claimError } = await supabase.from("entry_gift_claims").insert({
         user_uuid: user.uuid,
         gift_id: selectedGift.id,
         claim_type: claimType,
         friend_uuid: claimType === "friend" ? friendUuid.trim() : null,
         gift_usage: giftUsage,
         claim_month: currentMonth,
         charger_level_at_claim: chargerLevel,
       } as any);
       if (claimError) throw claimError;

       // Deduct stars from balance
       const newTotal = totalStars - selectedGift.star_level;
       const carryover = Math.max(0, newTotal);
       
       const { error: updateError } = await supabase
         .from("user_star_balance")
         .update({
           total_stars: newTotal,
           carryover_stars: carryover,
         })
         .eq("id", starBalance.id);
       if (updateError) throw updateError;

       // Send request to admin API
       const { error: apiError } = await supabase.functions.invoke("gala-actions?action=submit-request", {
         body: {
           user_uuid: user.uuid,
           user_name: user.name,
           request_type: "entry_effect",
           details: { 
             ware_id: selectedGift.id, 
             description: selectedGift.title,
             claim_type: claimType,
             friend_uuid: claimType === "friend" ? friendUuid.trim() : undefined
           },
         },
       });
       if (apiError) throw apiError;

       toast.success(claimType === "self" ? "تم لبس الدخولية بنجاح!" : "تم إرسال الدخولية لصديقك!");
       setShowClaimDialog(false);
       fetchStarBalance();
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
        {/* طلباتي السابقة */}
        {user?.uuid && <ServicePreviousRequests userUuid={user.uuid} serviceType="entry_gift" />}

        {/* Title Section */}
        <div className="text-center css-fade-up space-y-1">
          <h2 className="text-lg font-black gradient-text">غلا شات</h2>
          <p className="text-[11px] text-muted-foreground">لا تخليها بخاطرك .. البسها 🎁</p>
        </div>

        {/* Star Wallet */}
        <div className="glass-card p-3 css-fade-up overflow-hidden relative" dir="rtl">
          <div className="absolute top-0 left-0 w-20 h-20 bg-accent/10 rounded-full blur-[40px] -translate-x-1/2 -translate-y-1/2" />
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-accent/15 flex items-center justify-center">
                <Star className="w-4 h-4 text-accent fill-accent" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">محفظة النجوم</p>
                <p className="text-base font-black text-accent leading-none">{totalStars} <span className="text-[10px] font-normal text-muted-foreground">⭐</span></p>
              </div>
            </div>
            <button onClick={() => setShowTutorial(true)} className="p-1.5 rounded-full bg-destructive/10 shadow-[0_0_8px_hsl(var(--destructive)/0.4)]">
              <PulsingHelpIcon size={16} />
            </button>
          </div>
          <div className="flex items-center gap-3 text-[10px] border-t border-border/20 pt-2">
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">لفل الشحن:</span>
              <span className="font-bold text-primary">{chargerLevel}</span>
            </div>
            <div className="w-px h-3 bg-border/30" />
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">الشهرية:</span>
              <span className="font-bold text-foreground">{monthlyStars}</span>
              {renderStars(Math.min(3, monthlyStars))}
            </div>
            <div className="w-px h-3 bg-border/30" />
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">مُرحّلة:</span>
              <span className="font-bold text-foreground">{starBalance?.carryover_stars ?? 0}</span>
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
        <DialogContent className="max-w-[95vw] sm:max-w-md w-full h-[90vh] max-h-[800px] p-0 bg-black border-0 rounded-2xl overflow-hidden [&>button]:hidden">
          <VisuallyHidden><DialogTitle>{selectedGift?.title || "دخولية"}</DialogTitle></VisuallyHidden>
          <div className="relative w-full h-full">
            <button onClick={() => setShowVideo(false)} className="absolute top-4 right-4 z-20 w-10 h-10 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white">
              <X className="w-5 h-5" />
            </button>

            {selectedGift && (
              <div className="absolute inset-0 flex items-center justify-center bg-black">
                {isVideoFormat(selectedGift.video_url) ? (
                  <video key={selectedGift.id} src={selectedGift.video_url} autoPlay loop muted={false} playsInline className="w-full h-full object-contain" />
                ) : isSvga(selectedGift.video_url) ? (
                  <SvgaPlayer src={selectedGift.video_url} width={300} height={500} className="w-full h-full" />
                ) : selectedGift.video_url.toLowerCase().endsWith(".webp") ? (
                  <img src={selectedGift.video_url} alt={selectedGift.title} className="w-full h-full object-contain" />
                ) : (
                  <div className="text-white text-center p-4">
                    <Play className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>صيغة غير مدعومة</p>
                  </div>
                )}
              </div>
            )}

            {/* Bottom info overlay */}
            {selectedGift && (
              <div className="absolute bottom-0 left-0 right-14 z-20 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pt-12">
                <h3 className="text-white text-base font-bold">{selectedGift.title}</h3>
                <div className="flex items-center gap-2 mt-1">
                  {renderStars(selectedGift.star_level)}
                  <span className="text-white/60 text-xs">
                    {selectedGift.gift_type === "profile" ? "ملف شخصي" : selectedGift.gift_type === "room" ? "روم" : "ملف + روم"}
                  </span>
                </div>
                {canClaimGift(selectedGift) && (
                  <Button
                    onClick={() => { setShowVideo(false); handleClaimStart(selectedGift); }}
                    className="gold-gradient text-primary-foreground font-bold mt-3"
                    size="sm"
                  >
                    <Send className="w-4 h-4 ml-1" />
                    احصل عليها
                  </Button>
                )}
              </div>
            )}

            {/* TikTok-style interaction */}
            {selectedGift && (
              <TikTokInteraction itemType="entry_gift" itemId={selectedGift.id} />
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

            <div className="bg-accent/10 rounded-xl p-3 text-xs text-muted-foreground">
              <p className="font-bold text-accent mb-1">التكلفة: {selectedGift?.star_level} نجوم</p>
              <p>النجوم المتبقية: {totalStars - (selectedGift?.star_level ?? 0)}</p>
            </div>

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

      {/* Tutorial Dialog */}
      <StarSystemTutorial open={showTutorial} onClose={() => setShowTutorial(false)} itemType="entry" />

      {/* Custom Gift Video Dialog */}
      <Dialog open={showCustomVideo} onOpenChange={() => setShowCustomVideo(false)}>
        <DialogContent className="max-w-[95vw] sm:max-w-md w-full h-[90vh] max-h-[800px] p-0 bg-black border-0 rounded-2xl overflow-hidden [&>button]:hidden">
          <VisuallyHidden><DialogTitle>{selectedCustomGift?.title || "هدية مخصصة"}</DialogTitle></VisuallyHidden>
          <div className="relative w-full h-full">
            <button onClick={() => setShowCustomVideo(false)} className="absolute top-4 right-4 z-20 w-10 h-10 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white">
              <X className="w-5 h-5" />
            </button>

            {selectedCustomGift && (
              <div className="absolute inset-0 flex items-center justify-center bg-black">
                {isVideoFormat(selectedCustomGift.video_url) ? (
                  <video key={selectedCustomGift.id} src={selectedCustomGift.video_url} autoPlay loop muted={false} playsInline className="w-full h-full object-contain" />
                ) : (
                  <div className="text-white text-center p-4">
                    <Play className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>صيغة غير مدعومة</p>
                  </div>
                )}
              </div>
            )}

            {/* Bottom info */}
            {selectedCustomGift && (
              <div className="absolute bottom-0 left-0 right-14 z-20 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pt-12">
                <h3 className="text-white text-base font-bold">{selectedCustomGift.title}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="bg-primary/90 rounded-full px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                    {selectedCustomGift.user_gala_id}
                  </span>
                  <span className="text-white/60 text-xs">{selectedCustomGift.user_name}</span>
                </div>
                <p className="text-white/40 text-[10px] mt-1">هدية مخصصة - للمشاهدة فقط</p>
              </div>
            )}

            {/* TikTok-style interaction */}
            {selectedCustomGift && (
              <TikTokInteraction itemType="custom_gift" itemId={selectedCustomGift.id} />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <GuestLoginPrompt open={showGuestLogin} onClose={() => setShowGuestLogin(false)} />
    </MobileLayout>
  );
};

export default EntryRequest;
