import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, Sparkles, CheckCircle, AlertTriangle, User, Clock, Image as ImageIcon } from "lucide-react";
import PulsingHelpIcon from "@/components/PulsingHelpIcon";
import MobileLayout from "@/components/MobileLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import ServicePreviousRequests from "@/components/ServicePreviousRequests";

// Duration limits per charger level
const getDurationLimit = (level: number): number => {
  if (level >= 80) return 20;
  if (level >= 70) return 18;
  if (level >= 60) return 15;
  if (level >= 50) return 13;
  if (level >= 40) return 11;
  return 0;
};

// Get the level tier for tracking one-upload-per-tier
const getLevelTier = (level: number): number => {
  if (level >= 80) return 80;
  if (level >= 70) return 70;
  if (level >= 60) return 60;
  if (level >= 50) return 50;
  if (level >= 40) return 40;
  return 0;
};

// Next tier needed to upload again
const getNextTier = (currentTier: number): number | null => {
  const tiers = [40, 50, 60, 70, 80];
  const idx = tiers.indexOf(currentTier);
  if (idx === -1 || idx >= tiers.length - 1) return null;
  return tiers[idx + 1];
};

const CustomGiftUpload: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const chargerLevel = user?.level?.charger_level ?? 0;
  const maxDuration = getDurationLimit(chargerLevel);
  const currentTier = getLevelTier(chargerLevel);
  const canUpload = chargerLevel >= 40;

  const [title, setTitle] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [hasExistingGift, setHasExistingGift] = useState(false);
  const [checkingExisting, setCheckingExisting] = useState(true);

  // Check if user already uploaded at this tier
  useEffect(() => {
    if (!user?.uuid) return;
    const check = async () => {
      setCheckingExisting(true);
      try {
        const { data } = await supabase
          .from("custom_gifts")
          .select("id, charger_level_at_upload")
          .eq("user_uuid", user.uuid) as any;
        if (data && data.length > 0) {
          // Check if any upload was at current tier or higher
          const uploadedTiers = data.map((g: any) => getLevelTier(g.charger_level_at_upload));
          if (uploadedTiers.includes(currentTier)) {
            setHasExistingGift(true);
          }
        }
      } catch { /* silent */ }
      finally { setCheckingExisting(false); }
    };
    check();
  }, [user?.uuid, currentTier]);

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setThumbnailFile(file);
    setThumbnailPreview(URL.createObjectURL(file));
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) {
      toast.error("حجم الفيديو يجب أن لا يتجاوز 100MB");
      return;
    }
    setVideoFile(file);
    setVideoDuration(0);
    // Get video duration
    const video = document.createElement("video");
    video.preload = "metadata";
    const objectUrl = URL.createObjectURL(file);
    video.onloadedmetadata = () => {
      const dur = Math.round(video.duration);
      setVideoDuration(dur > 0 ? dur : 1);
      URL.revokeObjectURL(objectUrl);
    };
    video.onerror = () => {
      // If metadata can't be read (non-standard format), allow upload with fallback duration
      setVideoDuration(1);
      URL.revokeObjectURL(objectUrl);
    };
    // Timeout fallback - if metadata doesn't load within 5 seconds, allow upload
    setTimeout(() => {
      setVideoDuration((prev) => (prev === 0 ? 1 : prev));
      URL.revokeObjectURL(objectUrl);
    }, 5000);
    video.src = objectUrl;
  };

  const handleSubmit = async () => {
    if (!user?.uuid || !videoFile) return;
    if (!title.trim()) { toast.error("أدخل اسم الهدية"); return; }
    if (videoDuration > maxDuration) {
      toast.error(`مدة الفيديو ${videoDuration} ثانية تتجاوز الحد المسموح ${maxDuration} ثانية`);
      return;
    }
    if (videoDuration === 0) {
      toast.error("انتظر حتى يتم تحميل معلومات الفيديو");
      return;
    }

    setUploading(true);
    try {
      // Upload video via secure proxy
      const { secureUpload } = await import("@/utils/secureUpload");
      const ext = videoFile.name.split(".").pop();
      const videoPath = `custom-gifts/${user.uuid}_${Date.now()}.${ext}`;
      const videoUrl = await secureUpload({
        file: videoFile,
        bucket: "videos",
        path: videoPath,
        userUuid: user.uuid,
      });

      // Upload thumbnail if provided
      let thumbnailUrl: string | null = null;
      if (thumbnailFile) {
        const thumbExt = thumbnailFile.name.split(".").pop();
        const thumbPath = `custom-gifts/thumb_${user.uuid}_${Date.now()}.${thumbExt}`;
        thumbnailUrl = await secureUpload({
          file: thumbnailFile,
          bucket: "attachments",
          path: thumbPath,
          userUuid: user.uuid,
        });
      }

      // Insert record
      const { error: insertErr } = await supabase.from("custom_gifts").insert({
        user_uuid: user.uuid,
        user_name: user.name,
        user_gala_id: String(user.id),
        title: title.trim(),
        thumbnail_url: thumbnailUrl,
        video_url: videoUrl,
        video_duration: videoDuration,
        charger_level_at_upload: chargerLevel,
        max_duration_allowed: maxDuration,
        status: "pending",
      } as any);
      if (insertErr) throw insertErr;

      // Send to external server via gala-actions with file URL
      try {
        await supabase.functions.invoke("gala-actions?action=submit-request", {
          body: {
            user_uuid: user.uuid,
            user_name: user.name,
            request_type: "custom_gift",
            details: {
              file_url: videoUrl,
              title: title.trim(),
              video_duration: videoDuration,
              thumbnail_url: thumbnailUrl,
              phone_number: phoneNumber.trim() || null,
              charger_level: chargerLevel,
            },
            evidence_url: videoUrl,
          },
        });
      } catch { /* silent - not critical */ }

      // Send telegram notification directly with thumbnail + video
      try {
        await supabase.functions.invoke("telegram-notify", {
          body: {
            type: "custom_gift",
            record: {
              user_name: user.name,
              title: title.trim(),
              video_url: videoUrl,
              thumbnail_url: thumbnailUrl,
              phone_number: phoneNumber.trim() || null,
              status: "pending",
            },
          },
        });
      } catch { /* silent - trigger is backup */ }

      setSubmitted(true);
    } catch (err: any) {
      toast.error(err?.message || "فشل الرفع");
    } finally {
      setUploading(false);
    }
  };

  // Success screen
  if (submitted) {
    return (
      <MobileLayout showHeader headerTitle="هدية مخصصة" onBack={() => navigate("/dashboard")}>
        <div className="flex flex-col items-center justify-center px-6 py-20">
          <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mb-6 css-scale-up">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-lg font-bold text-foreground mb-2 css-fade-up">تم رفع هديتك المخصصة!</h2>
          <p className="text-sm text-muted-foreground text-center css-fade-up-d1">
            سيتم مراجعتها من قبل الإدارة وعرضها بعد الموافقة
          </p>
          <Button onClick={() => navigate("/dashboard")} className="mt-8 gold-gradient text-primary-foreground font-bold css-fade-up-d3">
            العودة للرئيسية
          </Button>
        </div>
      </MobileLayout>
    );
  }

  // Instructions for low-level users
  if (!canUpload) {
    return (
      <MobileLayout showHeader headerTitle="هدية مخصصة" onBack={() => navigate("/dashboard")}>
        <div className="px-5 py-6 space-y-5">
          <div className="glass-card p-5 text-center space-y-4 css-fade-up">
            <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8 text-yellow-500" />
            </div>
            <h2 className="text-lg font-bold text-foreground">الهدية المخصصة غير متاحة</h2>
            <p className="text-sm text-muted-foreground">
              لفل حسابك الحالي: <span className="font-bold text-primary">{chargerLevel}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              يجب أن يكون لفل الشحن <span className="font-bold text-primary">40</span> على الأقل
            </p>
          </div>

          {/* Requirements */}
          <div className="glass-card p-4 space-y-3 css-fade-up-d1">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <PulsingHelpIcon size={16} />
              المطلوبات
            </h3>
            <ul className="space-y-2 text-xs text-muted-foreground" dir="rtl">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                لفل شحن 40 على الأقل للبدء
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                صورة للهدية (الصورة المصغرة)
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                فيديو الهدية بصيغة MP4
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                مدة الفيديو حسب اللفل:
              </li>
            </ul>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { lvl: "40", dur: "11 ثانية" },
                { lvl: "50", dur: "13 ثانية" },
                { lvl: "60", dur: "15 ثانية" },
                { lvl: "70", dur: "18 ثانية" },
                { lvl: "80-100", dur: "20 ثانية" },
              ].map((item) => (
                <div key={item.lvl} className="flex justify-between bg-muted/30 rounded-lg p-2">
                  <span className="text-muted-foreground">لفل {item.lvl}</span>
                  <span className="font-bold text-foreground">{item.dur}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Info note */}
          <div className="glass-card p-4 space-y-2 css-fade-up-d2">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              ملاحظات مهمة
            </h3>
            <ul className="space-y-1.5 text-xs text-muted-foreground" dir="rtl">
              <li>• الهدية المخصصة تعرض فقط ولا يمكن إرسالها أو إهداؤها</li>
              <li>• تظهر باسمك وآيدي حسابك</li>
              <li>• يمكنك رفع هدية واحدة لكل مستوى</li>
              <li>• عند وصولك للفل التالي يمكنك رفع هدية جديدة</li>
            </ul>
          </div>
        </div>
      </MobileLayout>
    );
  }

  // Already uploaded at this tier
  if (!checkingExisting && hasExistingGift) {
    const nextTier = getNextTier(currentTier);
    return (
      <MobileLayout showHeader headerTitle="هدية مخصصة" onBack={() => navigate("/dashboard")}>
        <div className="px-5 py-6 space-y-5">
          <div className="glass-card p-5 text-center space-y-4 css-fade-up">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-lg font-bold text-foreground">لقد رفعت هدية مخصصة بالفعل</h2>
            <p className="text-sm text-muted-foreground">
              لقد استخدمت هديتك المخصصة في لفل {currentTier}
            </p>
            {nextTier && (
              <p className="text-sm text-muted-foreground">
                يمكنك رفع هدية جديدة عند وصولك للفل <span className="font-bold text-primary">{nextTier}</span>
              </p>
            )}
            {!nextTier && currentTier >= 80 && (
              <p className="text-sm text-muted-foreground">
                لقد وصلت للحد الأقصى من الهدايا المخصصة
              </p>
            )}
          </div>
          <Button onClick={() => navigate("/dashboard")} className="w-full gold-gradient text-primary-foreground font-bold">
            العودة للرئيسية
          </Button>
        </div>
      </MobileLayout>
    );
  }

  // Upload form
  return (
    <MobileLayout showHeader headerTitle="هدية مخصصة" onBack={() => navigate("/dashboard")}>
      <div className="px-5 py-4 space-y-4">
        {/* طلباتي السابقة */}
        {user?.uuid && <ServicePreviousRequests userUuid={user.uuid} serviceType="custom_gift" />}

        {/* Info bar */}
        <div className="glass-card p-3 css-fade-up">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={() => setShowInfo(true)} className="p-1.5 rounded-full bg-destructive/10 shadow-[0_0_8px_hsl(var(--destructive)/0.4)]">
                <PulsingHelpIcon size={16} />
              </button>
              <span className="text-[10px] text-muted-foreground">معلومات</span>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">لفل:</span>
                <span className="font-bold text-primary">{chargerLevel}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-muted-foreground" />
                <span className="font-bold text-accent">{maxDuration}ث</span>
              </div>
            </div>
          </div>
        </div>

        {/* Name field */}
        <div className="glass-card p-4 space-y-3 css-fade-up-d1">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            اسم الهدية
          </h3>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 50))}
            placeholder="أدخل اسم هديتك المخصصة"
            className="bg-muted/30 border-border/30"
            dir="rtl"
          />
          <p className="text-[10px] text-muted-foreground text-left">{title.length}/50</p>
        </div>

        {/* Phone number */}
        <div className="glass-card p-4 space-y-3 css-fade-up-d1">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            رقم الهاتف
          </h3>
          <Input
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9+]/g, "").slice(0, 20))}
            placeholder="أدخل رقم هاتفك للتواصل"
            className="bg-muted/30 border-border/30"
            dir="ltr"
            type="tel"
          />
        </div>

        {/* Thumbnail */}
        <div className="glass-card p-4 space-y-3 css-fade-up-d2">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-primary" />
            صورة الهدية (اختياري)
          </h3>
          <input
            type="file"
            accept="image/*"
            onChange={handleThumbnailChange}
            className="w-full text-sm file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 bg-muted/20 border border-border/30 rounded-lg p-1"
          />
          {thumbnailPreview && (
            <img src={thumbnailPreview} alt="preview" className="w-20 h-20 rounded-lg object-cover" />
          )}
        </div>

        {/* Video upload */}
        <div className="glass-card p-4 space-y-3 css-fade-up-d3">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Upload className="w-4 h-4 text-primary" />
            فيديو الهدية *
          </h3>
          <p className="text-[10px] text-muted-foreground">
            الحد الأقصى للمدة: <span className="font-bold text-primary">{maxDuration} ثانية</span> | الحجم: 100MB
          </p>
          <input
            type="file"
            accept="video/mp4,video/webm"
            onChange={handleVideoChange}
            className="w-full text-sm file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 bg-muted/20 border border-border/30 rounded-lg p-1"
          />
          {videoFile && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">{videoFile.name}</span>
              <span className="text-muted-foreground">({(videoFile.size / 1024 / 1024).toFixed(1)}MB)</span>
              {videoDuration > 0 && (
                <span className={`font-bold ${videoDuration > maxDuration ? "text-destructive" : "text-green-500"}`}>
                  {videoDuration}ث
                  {videoDuration > maxDuration && " ⚠️ يتجاوز الحد"}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Submit */}
        <Button
          onClick={handleSubmit}
          disabled={uploading || !videoFile || !title.trim() || videoDuration > maxDuration}
          className="w-full gold-gradient text-primary-foreground font-bold h-12 text-base disabled:opacity-40 css-fade-up-d4"
        >
          {uploading ? (
            <>
              <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin ml-2" />
              جاري الرفع...
            </>
          ) : (
            <>
              <Upload className="w-5 h-5 ml-2" />
              رفع الهدية المخصصة
            </>
          )}
        </Button>
      </div>

      {/* Info Dialog */}
      <Dialog open={showInfo} onOpenChange={setShowInfo}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogTitle className="text-center font-bold">معلومات الهدية المخصصة</DialogTitle>
          <div className="space-y-3 text-xs text-muted-foreground" dir="rtl">
            <p>• الهدية المخصصة تظهر مع الدخوليات لكن <span className="font-bold text-foreground">للمشاهدة فقط</span></p>
            <p>• تظهر باسمك وآيدي حسابك</p>
            <p>• لا يمكن لأحد إرسالها أو إهداؤها</p>
            <p>• يمكنك رفع هدية واحدة لكل مستوى</p>
            <div className="border-t border-border/30 pt-3 mt-3">
              <p className="font-bold text-foreground mb-2">المدة حسب اللفل:</p>
              <div className="space-y-1.5">
                {[
                  { lvl: "40", dur: "11 ثانية" },
                  { lvl: "50", dur: "13 ثانية" },
                  { lvl: "60", dur: "15 ثانية" },
                  { lvl: "70", dur: "18 ثانية" },
                  { lvl: "80-100", dur: "20 ثانية" },
                ].map((item) => (
                  <div key={item.lvl} className="flex justify-between bg-muted/30 rounded-lg p-2">
                    <span>لفل {item.lvl}</span>
                    <span className="font-bold text-foreground">{item.dur}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </MobileLayout>
  );
};

export default CustomGiftUpload;
