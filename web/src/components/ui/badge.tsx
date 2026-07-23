import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium transition-colors", {
  variants: {
    variant: {
      default: "bg-primary/15 text-primary",
      secondary: "bg-secondary text-secondary-foreground",
      success: "bg-primary/15 text-primary",
      warning: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400",
      destructive: "bg-destructive/15 text-destructive",
      outline: "border border-border text-foreground",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props,
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  });
}

export { Badge, badgeVariants };
