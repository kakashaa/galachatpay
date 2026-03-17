import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, LogOut } from "lucide-react";

interface Props {
  title: string;
  children: React.ReactNode;
  accentColor?: string;
  onLogout?: () => void;
  rightContent?: React.ReactNode;
}

const AdminPageLayout: React.FC<Props> = ({ title, children, accentColor, onLogout, rightContent }) => {
  const navigate = useNavigate();

  return (
    <div className="mobile-container" style={{ background: "#09090b" }}>
      <header className="sticky top-0 z-20 backdrop-blur-xl border-b border-white/5 px-4 py-3" style={{ background: "rgba(9,9,11,0.92)" }}>
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/admin/dashboard")} className="p-1.5 rounded-xl hover:bg-white/5 transition-colors">
              <ArrowRight className="w-5 h-5 text-foreground" />
            </button>
            <h1 className="font-bold text-lg tracking-tight text-foreground" style={accentColor ? { color: accentColor } : {}}>
              {title}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {rightContent}
            {onLogout && (
              <button onClick={onLogout} className="p-2 rounded-xl hover:bg-white/5 transition-colors">
                <LogOut className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto min-h-0">
        {children}
      </div>
    </div>
  );
};

export default AdminPageLayout;
