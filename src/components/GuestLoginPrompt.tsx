import React from "react";
import { useNavigate } from "react-router-dom";
import { LogIn } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface GuestLoginPromptProps {
  open: boolean;
  onClose: () => void;
}

const GuestLoginPrompt: React.FC<GuestLoginPromptProps> = ({ open, onClose }) => {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xs rounded-2xl text-center">
        <DialogTitle className="text-base font-bold">سجّل دخولك أولاً</DialogTitle>
        <div className="space-y-4 py-2">
          <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center mx-auto">
            <LogIn className="w-7 h-7 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">
            لاستخدام هذه الخدمة يجب تسجيل الدخول بحسابك في غلا شات
          </p>
          <Button
            onClick={() => { onClose(); navigate("/"); }}
            className="w-full gold-gradient text-primary-foreground font-bold h-11"
          >
            تسجيل الدخول
          </Button>
          <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            متابعة التصفح
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GuestLoginPrompt;
