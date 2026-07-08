'use client';

import React, { forwardRef } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: [
    'bg-brand text-white border-transparent',
    'hover:opacity-90 active:opacity-80',
    'shadow-sm shadow-brand/20',
  ].join(' '),
  secondary: [
    'bg-surface text-foreground border-border',
    'hover:bg-muted hover:border-muted-foreground/40',
  ].join(' '),
  ghost: [
    'bg-transparent text-foreground border-transparent',
    'hover:bg-muted',
  ].join(' '),
  danger: [
    'bg-error text-white border-transparent',
    'hover:opacity-90 active:opacity-80',
    'shadow-sm shadow-error/20',
  ].join(' '),
  outline: [
    'bg-transparent text-brand border-brand',
    'hover:bg-brand/10',
  ].join(' '),
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-2 text-sm gap-1.5 min-h-[36px]',
  md: 'px-4 py-2.5 text-sm gap-2 min-h-[44px]',
  lg: 'px-6 py-3 text-base gap-2.5 min-h-[52px]',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    isLoading = false,
    leftIcon,
    rightIcon,
    className = '',
    disabled,
    children,
    ...props
  },
  ref
) {
  const base = [
    'inline-flex items-center justify-center',
    'font-medium rounded-lg border',
    'transition-all duration-150 ease-in-out',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    'disabled:opacity-50 disabled:pointer-events-none',
    'cursor-pointer',
  ].join(' ');

  return (
    <button
      ref={ref}
      className={`${base} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <svg
          className="animate-spin h-4 w-4 text-current"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      ) : (
        <>
          {leftIcon && <span className="shrink-0">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  );
});
