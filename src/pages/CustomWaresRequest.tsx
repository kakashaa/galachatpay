import React, { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import MobileLayout from "@/components/MobileLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Check, ChevronRight, ChevronLeft, Upload, Frame, DoorOpen, User, Gem, Loader2, X, FileVideo, Image as ImageIcon } from "lucide-react";

const WARE_TYPES = [
  { value: "frame", label: "إطار", icon: Frame, emoji: "🖼" },
  { value: "entry_room", label: "دخلة غرفة", icon: DoorOpen, emoji: "🚪" },
  { value: "entry_profile", label: "دخلة ملف شخصي", icon: User, emoji: "👤" },
  { value: "necklace", label: "قلادة", icon: Gem, emoji: "📿" },
] as const;

const FILE_FORMATS = [
  { value: "mp4", label: "MP4 Video" },
  { value: "svga", label: "SVGA Animation" },
  { value: "alpha", label: "Alpha Video / WebP" },
];

const ACCEPTED_EXTENSIONS = ".mp4,.svga,.webp,.png,.mov";
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

const QUICK_DURATIONS = [
  { label: "7 أيام", value: 7 },
  { label: "30 يوم", value: 30 },
  { label: "90 يوم", value: 90 },
  { label: "365 يوم (سنة)", value: 365 },
];

const CustomWaresRequest: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(1);
  const [wareType, setWareType] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState("");
  const [fileFormat, setFileFormat] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uuid, setUuid] = useState(user?.uuid || "");
  const [userName, setUserName] = useState(user?.name || "");
  const [days, setDays] = useState(30);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ request_id?: string } | null>(null);

  const detectFormat = (filename: string) => {
    const ext = filename.split(".").pop()?.toLowerCase();
    if (ext === "svga") return "svga";
    if (ext === "webp" || ext === "png") return "alpha";
    if (ext === "mp4" || ext === "mov") return "mp4";
    return "mp4";
  };

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    if (selectedFile.size > MAX_FILE_SIZE) {
      toast({ title: "الملف كبير جداً", description: "الحد الأقصى 20MB", variant: "destructive" });
      return;
    }
    setFile(selectedFile);
    setFileFormat(detectFormat(selectedFile.name));
    setUploading(true);
    setUploadProgress(0);

    try {
      const ext = selectedFile.name.split(".").pop()?.toLowerCase() || "mp4";
      const path = `wares/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const { data, error } = await supabase.storage
        .from("attachments")
        .upload(path, selectedFile, { upsert: true });

      clearInterval(progressInterval);

      if (error) throw error;

      const { data: urlData } = supabase.storage.from("attachments").getPublicUrl(data.path);
      setFileUrl(urlData.publicUrl);
      setUploadProgress(100);
    } catch (err: any) {
      toast({ title: "فشل الرفع", description: err.message, variant: "destructive" });
      setFile(null);
      setFileUrl("");
    } finally {
      setUploading(false);
    }
  }, [toast]);

  const handleSubmit = async () => {
    if (!uuid || !wareType || !fileUrl || !fileFormat) return;
    setSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke("wares-request", {
        body: {
          action: "submit-request",
          uuid,
          user_name: userName,
          ware_type: wareType,
          image_type: fileFormat,
          file_url: fileUrl,
          days,
        },
      });

      if (error) throw error;

      // Send to gala-actions with file URL
      try {
        await supabase.functions.invoke("gala-actions?action=submit-request", {
          body: {
            user_uuid: uuid,
            user_name: userName,
            request_type: wareType,
            details: { file_url: fileUrl, ware_type: wareType, image_type: fileFormat, days },
            evidence_url: fileUrl,
          },
        });
      } catch { /* silent */ }
      if (data?.success === false && data?.error) {
        toast({ title: "خطأ", description: data.error, variant: "destructive" });
        return;
      }

      setSuccess({ request_id: data?.request_id });
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message || "فشل الإرسال", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setWareType("");
    setFile(null);
    setFileUrl("");
    setFileFormat("");
    setDays(30);
    setSuccess(null);
  };

  const selectedType = WARE_TYPES.find(w => w.value === wareType);

  // Success state
  if (success) {
    return (
      <MobileLayout showHeader headerTitle="طلب مخصص" onBack={() => navigate(-1)}>
        <div className="p-4 flex flex-col items-center justify-center min-h-[60vh] gap-4" dir="rtl">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <Check className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-foreground">تم إرسال طلبك بنجاح!</h2>
          {success.request_id && (
            <p className="text-muted-foreground">رقم الطلب: <span className="text-primary font-bold">#{success.request_id}</span></p>
          )}
          <p className="text-muted-foreground text-sm text-center">سيتم مراجعة طلبك من قبل الإدارة</p>
          <div className="flex gap-3 mt-4">
            <Button onClick={resetForm} variant="outline" className="rounded-xl">إرسال طلب جديد</Button>
            <Button onClick={() => navigate("/my-wares-requests")} className="rounded-xl">طلباتي</Button>
          </div>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout showHeader headerTitle="طلب مخصص" onBack={() => navigate(-1)}>
      <div className="p-4 space-y-4" dir="rtl">
        {/* Stepper */}
        <div className="flex items-center justify-center gap-1 mb-6">
          {[1, 2, 3, 4].map(s => (
            <React.Fragment key={s}>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  s === step ? "bg-primary text-primary-foreground" :
                  s < step ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"
                }`}
              >
                {s < step ? <Check className="w-4 h-4" /> : s}
              </div>
              {s < 4 && <div className={`w-8 h-0.5 ${s < step ? "bg-emerald-500" : "bg-muted"}`} />}
            </React.Fragment>
          ))}
        </div>

        {/* Step 1: Select Type */}
        {step === 1 && (
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-foreground">اختيار النوع</h3>
            <div className="grid grid-cols-2 gap-3">
              {WARE_TYPES.map(wt => {
                const Icon = wt.icon;
                const selected = wareType === wt.value;
                return (
                  <button
                    key={wt.value}
                    onClick={() => setWareType(wt.value)}
                    className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                      selected
                        ? "border-primary bg-primary/10 scale-[1.02]"
                        : "border-border/50 bg-card hover:border-border"
                    }`}
                  >
                    <span className="text-2xl">{wt.emoji}</span>
                    <Icon className={`w-6 h-6 ${selected ? "text-primary" : "text-muted-foreground"}`} />
                    <span className={`text-sm font-bold ${selected ? "text-primary" : "text-foreground"}`}>{wt.label}</span>
                  </button>
                );
              })}
            </div>
            <Button onClick={() => setStep(2)} disabled={!wareType} className="w-full mt-4 rounded-xl">
              التالي <ChevronLeft className="w-4 h-4 mr-1" />
            </Button>
          </div>
        )}

        {/* Step 2: Upload File */}
        {step === 2 && (
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-foreground">رفع الملف</h3>

            {!file ? (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-40 border-2 border-dashed border-border/60 rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-primary/50 transition-colors bg-card"
              >
                <Upload className="w-8 h-8 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">اضغط أو اسحب الملف هنا</span>
                <span className="text-xs text-muted-foreground">MP4, SVGA, WebP, PNG, MOV — 20MB كحد أقصى</span>
              </button>
            ) : (
              <div className="relative bg-card rounded-2xl border border-border/50 p-3">
                <button
                  onClick={() => { setFile(null); setFileUrl(""); setUploadProgress(0); }}
                  className="absolute top-2 left-2 z-10 w-7 h-7 rounded-full bg-destructive/80 flex items-center justify-center"
                >
                  <X className="w-4 h-4 text-white" />
                </button>

                {uploading && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground">جاري الرفع...</span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                    </div>
                  </div>
                )}

                {!uploading && fileUrl && (
                  <div className="flex items-center gap-3">
                    {file.type.startsWith("video") ? (
                      <FileVideo className="w-10 h-10 text-primary shrink-0" />
                    ) : (
                      <ImageIcon className="w-10 h-10 text-primary shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                      <p className="text-xs text-emerald-400">✓ تم الرفع بنجاح</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_EXTENSIONS}
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) handleFileSelect(f);
              }}
            />

            {file && (
              <div className="space-y-1">
                <label className="text-sm font-bold text-foreground">صيغة الملف</label>
                <Select value={fileFormat} onValueChange={setFileFormat}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FILE_FORMATS.map(f => (
                      <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex gap-2 mt-4">
              <Button variant="outline" onClick={() => setStep(1)} className="rounded-xl">
                <ChevronRight className="w-4 h-4 ml-1" /> رجوع
              </Button>
              <Button onClick={() => setStep(3)} disabled={!fileUrl || !fileFormat} className="flex-1 rounded-xl">
                التالي <ChevronLeft className="w-4 h-4 mr-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Details */}
        {step === 3 && (
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-foreground">تفاصيل الطلب</h3>

            <div className="space-y-1">
              <label className="text-sm font-bold text-foreground">الآيدي (UUID)</label>
              <Input
                type="number"
                value={uuid}
                onChange={e => setUuid(e.target.value)}
                placeholder="ادخل الآيدي..."
                className="rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-bold text-foreground">الاسم</label>
              <Input
                value={userName}
                onChange={e => setUserName(e.target.value)}
                placeholder="ادخل الاسم..."
                className="rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-bold text-foreground">المدة (أيام)</label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline" size="icon"
                  onClick={() => setDays(d => Math.max(1, d - 1))}
                  className="rounded-xl h-10 w-10"
                >-</Button>
                <Input
                  type="number"
                  value={days}
                  onChange={e => {
                    const v = parseInt(e.target.value);
                    if (!isNaN(v) && v >= 1 && v <= 365) setDays(v);
                  }}
                  className="rounded-xl text-center"
                  min={1}
                  max={365}
                />
                <Button
                  variant="outline" size="icon"
                  onClick={() => setDays(d => Math.min(365, d + 1))}
                  className="rounded-xl h-10 w-10"
                >+</Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {QUICK_DURATIONS.map(qd => (
                  <button
                    key={qd.value}
                    onClick={() => setDays(qd.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                      days === qd.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {qd.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <Button variant="outline" onClick={() => setStep(2)} className="rounded-xl">
                <ChevronRight className="w-4 h-4 ml-1" /> رجوع
              </Button>
              <Button onClick={() => setStep(4)} disabled={!uuid || !userName} className="flex-1 rounded-xl">
                التالي <ChevronLeft className="w-4 h-4 mr-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-foreground">مراجعة وإرسال</h3>

            <div className="bg-card rounded-2xl border border-border/50 p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">النوع</span>
                <span className="text-sm font-bold text-foreground">{selectedType?.emoji} {selectedType?.label}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">الملف</span>
                <span className="text-sm font-bold text-foreground truncate max-w-[60%]">{file?.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">الصيغة</span>
                <span className="text-sm font-bold text-foreground">{fileFormat?.toUpperCase()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">الآيدي</span>
                <span className="text-sm font-bold text-foreground">{uuid}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">الاسم</span>
                <span className="text-sm font-bold text-foreground">{userName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">المدة</span>
                <span className="text-sm font-bold text-foreground">{days} يوم</span>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <Button variant="outline" onClick={() => setStep(3)} className="rounded-xl">
                <ChevronRight className="w-4 h-4 ml-1" /> رجوع
              </Button>
              <Button onClick={handleSubmit} disabled={submitting} className="flex-1 rounded-xl">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                إرسال الطلب ✨
              </Button>
            </div>
          </div>
        )}
      </div>
    </MobileLayout>
  );
};

export default CustomWaresRequest;
