import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-[color,transform,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 min-h-9 min-w-11 px-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90 hover:-translate-y-px hover:shadow-sm active:translate-y-0 active:scale-[0.98]",
        secondary: "border border-border/70 bg-card-solid text-secondary-foreground hover:bg-field",
        outline: "border border-input bg-card-solid hover:bg-field",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        destructive: "bg-destructive text-white hover:bg-destructive/90",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4",
        sm: "h-8 min-w-0 px-3 text-xs",
        lg: "h-10 px-6",
        icon: "h-9 w-9 min-w-9 px-0",
        xs: "h-6 gap-1 px-2 text-xs [&_svg:not([class*='size-'])]:size-3",
        "icon-xs": "size-6 min-w-6 px-0 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8 min-w-8 px-0",
        "icon-lg": "size-10 min-w-10 px-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return <ButtonPrimitive data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
