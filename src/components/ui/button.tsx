import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Duolingo-style 3D pressable buttons: a chunky bottom shadow reads as depth;
// :active sinks the button into it (translate down + shadow shrinks). Colored
// variants use the matching `*-deep` token as the shadow so it stays on-brand
// in both light and dark mode.
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[14px] text-sm font-extrabold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:translate-y-[2px]",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_4px_0_var(--primary-deep)] hover:brightness-105 active:shadow-[0_1px_0_var(--primary-deep)]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-[0_4px_0_#C7343F] hover:brightness-105 active:shadow-[0_1px_0_#C7343F]",
        outline:
          "border-2 border-input bg-card shadow-[0_3px_0_hsl(var(--border))] hover:border-primary hover:text-primary active:shadow-[0_1px_0_hsl(var(--border))]",
        secondary:
          "bg-secondary text-secondary-foreground shadow-[0_4px_0_hsl(var(--border))] hover:brightness-[0.98] active:shadow-[0_1px_0_hsl(var(--border))]",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        success:
          "bg-success text-success-foreground shadow-[0_4px_0_var(--primary-deep)] hover:brightness-105 active:shadow-[0_1px_0_var(--primary-deep)]",
        brand:
          "gradient-brand text-white shadow-[0_4px_0_var(--primary-deep)] hover:brightness-105 active:shadow-[0_1px_0_var(--primary-deep)]",
      },
      size: {
        default: "h-11 px-5 py-2",
        sm: "h-9 px-4 text-xs",
        lg: "h-12 px-6 text-base",
        xl: "h-14 px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { buttonVariants };
