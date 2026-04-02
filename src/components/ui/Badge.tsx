/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/src/lib/utils';

interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'destructive' | 'success' | 'warning';
}

export const Badge = forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const variants = {
      default: 'bg-pop-blue/20 text-pop-blue border border-pop-blue/30',
      secondary: 'bg-gray-800 text-gray-400 border border-gray-700',
      outline: 'border-2 border-pop-pink/50 text-pop-pink',
      destructive: 'bg-rose-500/20 text-rose-500 border border-rose-500/30',
      success: 'bg-pop-green/20 text-pop-green border border-pop-green/30',
      warning: 'bg-pop-yellow/20 text-pop-yellow border border-pop-yellow/30',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest transition-all duration-300',
          variants[variant],
          className
        )}
        {...props}
      />
    );
  }
);

Badge.displayName = 'Badge';
