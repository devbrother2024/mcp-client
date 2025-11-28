import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-300 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  {
    variants: {
      variant: {
        default:
          'bg-gradient-to-r from-[oklch(0.65_0.25_280)] via-[oklch(0.6_0.22_300)] to-[oklch(0.65_0.25_280)] bg-[length:200%_100%] text-white shadow-lg shadow-[oklch(0.65_0.25_280_/_0.25)] hover:bg-[position:100%_0] hover:shadow-[oklch(0.65_0.25_280_/_0.4)] hover:shadow-xl active:scale-[0.98]',
        destructive:
          'bg-gradient-to-r from-[oklch(0.6_0.25_25)] to-[oklch(0.55_0.22_15)] text-white shadow-lg shadow-[oklch(0.6_0.25_25_/_0.25)] hover:shadow-[oklch(0.6_0.25_25_/_0.4)] hover:shadow-xl active:scale-[0.98]',
        outline:
          'border border-[oklch(0.35_0.02_260_/_0.5)] bg-[oklch(0.15_0.01_260_/_0.5)] backdrop-blur-sm text-foreground hover:bg-[oklch(0.2_0.02_280_/_0.3)] hover:border-[oklch(0.5_0.15_280_/_0.5)] hover:shadow-lg hover:shadow-[oklch(0.65_0.25_280_/_0.1)]',
        secondary:
          'bg-[oklch(0.22_0.015_260)] text-secondary-foreground border border-[oklch(0.3_0.02_260_/_0.3)] hover:bg-[oklch(0.28_0.02_260)] hover:border-[oklch(0.4_0.02_260_/_0.5)]',
        ghost: 'text-foreground hover:bg-[oklch(0.25_0.02_260_/_0.5)] hover:text-accent-foreground',
        link: 'text-[oklch(0.75_0.18_195)] underline-offset-4 hover:underline hover:text-[oklch(0.85_0.15_195)]',
        glow: 'bg-gradient-to-r from-[oklch(0.65_0.25_280)] via-[oklch(0.7_0.2_200)] to-[oklch(0.75_0.18_195)] bg-[length:200%_100%] text-white shadow-[0_0_20px_oklch(0.65_0.25_280_/_0.4),0_0_40px_oklch(0.65_0.25_280_/_0.2)] hover:bg-[position:100%_0] hover:shadow-[0_0_30px_oklch(0.75_0.18_195_/_0.5),0_0_60px_oklch(0.75_0.18_195_/_0.25)] active:scale-[0.98]',
        glass:
          'bg-[oklch(0.2_0.01_260_/_0.4)] backdrop-blur-xl border border-[oklch(0.4_0.02_260_/_0.3)] text-foreground hover:bg-[oklch(0.25_0.02_260_/_0.5)] hover:border-[oklch(0.5_0.15_280_/_0.4)] shadow-lg',
      },
      size: {
        default: 'h-10 px-5 py-2.5',
        sm: 'h-9 rounded-lg gap-1.5 px-4 text-xs',
        lg: 'h-12 rounded-xl px-8 text-base',
        icon: 'size-10 rounded-xl',
        'icon-sm': 'size-9 rounded-lg',
        'icon-lg': 'size-12 rounded-xl',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : 'button';

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
