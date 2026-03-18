import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, Sparkles, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import ItemComments from "@/components/ItemComments";

const CustomGiftGallery: React.FC = () => {
  const navigate = useNavigate();
  const [gifts, setGifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const fetchApproved = async () => {
      const { data } = await supabase
        .from("custom_gifts")
        .select("*")
        .eq("status", "approved")
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });
      setGifts(data || []);
      setLoading(false);
    };
    fetchApproved();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-3" dir="rtl">
      {/* Upload CTA */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => navigate("/custom-gift")}
        className="w-full bg-gradient-to-r from-pink-500/10 to-purple-500/10 border border-pink-500/20 rounded-2xl p-3 flex items-center gap-3"
      >
        <div className="w-9 h-9 rounded-xl bg-pink-500/15 flex items-center justify-center">
          <Upload className="w-4 h-4 text-pink-400" />
        </div>
        <div className="text-right">
          <span className="text-sm font-bold text-pink-400 block">ارفع هديتك المخصصة</span>
          <span className="text-[10px] text-muted-foreground">لفل 40+ مطلوب</span>
        </div>
        <Sparkles className="w-4 h-4 text-purple-400 mr-auto" />
      </motion.button>

      {gifts.length === 0 && (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">لا توجد هدايا مخصصة حالياً</p>
        </div>
      )}

      {/* Gift Grid */}
      <div className="grid grid-cols-2 gap-3">
        {gifts.map((gift, i) => (
          <motion.div
            key={gift.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-card border border-border/30 rounded-2xl overflow-hidden"
          >
            {/* Video */}
            <div className="relative aspect-square">
              <video
                src={gift.video_url}
                className="w-full h-full object-cover"
                loop
                muted
                autoPlay
                playsInline
                poster={gift.thumbnail_url || undefined}
              />
              <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded-lg font-bold">
                {gift.video_duration || 0}ث
              </div>
            </div>

            {/* Info */}
            <div className="p-2 space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-2.5 h-2.5 text-primary" />
                </div>
                <span className="text-[11px] font-bold text-foreground truncate">{gift.user_name}</span>
              </div>
              {gift.title && (
                <p className="text-[10px] text-muted-foreground truncate">{gift.title}</p>
              )}

              {/* Comments toggle */}
              <button
                onClick={() => setExpandedId(expandedId === gift.id ? null : gift.id)}
                className="text-[10px] text-primary font-bold"
              >
                {expandedId === gift.id ? "إخفاء التعليقات" : "التعليقات"}
              </button>
            </div>

            {expandedId === gift.id && (
              <div className="px-2 pb-2">
                <ItemComments itemType="custom_gift" itemId={gift.id} />
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default CustomGiftGallery;
