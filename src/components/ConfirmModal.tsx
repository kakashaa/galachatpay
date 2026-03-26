import React from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ConfirmModalProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
  confirmText?: string;
  cancelText?: string;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  title,
  message,
  onConfirm,
  onCancel,
  danger = false,
  confirmText = "تأكيد",
  cancelText = "إلغاء",
}) => {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 flex items-center justify-center"
        style={{ background: "rgba(0,0,0,0.7)", zIndex: 9999 }}
        onClick={onCancel}
      >
        <motion.div
          initial={{ scale: 0.8, y: 30 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.8, y: 30 }}
          className="rounded-2xl p-6 max-w-sm w-full mx-4 text-center space-y-4"
          style={{
            background: "rgba(20,20,30,0.95)",
            border: "1px solid rgba(255,255,255,0.1)",
            zIndex: 9999,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-foreground font-bold text-base">{title}</p>
          <p className="text-sm text-muted-foreground whitespace-pre-line">{message}</p>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold text-foreground"
              style={{ background: "rgba(255,255,255,0.06)" }}
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white"
              style={{
                background: danger
                  ? "hsl(350 89% 55%)"
                  : "hsl(160 84% 39%)",
              }}
            >
              {confirmText}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ConfirmModal;
