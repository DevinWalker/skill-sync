import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-[4px] border px-1.5 py-0.5 font-mono text-[10.5px] tracking-[0.04em]",
  {
    variants: {
      variant: {
        default: "border-border-strong bg-card text-muted-foreground",
        primary: "border-primary/30 bg-primary/[0.06] text-primary",
        info:    "border-info/30 bg-info/[0.05] text-info",
        violet:  "border-violet/30 bg-violet/[0.05] text-violet",
        warning: "border-warning/30 bg-warning/[0.06] text-warning",
        danger:  "border-destructive/30 bg-destructive/[0.06] text-destructive",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { badgeVariants }
