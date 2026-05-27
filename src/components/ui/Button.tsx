'use client';

import { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

const variants = {
  primary:   'bg-go-gold text-go-bg font-semibold hover:bg-go-gold2 active:opacity-90',
  secondary: 'bg-go-s2 text-go-t1 border border-white/10 hover:bg-go-s3 hover:border-white/15',
  danger:    'bg-go-red text-go-t1 hover:opacity-90 active:opacity-80',
  ghost:     'bg-transparent text-go-t2 hover:bg-go-s1 hover:text-go-t1',
};

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
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
      className={`
        rounded-lg font-medium transition-all duration-150
        disabled:opacity-30 disabled:cursor-not-allowed
        ${variants[variant]} ${sizes[size]} ${className}
      `}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
