import { ShieldBan, Clock } from "lucide-react";
import { motion } from "framer-motion";

interface BanOverlayProps {
  reason: string;
  remainingTime: string;
  banType: string;
}

const BanOverlay: React.FC<BanOverlayProps> = ({ reason, remainingTime, banType }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm p-6"
    >
      <div className="max-w-sm w-full text-center space-y-6">
        <motion.div
          initial={{ scale: 0.5 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.1 }}
          className="mx-auto w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center"
        >
          <ShieldBan className="w-10 h-10 text-destructive" />
        </motion.div>

        <div>
          <h2 className="text-xl font-bold text-destructive mb-2">🚫 تم حظرك</h2>
          <p className="text-muted-foreground text-sm">
            تم حظرك من استخدام جميع عناصر وخدمات التطبيق
          </p>
        </div>

        {reason && (
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
            <p className="text-xs text-muted-foreground mb-1">السبب</p>
            <p className="text-sm text-foreground font-medium">{reason}</p>
          </div>
        )}

        <div className="flex items-center justify-center gap-2 text-sm">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span className="text-muted-foreground">المدة المتبقية:</span>
          <span className="font-bold text-foreground">{remainingTime}</span>
        </div>

        {banType && (
          <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-destructive/10 text-destructive">
            {banType === "promotion" ? "📱 حظر ترويج" : "👤 حظر عادي"}
          </span>
        )}

        <p className="text-xs text-muted-foreground">
          إذا كنت تعتقد أن هذا خطأ، تواصل مع الدعم الفني
        </p>
      </div>
    </motion.div>
  );
};

export default BanOverlay;
