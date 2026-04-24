import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const badgeVariants = cva(
  [
    "inline-flex items-center rounded-full px-2 py-0.5",
    "text-xs font-mono font-medium",
    "border",
  ],
  {
    variants: {
      variant: {
        default: [
          "border-[var(--color-border,#2a2a2a)]",
          "bg-[var(--color-surface,#111)]",
          "text-[var(--color-foreground,#f5f5f5)]",
        ],
        success: [
          "border-[#00d184]/40",
          "bg-[#00d184]/10",
          "text-[#00d184]",
        ],
        warning: [
          "border-yellow-500/40",
          "bg-yellow-500/10",
          "text-yellow-400",
        ],
        danger: [
          "border-red-500/40",
          "bg-red-500/10",
          "text-red-400",
        ],
        outline: [
          "border-[var(--color-border,#2a2a2a)]",
          "bg-transparent",
          "text-[var(--color-muted,#888)]",
        ],
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => (
    <span
      ref={ref}
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
);
Badge.displayName = "Badge";

export { Badge, badgeVariants };
