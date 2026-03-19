import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface StatusModalProps {
  type: "success" | "error" | "loading";
  message: string;
  onClose?: () => void;
  vibrate?: boolean;
}

const StatusModal: React.FC<StatusModalProps> = ({ type, message, onClose, vibrate }) => {
  useEffect(() => {
    if (vibrate && navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 500]);
    }
  }, [vibrate]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
      >
        <motion.div
          initial={{ y: 50, scale: 0.8 }}
          animate={{ y: 0, scale: 1 }}
          exit={{ y: 50, scale: 0.8 }}
          className="rounded-2xl p-6 max-w-sm w-full mx-4 text-center space-y-4"
          style={{
            background: "rgba(20,20,30,0.95)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          {type === "loading" && (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-12 h-12 mx-auto rounded-full"
              style={{
                borderWidth: 3,
                borderStyle: "solid",
                borderColor: "transparent",
                borderTopColor: "hsl(160 84% 39%)",
              }}
            />
          )}
          {type === "success" && <div className="text-4xl"></div>}
          {type === "error" && <div className="text-4xl"></div>}

          <p className="text-white font-bold text-sm whitespace-pre-line">{message}</p>

          {type !== "loading" && onClose && (
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl text-xs font-bold text-white"
              style={{
                background:
                  type === "success"
                    ? "hsl(160 84% 39%)"
                    : "hsl(350 89% 55%)",
              }}
            >
              حسناً
            </button>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default StatusModal;
