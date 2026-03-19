import React from "react";
import { ArrowRight, Phone } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ChatHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  showCall?: boolean;
  rightContent?: React.ReactNode;
  membersBar?: React.ReactNode;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
  title, subtitle, onBack, showCall = false, rightContent, membersBar,
}) => {
  const navigate = useNavigate();
  const handleBack = onBack || (() => navigate(-1));

  return (
    <div className="sticky top-0 z-30" style={{ background: "hsl(var(--chat-header-bg))", backdropFilter: "blur(20px)", borderBottom: "1px solid hsl(0 0% 100% / 0.06)" }}>
      <div className="flex items-center gap-3 px-4 py-3">
        <button onClick={handleBack} className="p-2 rounded-xl" style={{ background: "hsl(0 0% 100% / 0.06)" }}>
          <ArrowRight className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground truncate">{title}</p>
          {subtitle && (
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: "hsl(var(--chat-online))", boxShadow: "0 0 6px hsl(var(--chat-online))" }} />
              <p className="text-[10px] text-muted-foreground">{subtitle}</p>
            </div>
          )}
        </div>
        {showCall && (
          <button className="p-2 rounded-xl relative" style={{ background: "hsl(0 0% 100% / 0.06)" }}>
            <Phone className="w-4 h-4 text-muted-foreground" />
            <span className="absolute -top-1 -left-2 text-[7px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: "hsl(var(--chat-online))", color: "#fff" }}>قريباً</span>
          </button>
        )}
        {rightContent}
      </div>
      {membersBar}
    </div>
  );
};

export default ChatHeader;
