import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";

const isEligibleForSOS = (user: any): boolean => {
  if (!user) return false;
  const vipLevel = user.vip?.vip_level || user.vip?.level || 0;
  const isHostAgent = (user.agency_id || 0) > 0;
  const typeUser = user.type_user || 0;
  const isAgentType = [2, 4, 5, 6].includes(typeUser);
  return vipLevel >= 5 || isHostAgent || isAgentType;
};

const SOSButton: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  if (!isEligibleForSOS(user)) return null;

  return (
    <motion.button
      animate={{
        scale: [1, 1.15, 1],
        boxShadow: [
          "0 0 0 0 rgba(239,68,68,0.7)",
          "0 0 0 15px rgba(239,68,68,0)",
          "0 0 0 0 rgba(239,68,68,0)",
        ],
      }}
      transition={{ duration: 1.5, repeat: Infinity }}
      onClick={() => navigate("/quick-support?sos=1")}
      className="fixed bottom-20 left-4 z-40 w-14 h-14 rounded-full flex items-center justify-center active:scale-90 transition-transform"
      style={{
        background: "linear-gradient(135deg, hsl(350 89% 55%), hsl(20 90% 50%))",
      }}
    >
      <span className="text-white font-black text-xs">SOS</span>
    </motion.button>
  );
};

export default SOSButton;
