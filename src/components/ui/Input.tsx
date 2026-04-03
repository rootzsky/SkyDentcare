/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/src/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="w-full space-y-2">
        {label && (
          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            'flex h-12 w-full rounded-2xl border-2 border-gray-200 bg-white px-4 py-2 text-sm text-pop-text placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pop-blue focus-visible:border-pop-blue transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-rose-500 focus-visible:ring-rose-500',
            className
          )}
          {...props}
        />
        {error && (
          <p className="text-[10px] text-rose-500 font-bold uppercase tracking-tight ml-1">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
