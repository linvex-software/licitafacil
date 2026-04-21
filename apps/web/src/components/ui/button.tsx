import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#333333]/40 focus-visible:ring-offset-0 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
    {
        variants: {
            variant: {
                default:
                    "bg-primary text-primary-foreground shadow-none hover:opacity-90 active:opacity-95 dark:hover:bg-[#e0e0e0] dark:hover:opacity-100",
                destructive:
                    "bg-destructive text-destructive-foreground shadow-none hover:bg-destructive/90 active:bg-destructive/80",
                outline:
                    "border border-input bg-background text-foreground shadow-none hover:bg-accent hover:border-muted-foreground/30",
                secondary:
                    "border border-input bg-muted text-foreground hover:bg-accent",
                ghost:
                    "text-muted-foreground hover:bg-accent hover:text-foreground",
                link:
                    "text-foreground underline-offset-4 hover:underline p-0 h-auto shadow-none font-medium",
            },
            size: {
                default: "h-11 px-4 py-2",
                sm: "h-9 px-3 text-xs rounded-md",
                lg: "h-12 px-5 text-sm rounded-md",
                icon: "h-9 w-9",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    },
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
    },
)
Button.displayName = "Button"

export { Button, buttonVariants }
