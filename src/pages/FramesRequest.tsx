import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X, Star, Send, User as UserIcon, Lock, Frame } from "lucide-react";
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

interface FrameItem {
  id: string;
  title: string;
  file_url: string;
  thumbnail_url: string | null;
  star_level: number;
  is_active: boolean;
  display_order: number;
}

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
  const [showRules, setShowRules] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showGuestLogin, setShowGuestLogin] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  const chargerLevel = user?.level?.charger_level ?? 0;
  const { starBalance, fetchStarBalance, currentMonth, monthlyStars } = 
    useStarBalance(user?.uuid, chargerLevel);
  const totalStars = starBalance?.total_stars ?? 0;

  useEffect(() => {
    fetchFrames();
    if (user?.uuid) {
      fetchStarBalance();
    }
  }, [user?.uuid, fetchStarBalance]);

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


  const canClaimFrame = (frame: FrameItem) => {
    if (!starBalance) return false;
    return totalStars >= frame.star_level;
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
    if (!user?.uuid || !selectedFrame || !starBalance) return;
    if (claimType === "friend" && !friendUuid.trim()) {
      toast.error("أدخل UUID الصديق");
      return;
    }
    setSubmitting(true);
    try {
      // Insert claim record
      const { error: claimError } = await supabase.from("frame_claims").insert({
        user_uuid: user.uuid,
        frame_id: selectedFrame.id,
        claim_type: claimType,
        friend_uuid: claimType === "friend" ? friendUuid.trim() : null,
        claim_month: currentMonth,
        charger_level_at_claim: chargerLevel,
      } as any);
      if (claimError) throw claimError;

      // Deduct stars from balance
      const newTotal = totalStars - selectedFrame.star_level;
      const carryover = Math.max(0, newTotal);
      
      const { error: updateError } = await supabase
        .from("user_star_balance")
        .update({
          total_stars: newTotal,
          carryover_stars: carryover,
        })
        .eq("id", starBalance.id);
      if (updateError) throw updateError;

      // Send request to wares-api.php via wares-request edge function
      const ext = selectedFrame.file_url.split(".").pop()?.toLowerCase() || "mp4";
      const imageType = ext === "svga" ? "svga" : (ext === "webp" || ext === "png") ? "alpha" : "mp4";
      const targetUuid = claimType === "friend" ? friendUuid.trim() : user.uuid;
      
      const { error: apiError } = await supabase.functions.invoke("wares-request", {
        body: {
          action: "submit-request",
          uuid: targetUuid,
          user_name: user.name,
          ware_type: "frame",
          image_type: imageType,
          file_url: selectedFrame.file_url,
          days: 30,
        },
      });
      if (apiError) throw apiError;

      // Send to gala-actions with file URL
      try {
        await supabase.functions.invoke("gala-actions?action=submit-request", {
          body: {
            user_uuid: user.uuid,
            user_name: user.name,
            request_type: "frame",
            details: { file_url: selectedFrame.file_url, title: selectedFrame.title, claim_type: claimType, friend_uuid: claimType === "friend" ? friendUuid.trim() : null },
            evidence_url: selectedFrame.file_url,
            image_url: selectedFrame.thumbnail_url || selectedFrame.file_url,
          },
        });
      } catch { /* silent */ }

      toast.success(claimType === "self" ? "تم لبس الإطار بنجاح!" : "تم إرسال الإطار لصديقك!");
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
        {/* طلباتي السابقة */}
        {user?.uuid && <ServicePreviousRequests userUuid={user.uuid} serviceType="frame" />}

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
        <DialogContent className="max-w-sm w-full h-[75vh] max-h-[650px] p-0 bg-black border-0 rounded-2xl overflow-hidden [&>button]:hidden">
          <VisuallyHidden><DialogTitle>{selectedFrame?.title || "إطار"}</DialogTitle></VisuallyHidden>
          <div className="relative w-full h-full flex flex-col">
            <button onClick={() => setShowPreview(false)} className="absolute top-3 right-3 z-30 w-10 h-10 bg-black/70 rounded-full flex items-center justify-center text-white active:scale-90">
              <X className="w-5 h-5" />
            </button>

            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-muted/5 to-muted/20 p-6">
              {selectedFrame && renderFramePreview(selectedFrame, "lg")}
            </div>

            {/* Bottom info */}
            {selectedFrame && (
              <div className="absolute bottom-0 left-0 right-14 z-20 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pt-12">
                <h3 className="text-white font-bold">{selectedFrame.title}</h3>
                <div className="flex items-center gap-2 mt-1">
                  {renderStars(selectedFrame.star_level)}
                  <span className="text-white/60 text-xs">ملف شخصي فقط</span>
                </div>
                {canClaimFrame(selectedFrame) && (
                  <Button onClick={() => { setShowPreview(false); handleClaimStart(selectedFrame); }} className="gold-gradient text-primary-foreground font-bold mt-3" size="sm">
                    <Send className="w-4 h-4 ml-1" />
                    احصل عليه
                  </Button>
                )}
              </div>
            )}

            {/* TikTok-style interaction */}
            {selectedFrame && (
              <TikTokInteraction itemType="frame" itemId={selectedFrame.id} />
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

            <div className="bg-accent/10 rounded-xl p-3 text-xs text-muted-foreground">
              <p className="font-bold text-accent mb-1">التكلفة: {selectedFrame?.star_level} نجوم</p>
              <p>النجوم المتبقية: {totalStars - (selectedFrame?.star_level ?? 0)}</p>
            </div>

            <Button onClick={handleSubmitClaim} disabled={submitting} className="w-full gold-gradient text-primary-foreground font-bold h-11">
              {submitting ? "جاري الإرسال..." : claimType === "self" ? "تأكيد اللبس" : "إرسال للصديق"}
            </Button>
            <button onClick={() => setShowClaimDialog(false)} className="w-full text-center text-sm text-muted-foreground py-1">إلغاء</button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Tutorial Dialog */}
      <StarSystemTutorial open={showTutorial} onClose={() => setShowTutorial(false)} itemType="frames" />

      <GuestLoginPrompt open={showGuestLogin} onClose={() => setShowGuestLogin(false)} />
    </MobileLayout>
  );
};

export default FramesRequest;
