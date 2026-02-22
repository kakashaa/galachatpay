import React from "react";

interface MobileLayoutProps {
  children: React.ReactNode;
  showHeader?: boolean;
  headerTitle?: string;
  onBack?: () => void;
}

const MobileLayout: React.FC<MobileLayoutProps> = ({ children, showHeader, headerTitle, onBack }) => {
  return (
    <div className="mobile-container bg-background">
      {showHeader && (
        <header className="shrink-0 sticky top-0 z-50 flex items-center justify-between px-5 py-4 bg-background/80 backdrop-blur-xl border-b border-border/30">
          <h1 className="text-lg font-bold text-foreground">{headerTitle}</h1>
          {onBack && (
            <button onClick={onBack} className="text-primary text-sm font-semibold">
              رجوع
            </button>
          )}
        </header>
      )}
      <div className="flex-1 overflow-y-auto min-h-0">
        {children}
      </div>
    </div>
  );
};

export default MobileLayout;
