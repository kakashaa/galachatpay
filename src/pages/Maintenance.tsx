import React from "react";
import { Construction, MessageCircle } from "lucide-react";

const Maintenance: React.FC = () => {
  return (
    <div
      dir="rtl"
      className="min-h-screen flex items-center justify-center px-6 bg-background"
    >
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-24 h-24 mx-auto rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center">
          <Construction className="w-12 h-12 text-primary animate-pulse" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            الموقع تحت التطوير
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            نعمل حالياً على تحسين الخدمة. نعتذر عن الإزعاج وسنعود قريباً بإذن الله.
          </p>
        </div>
        <div
          className="rounded-2xl p-5 space-y-3"
          style={{
            background:
              "linear-gradient(145deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div className="flex items-center justify-center gap-2 text-primary">
            <MessageCircle className="w-5 h-5" />
            <span className="text-sm font-bold">للاستفسار أو المساعدة</span>
          </div>
          <p className="text-xs text-muted-foreground">
            تواصل مع الإدارة على آيدي الغرفة
          </p>
          <div className="text-3xl font-extrabold text-primary tracking-widest">
            10000
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">
          غلا شات 💬
        </p>
      </div>
    </div>
  );
};

export default Maintenance;
