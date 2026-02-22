'use client';

import { ReactNode, useEffect } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}

export default function Modal({ open, onClose, title, children, actions }: ModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
        <h2 className="text-lg font-bold text-stone-900 mb-3">{title}</h2>
        <div className="text-stone-700 mb-4">{children}</div>
        {actions && <div className="flex gap-2 justify-end">{actions}</div>}
      </div>
    </div>
  );
}
