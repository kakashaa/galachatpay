import React from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Construction } from "lucide-react";
import MobileLayout from "@/components/MobileLayout";

interface PlaceholderPageProps {
  title: string;
}

const PlaceholderPage: React.FC<PlaceholderPageProps> = ({ title }) => {
  const navigate = useNavigate();

  return (
    <MobileLayout showHeader headerTitle={title} onBack={() => navigate("/dashboard")}>
      <div className="flex flex-col items-center justify-center px-6 py-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6"
        >
          <Construction className="w-10 h-10 text-primary animate-pulse-gold" />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center"
        >
          <h2 className="text-lg font-bold text-foreground mb-2">{title}</h2>
          <p className="text-sm text-muted-foreground">هذه الصفحة قيد الإنشاء</p>
          <p className="text-xs text-muted-foreground mt-1">سيتم بناؤها في المرحلة القادمة</p>
        </motion.div>
      </div>
    </MobileLayout>
  );
};

export default PlaceholderPage;
