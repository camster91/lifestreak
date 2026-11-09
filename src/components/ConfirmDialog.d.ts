import type { ComponentType, ReactNode } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary';
  onConfirm?: () => void;
  onCancel?: () => void;
}

declare const ConfirmDialog: ComponentType<ConfirmDialogProps>;
export default ConfirmDialog;
