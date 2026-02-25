import { ShieldBan, Clock, Ban } from "lucide-react";
import { motion } from "framer-motion";

const ELEMENT_LABELS: Record<string, string> = {
  entries: "🎁 دخوليات",
  frames: "🖼️ إطارات",
  gifts: "🎀 هدايا مخصصة",
  animated_photos: "📸 صور متحركة",
  change_id: "🔄 تغيير آيدي",
  hairs: "💇 تسريحات",
  vip: "⭐ VIP",
  salary: "💰 رواتب",
  quick_support: "🎧 دعم سريع",
  works: "💼 works",
  stars: "🌟 نجومي",
};

interface BanOverlayProps {
  reason: string;
  remainingTime: string;
  banType: string;
  bannedElements?: string[];
}

const BanOverlay: React.FC<BanOverlayProps> = ({ reason, remainingTime, banType, bannedElements }) => {
  const isElementBan = banType === "elements" && bannedElements && bannedElements.length > 0;

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
          {isElementBan ? (
            <Ban className="w-10 h-10 text-destructive" />
          ) : (
            <ShieldBan className="w-10 h-10 text-destructive" />
          )}
        </motion.div>

        <div>
          <h2 className="text-xl font-bold text-destructive mb-2">🚫 تم حظرك</h2>
          <p className="text-muted-foreground text-sm">
            {isElementBan
              ? "تم حظرك من استخدام بعض عناصر التطبيق"
              : "تم حظرك من استخدام جميع عناصر وخدمات التطبيق"}
          </p>
        </div>

        {isElementBan && (
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
            <p className="text-xs text-muted-foreground mb-2">العناصر المحظورة:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {bannedElements.map((el) => (
                <span key={el} className="px-2.5 py-1 rounded-full text-xs font-bold bg-destructive/10 text-destructive">
                  {ELEMENT_LABELS[el] || el}
                </span>
              ))}
            </div>
          </div>
        )}

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

        <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-destructive/10 text-destructive">
          {isElementBan ? "🧩 حظر عناصر" : "🚫 حظر كامل"}
        </span>

        <p className="text-xs text-muted-foreground">
          إذا كنت تعتقد أن هذا خطأ، تواصل مع الدعم الفني
        </p>
      </div>
    </motion.div>
  );
};

export default BanOverlay;
