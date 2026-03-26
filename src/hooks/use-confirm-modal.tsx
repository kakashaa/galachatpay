import { useState, useCallback } from "react";
import ConfirmModal from "@/components/ConfirmModal";

interface ConfirmOptions {
  title: string;
  message: string;
  danger?: boolean;
  confirmText?: string;
  cancelText?: string;
}

export function useConfirmModal() {
  const [state, setState] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({ ...opts, resolve });
    });
  }, []);

  const ConfirmDialog: React.FC = () => state ? (
    <ConfirmModal
      title={state.title}
      message={state.message}
      danger={state.danger}
      confirmText={state.confirmText}
      cancelText={state.cancelText}
      onConfirm={() => { state.resolve(true); setState(null); }}
      onCancel={() => { state.resolve(false); setState(null); }}
    />
  ) : null;

  return { confirm, ConfirmDialog };
}
