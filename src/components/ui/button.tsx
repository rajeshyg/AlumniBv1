import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-primary/90 to-primary/80 text-primary-foreground shadow-[0_2px_4px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.1)] hover:from-primary hover:to-primary/90 hover:shadow-[0_3px_6px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.2)] hover:scale-[1.02] active:scale-[0.98] active:shadow-[0_1px_2px_rgba(0,0,0,0.2)]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-[0_2px_4px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.1)] hover:bg-destructive/90 hover:shadow-[0_3px_6px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.2)] hover:scale-[1.02] active:scale-[0.98] active:shadow-[0_1px_2px_rgba(0,0,0,0.2)]",
        outline:
          "border border-input bg-background shadow-[0_2px_4px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.1)] hover:bg-accent hover:text-accent-foreground hover:shadow-[0_3px_6px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.2)] hover:scale-[1.02] active:scale-[0.98] active:shadow-[0_1px_2px_rgba(0,0,0,0.15)]",
        secondary:
          "bg-gradient-to-r from-primary/15 to-primary/10 text-foreground shadow-[0_2px_4px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.1)] hover:from-primary/20 hover:to-primary/15 hover:shadow-[0_3px_6px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.2)] hover:scale-[1.02] active:scale-[0.98] active:shadow-[0_1px_2px_rgba(0,0,0,0.15)]",
        ghost: "hover:bg-accent hover:text-accent-foreground hover:scale-[1.02] active:scale-[0.98]",
        link: "text-primary underline-offset-4 hover:underline hover:text-primary/80",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-9 rounded-md px-3 py-1.5 text-xs",
        lg: "h-11 rounded-md px-8 text-base",
        icon: "h-10 w-10",
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