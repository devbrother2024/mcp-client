import * as React from 'react';

import { cn } from '@/lib/utils';

function Card({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card"
      className={cn(
        // Base layout
        'flex flex-col gap-4 rounded-2xl py-5',
        // Glassmorphism background
        'bg-[oklch(0.16_0.01_260_/_0.7)] backdrop-blur-xl',
        // Border with subtle gradient feel
        'border border-[oklch(0.3_0.02_260_/_0.4)]',
        // Shadow for depth
        'shadow-xl shadow-[oklch(0_0_0_/_0.3)]',
        // Hover effect
        'transition-all duration-300',
        'hover:border-[oklch(0.4_0.02_260_/_0.5)]',
        'hover:shadow-2xl hover:shadow-[oklch(0.65_0.25_280_/_0.1)]',
        className
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        '@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-5',
        'has-data-[slot=card-action]:grid-cols-[1fr_auto]',
        '[.border-b]:pb-5 [.border-b]:border-[oklch(0.3_0.02_260_/_0.3)]',
        className
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-title"
      className={cn('leading-none font-semibold tracking-tight', className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-description"
      className={cn('text-[oklch(0.6_0.02_260)] text-sm', className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-action"
      className={cn('col-start-2 row-span-2 row-start-1 self-start justify-self-end', className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card-content" className={cn('px-5', className)} {...props} />;
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        'flex items-center px-5',
        '[.border-t]:pt-5 [.border-t]:border-[oklch(0.3_0.02_260_/_0.3)]',
        className
      )}
      {...props}
    />
  );
}

// 특수 카드 variants
function GlowCard({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="glow-card"
      className={cn(
        'relative flex flex-col gap-4 rounded-2xl py-5',
        'bg-[oklch(0.14_0.01_260_/_0.8)] backdrop-blur-xl',
        'border border-[oklch(0.35_0.03_280_/_0.4)]',
        'shadow-[0_0_30px_oklch(0.65_0.25_280_/_0.15)]',
        'transition-all duration-500',
        'hover:border-[oklch(0.5_0.15_280_/_0.5)]',
        'hover:shadow-[0_0_40px_oklch(0.65_0.25_280_/_0.25)]',
        className
      )}
      {...props}
    />
  );
}

function GradientBorderCard({ className, children, ...props }: React.ComponentProps<'div'>) {
  return (
    <div className="relative p-[1px] rounded-2xl bg-gradient-to-br from-[oklch(0.65_0.25_280)] via-[oklch(0.7_0.2_200)] to-[oklch(0.75_0.18_195)]">
      <div
        data-slot="gradient-border-card"
        className={cn(
          'flex flex-col gap-4 rounded-2xl py-5',
          'bg-[oklch(0.13_0.005_260)] backdrop-blur-xl',
          className
        )}
        {...props}
      >
        {children}
      </div>
    </div>
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
  GlowCard,
  GradientBorderCard,
};
