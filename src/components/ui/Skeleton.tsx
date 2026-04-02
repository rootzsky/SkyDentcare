/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/src/lib/utils';

export const Skeleton = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('animate-pulse rounded-md bg-gray-200', className)}
        {...props}
      />
    );
  }
);

Skeleton.displayName = 'Skeleton';
