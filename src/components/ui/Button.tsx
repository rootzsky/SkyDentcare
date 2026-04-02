/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/src/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    const variants = {
      primary: 'bg-pop-pink text-white hover:bg-pop-purple shadow-lg shadow-pop-pink/20',
      secondary: 'bg-gray-800 text-white hover:bg-gray-700',
      outline: 'border-2 border-pop-blue/50 bg-transparent text-pop-blue hover:bg-pop-blue/10 hover:border-pop-blue',
      ghost: 'bg-transparent hover:bg-white/5 text-gray-400 hover:text-white',
      danger: 'bg-rose-600 text-white hover:bg-rose-700 shadow-lg shadow-rose-600/20',
    };

    const sizes = {
      sm: 'px-4 py-2 text-xs font-black uppercase tracking-widest',
      md: 'px-6 py-3 text-sm font-black uppercase tracking-widest',
      lg: 'px-8 py-4 text-lg font-black uppercase tracking-widest italic',
      icon: 'p-3',
    };

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-2xl font-black transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pop-blue disabled:pointer-events-none disabled:opacity-50 active:scale-95',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';
