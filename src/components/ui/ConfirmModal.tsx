"use client";

import { Modal } from "./Modal";
import { Button } from "./Button";
import { AlertTriangle } from "lucide-react";

interface Props {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  open, title = "Are you sure?", message,
  confirmLabel = "Confirm", danger = false,
  loading, onConfirm, onCancel,
}: Props) {
  return (
    <Modal open={open} onClose={onCancel} title="" size="sm">
      <div className="flex flex-col items-center text-center gap-4 pb-2">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${danger ? "bg-[var(--danger-bg)]" : "bg-[var(--warning-bg)]"}`}>
          <AlertTriangle size={26} className={danger ? "text-[var(--danger)]" : "text-[var(--warning)]"} />
        </div>
        <div>
          <p className="text-lg font-bold text-[var(--text-strong)]">{title}</p>
          <p className="text-[15px] text-[var(--text-muted)] mt-1 leading-relaxed">{message}</p>
        </div>
        <div className="flex gap-3 w-full mt-2">
          <Button variant="secondary" className="flex-1" onClick={onCancel}>Cancel</Button>
          <Button
            variant={danger ? "danger" : "primary"}
            className="flex-1"
            loading={loading}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
