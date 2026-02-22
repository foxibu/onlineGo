'use client';

import { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

const variants = {
  primary: 'bg-stone-800 text-white hover:bg-stone-700 active:bg-stone-900',
  secondary: 'bg-stone-200 text-stone-800 hover:bg-stone-300 active:bg-stone-400',
  danger: 'bg-red-600 text-white hover:bg-red-500 active:bg-red-700',
  ghost: 'bg-transparent text-stone-700 hover:bg-stone-100 active:bg-stone-200',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`rounded-lg font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
