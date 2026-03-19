import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Download, Share, Plus, Check, Smartphone, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import galaLogo from "@/assets/gala-logo.png";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const InstallApp: React.FC = () => {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua));

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setIsInstalled(true);
    setDeferredPrompt(null);
  };

  return (
    <div className="mobile-container bg-background flex flex-col items-center justify-center px-6 text-center" dir="rtl">
      <button
        onClick={() => navigate(-1)}
        className="absolute top-4 right-4 text-muted-foreground p-2"
        style={{ top: "calc(env(safe-area-inset-top, 0px) + 1rem)" }}
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      <img src={galaLogo} alt="غلا لايف" className="w-24 h-24 rounded-2xl mb-6 shadow-lg" />
      <h1 className="text-2xl font-bold text-foreground mb-2">تثبيت غلا لايف</h1>
      <p className="text-sm text-muted-foreground mb-8 max-w-xs">
        ثبّت التطبيق على جهازك للوصول السريع بدون متصفح
      </p>

      {isInstalled ? (
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <Check className="w-8 h-8 text-emerald-400" />
          </div>
          <p className="text-emerald-400 font-bold">التطبيق مثبّت بالفعل!</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/dashboard")}>
            الذهاب للرئيسية
          </Button>
        </div>
      ) : isIOS ? (
        <div className="space-y-6 w-full max-w-xs">
          <p className="text-xs text-muted-foreground">للتثبيت على iPhone / iPad:</p>
          <div className="space-y-4">
            <div className="flex items-center gap-3 glass-card p-4 text-right">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                <Share className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">1. اضغط زر المشاركة</p>
                <p className="text-[11px] text-muted-foreground">من شريط المتصفح السفلي</p>
              </div>
            </div>
            <div className="flex items-center gap-3 glass-card p-4 text-right">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                <Plus className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">2. إضافة إلى الشاشة الرئيسية</p>
                <p className="text-[11px] text-muted-foreground">اختر "Add to Home Screen"</p>
              </div>
            </div>
            <div className="flex items-center gap-3 glass-card p-4 text-right">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                <Smartphone className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">3. جاهز!</p>
                <p className="text-[11px] text-muted-foreground">سيظهر التطبيق على شاشتك الرئيسية</p>
              </div>
            </div>
          </div>
        </div>
      ) : deferredPrompt ? (
        <Button
          onClick={handleInstall}
          className="gap-2 px-8 py-6 text-base rounded-2xl bg-gradient-to-l from-primary to-accent text-white font-bold"
        >
          <Download className="w-5 h-5" />
          تثبيت التطبيق
        </Button>
      ) : (
        <div className="space-y-4 text-center">
          <p className="text-xs text-muted-foreground">
            افتح التطبيق من متصفح Chrome أو Edge ثم اختر "تثبيت التطبيق" من القائمة
          </p>
          <div className="flex items-center gap-3 glass-card p-4 text-right">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
              <Download className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">القائمة ⋮ → تثبيت التطبيق</p>
              <p className="text-[11px] text-muted-foreground">أو "إضافة إلى الشاشة الرئيسية"</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InstallApp;
