import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import * as React from "react";
import { shouldCancelSheetDismiss } from "@/lib/portaled-overlay";
import { cn } from "@/lib/utils";

const DialogCloseOnOverlayClickRef = React.createContext<React.RefObject<boolean> | null>(null);

function Dialog({ onOpenChange, children, ...props }: DialogPrimitive.Root.Props) {
  const closeOnOverlayClickRef = React.useRef(true);

  return (
    <DialogCloseOnOverlayClickRef.Provider value={closeOnOverlayClickRef}>
      <DialogPrimitive.Root
        data-slot="dialog"
        onOpenChange={(open, eventDetails) => {
          if (!open && (eventDetails.reason === "outside-press" || eventDetails.reason === "focus-out")) {
            if (shouldCancelSheetDismiss(eventDetails.event, closeOnOverlayClickRef.current)) {
              eventDetails.cancel();
              return;
            }
          }
          onOpenChange?.(open, eventDetails);
        }}
        {...props}
      >
        {children}
      </DialogPrimitive.Root>
    </DialogCloseOnOverlayClickRef.Provider>
  );
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({ className, ...props }: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/25 backdrop-blur-sm data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0",
        className,
      )}
      {...props}
    />
  );
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  closeOnOverlayClick = true,
  ...props
}: DialogPrimitive.Popup.Props & {
  showCloseButton?: boolean;
  /** 是否允许点击遮罩关闭 */
  closeOnOverlayClick?: boolean;
}) {
  const closeOnOverlayClickRef = React.useContext(DialogCloseOnOverlayClickRef);
  if (closeOnOverlayClickRef) {
    closeOnOverlayClickRef.current = closeOnOverlayClick;
  }

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        className={cn(
          "surface-glass-strong fixed left-1/2 top-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 border border-border p-6 duration-200 sm:rounded-xl data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 data-open:fade-in-0 data-open:zoom-in-95",
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton ? (
          <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring">
            <X className="h-4 w-4" />
            <span className="sr-only">关闭</span>
          </DialogPrimitive.Close>
        ) : null}
      </DialogPrimitive.Popup>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-1.5 text-center sm:text-left", className)}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn("flex flex-row flex-nowrap items-center justify-end gap-2", className)}
      {...props}
    />
  );
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return <DialogPrimitive.Title data-slot="dialog-title" className={cn("text-lg font-medium", className)} {...props} />;
}

function DialogDescription({ className, ...props }: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
