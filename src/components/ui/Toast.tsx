'use client';

import { useEffect, useState } from 'react';

interface ToastProps {
  message: string;
  type?: 'info' | 'error' | 'success';
  duration?: number;
  onClose: () => void;
}

const styles = {
  info:    'bg-go-s2 text-go-t1 border border-white/10',
  error:   'bg-go-red  text-go-t1 border border-go-red/50',
  success: 'bg-go-green text-go-t1 border border-go-green/50',
};

export default function Toast({
  message,
  type = 'info',
  duration = 3000,
  onClose,
}: ToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div
      className={`
        fixed top-4 left-1/2 -translate-x-1/2 z-50
        px-4 py-2 rounded-lg text-sm
        transition-all duration-300
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1'}
        ${styles[type]}
      `}
    >
      {message}
    </div>
  );
}
