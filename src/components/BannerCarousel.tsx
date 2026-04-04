import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface Banner {
  id: string;
  image_url: string;
  link_url: string | null;
}

const BannerCarousel: React.FC = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [current, setCurrent] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("banners")
        .select("id, image_url, link_url")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      setBanners((data as any) || []);
    };
    load();
  }, []);

  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % banners.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [banners.length]);

  const handleClick = (banner: Banner) => {
    if (!banner.link_url) return;
    if (banner.link_url.startsWith("http")) {
      window.open(banner.link_url, "_blank", "noopener");
    } else {
      navigate(banner.link_url);
    }
  };

  if (banners.length === 0) return null;

  return (
    <div className="mb-3 rounded-xl overflow-hidden relative mx-auto" style={{ height: 90, maxWidth: 400 }}>
      {banners.map((banner, idx) => (
        <img
          key={banner.id}
          src={banner.image_url}
          alt=""
          onClick={() => handleClick(banner)}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${banner.link_url ? "cursor-pointer" : ""}`}
          style={{ opacity: idx === current ? 1 : 0 }}
        />
      ))}
      {banners.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
          {banners.map((_, idx) => (
            <div
              key={idx}
              className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                idx === current ? "bg-white w-3" : "bg-white/40"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default BannerCarousel;
