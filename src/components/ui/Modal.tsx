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
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Panel */}
      <div className="go-card-elevated relative max-w-sm w-full p-6 animate-in fade-in zoom-in-95 duration-150">
        <h2 className="text-base font-semibold text-go-t1 mb-3 tracking-tight">{title}</h2>
        <div className="text-go-t2 text-sm leading-relaxed mb-5">{children}</div>
        {actions && (
          <div className="flex gap-2 justify-end border-t border-white/7 pt-4">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
