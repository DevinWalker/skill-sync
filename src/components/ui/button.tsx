import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary " +
  "disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-transparent border border-border text-foreground hover:bg-bg-hover",
        primary:
          "bg-primary text-primary-foreground border border-primary " +
          "shadow-[0_0_0_1px_var(--accent-glow),0_8px_24px_-8px_var(--accent-glow)] " +
          "hover:brightness-105",
        destructive:
          "bg-transparent border border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground",
        ghost:
          "bg-transparent text-muted-foreground hover:bg-bg-hover hover:text-foreground",
        link:
          "text-primary underline-offset-4 hover:underline",
        outline:
          "bg-transparent border border-border text-foreground hover:bg-bg-hover",
        secondary:
          "bg-card text-foreground border border-border hover:bg-bg-hover",
      },
      size: {
        default: "h-8 px-3 text-[12.5px]",
        sm:      "h-7 px-2.5 text-[11.5px]",
        lg:      "h-9 px-4 text-sm",
        icon:    "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
