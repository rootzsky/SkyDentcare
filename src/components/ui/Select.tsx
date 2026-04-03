/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SelectHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/src/lib/utils';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, children, ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label className="text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={cn(
            'flex h-12 w-full rounded-2xl border-2 border-gray-200 bg-white px-4 py-2 text-sm text-pop-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pop-blue focus-visible:border-pop-blue transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50 appearance-none',
            error && 'border-rose-500 focus-visible:ring-rose-500',
            className
          )}
          {...props}
        >
          {children}
        </select>
        {error && (
          <p className="text-xs text-red-500">{error}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
