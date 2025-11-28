import * as React from 'react';

import { cn } from '@/lib/utils';

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // Base styles
        'flex h-11 w-full min-w-0 rounded-xl px-4 py-3 text-sm transition-all duration-300',
        // Background & Border - Glassmorphism
        'bg-[oklch(0.15_0.01_260_/_0.6)] backdrop-blur-xl',
        'border border-[oklch(0.3_0.02_260_/_0.4)]',
        // Text
        'text-foreground placeholder:text-[oklch(0.5_0.02_260)]',
        // Focus states - Glow effect
        'focus:outline-none focus:border-[oklch(0.65_0.25_280_/_0.6)]',
        'focus:shadow-[0_0_0_3px_oklch(0.65_0.25_280_/_0.15),0_0_20px_oklch(0.65_0.25_280_/_0.2)]',
        'focus:bg-[oklch(0.18_0.01_260_/_0.8)]',
        // Hover
        'hover:border-[oklch(0.4_0.02_260_/_0.6)] hover:bg-[oklch(0.17_0.01_260_/_0.7)]',
        // Disabled
        'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
        // File input
        'file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground',
        // Selection
        'selection:bg-[oklch(0.65_0.25_280_/_0.3)] selection:text-foreground',
        // Invalid state
        'aria-invalid:border-destructive aria-invalid:shadow-[0_0_0_3px_oklch(0.65_0.25_25_/_0.15)]',
        className
      )}
      {...props}
    />
  );
}

export { Input };
