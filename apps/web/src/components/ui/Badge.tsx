import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "whitespace-nowrap inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition-colors focus:outline-none focus:ring-1 focus:ring-[#333333]/40 focus:ring-offset-0",
  {
    variants: {
      variant: {
        default:
          "border-border bg-muted text-foreground",
        secondary:
          "border-border bg-muted/70 text-muted-foreground",
        destructive:
          "border-destructive/40 bg-destructive/10 text-destructive",
        outline:
          "border-border bg-transparent text-foreground",
        success:
          "border-border bg-muted text-foreground",
        warning:
          "border-border bg-muted text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
  VariantProps<typeof badgeVariants> { }

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants }
