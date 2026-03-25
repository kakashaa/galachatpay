import React from "react";
import { ArrowRight } from "lucide-react";

interface MobileLayoutProps {
  children: React.ReactNode;
  showHeader?: boolean;
  headerTitle?: string;
  onBack?: () => void;
}

const MobileLayout: React.FC<MobileLayoutProps> = ({ children, showHeader, headerTitle, onBack }) => {
  return (
    <div className="mobile-container bg-background" dir="rtl">
      {showHeader && (
        <header className="shrink-0 sticky top-0 z-50 flex items-center justify-between px-4 py-3 bg-background/80 backdrop-blur-xl border-b border-border/30">
          {onBack ? (
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/15 border border-primary/30 hover:bg-primary/25 transition-colors"
            >
              <ArrowRight className="w-5 h-5 text-primary" />
              <span className="text-sm font-semibold text-primary">رجوع</span>
            </button>
          ) : (
            <div className="w-16" />
          )}
          <h1 className="text-sm font-bold text-foreground">{headerTitle}</h1>
          <div className="w-16" />
        </header>
      )}
      <div className="flex-1 overflow-y-auto min-h-0">
        {children}
      </div>
    </div>
  );
};

export default MobileLayout;
