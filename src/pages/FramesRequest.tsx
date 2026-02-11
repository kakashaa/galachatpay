import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X, Star, Send, User as UserIcon, HelpCircle, Lock, Frame } from "lucide-react";
import TikTokInteraction from "@/components/TikTokInteraction";
import MobileLayout from "@/components/MobileLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { toast } from "sonner";
import SvgaPlayer from "@/components/SvgaPlayer";
import GuestLoginPrompt from "@/components/GuestLoginPrompt";
import StarSystemTutorial from "@/components/StarSystemTutorial";

interface FrameItem {
  id: string;
  title: string;
  file_url: string;
  thumbnail_url: string | null;
  star_level: number;
  is_active: boolean;
  display_order: number;
}

interface UserStarBalance {
  id: string;
  user_uuid: string;
  current_month: string;
  monthly_stars: number;
  carryover_stars: number;
  total_stars: number;
  last_level: number;
}

// Get monthly stars based on level
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
  const [starBalance, setStarBalance] = useState<UserStarBalance | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);

  const chargerLevel = user?.level?.charger_level ?? 0;
  const currentMonth = getCurrentMonth();
  const monthlyStars = getMonthlyStars(chargerLevel);
  const totalStars = starBalance?.total_stars ?? 0;

  useEffect(() => {
    fetchFrames();
    if (user?.uuid) {
      fetchStarBalance();
    }
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
        // Create new balance for this month
        const lastLevel = localStorage.getItem(`frame_last_level_${user.uuid}`)
          ? parseInt(localStorage.getItem(`frame_last_level_${user.uuid}`)!)
          : chargerLevel;
        
        const levelDiff = chargerLevel - lastLevel;
        const levelBonus = levelDiff >= 5 ? Math.floor(levelDiff / 5) : 0;
        const carryover = starBalance?.carryover_stars ?? 0;
        const newTotal = monthlyStars + levelBonus + carryover;
        
        const { error: insertError } = await supabase
          .from("user_star_balance")
          .insert({
            user_uuid: user.uuid,
            current_month: currentMonth,
            monthly_stars: monthlyStars,
            carryover_stars: carryover,
            total_stars: newTotal,
            last_level: chargerLevel,
          });
        if (insertError) throw insertError;
        
        localStorage.setItem(`frame_last_level_${user.uuid}`, chargerLevel.toString());
        
        setStarBalance({
          id: "",
          user_uuid: user.uuid,
          current_month: currentMonth,
          monthly_stars: monthlyStars,
          carryover_stars: carryover,
          total_stars: newTotal,
          last_level: chargerLevel,
        });
      } else {
        setStarBalance(data as UserStarBalance);
      }
    } catch (err) {
      console.error("Error fetching star balance:", err);
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
        {/* Status Bar */}
        <div className="glass-card p-3 css-fade-up">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={() => setShowTutorial(true)} className="p-1.5 rounded-full bg-primary/10 animate-bounce-slow shadow-[0_0_8px_hsl(var(--primary)/0.4)]">
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
                <span className="text-muted-foreground">النجوم:</span>
                <span className="font-bold text-accent">{totalStars}/{monthlyStars}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">الشهرية:</span>
                {renderStars(Math.min(3, monthlyStars))}
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
        <DialogContent className="max-w-sm w-full h-[80vh] max-h-[700px] p-0 bg-black border-0 rounded-2xl overflow-hidden [&>button]:hidden">
          <VisuallyHidden><DialogTitle>{selectedFrame?.title || "إطار"}</DialogTitle></VisuallyHidden>
          <div className="relative w-full h-full">
            <button onClick={() => setShowPreview(false)} className="absolute top-3 right-3 z-20 w-8 h-8 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white">
              <X className="w-4 h-4" />
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
