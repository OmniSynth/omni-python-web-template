import { Dialog as SheetPrimitive } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import * as React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { shouldCancelSheetDismiss } from "@/lib/portaled-overlay";
import { cn } from "@/lib/utils";

const SheetTrigger = SheetPrimitive.Trigger;
const SheetClose = SheetPrimitive.Close;
const SheetPortal = SheetPrimitive.Portal;

/** 抽屉内 Select/Popover 浮层挂载容器（由 SheetContent 注册，避免 ScrollArea 裁剪）。 */
const SheetPortalContext = React.createContext<HTMLElement | null>(null);
const SheetCloseOnOverlayClickRef = React.createContext<React.RefObject<boolean> | null>(null);

export function useSheetPortalContainer(): HTMLElement | null {
  return React.useContext(SheetPortalContext);
}

function SheetRoot({ onOpenChange, children, ...props }: SheetPrimitive.Root.Props) {
  const closeOnOverlayClickRef = React.useRef(true);

  return (
    <SheetCloseOnOverlayClickRef.Provider value={closeOnOverlayClickRef}>
      <SheetPrimitive.Root
        {...props}
        onOpenChange={(open, eventDetails) => {
          if (!open && (eventDetails.reason === "outside-press" || eventDetails.reason === "focus-out")) {
            if (shouldCancelSheetDismiss(eventDetails.event, closeOnOverlayClickRef.current)) {
              eventDetails.cancel();
              return;
            }
          }
          onOpenChange?.(open, eventDetails);
        }}
      >
        {children}
      </SheetPrimitive.Root>
    </SheetCloseOnOverlayClickRef.Provider>
  );
}

type SheetLayer = "default" | "nav";

const sheetLayerZ: Record<SheetLayer, { overlay: string; content: string }> = {
  default: { overlay: "z-50", content: "z-51" },
  /** 高于 Select/Popover（z-100）的 portal，避免遮挡主导航抽屉点击。 */
  nav: { overlay: "z-[109]", content: "z-[110]" },
};

const SheetOverlay = React.forwardRef<HTMLDivElement, SheetPrimitive.Backdrop.Props & { layer?: SheetLayer }>(
  ({ className, layer = "default", ...props }, ref) => (
    <SheetPrimitive.Backdrop
      ref={ref}
      data-slot="sheet-overlay"
      className={cn(
        "fixed inset-0 bg-foreground/20 backdrop-blur-sm data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0",
        sheetLayerZ[layer].overlay,
        className,
      )}
      {...props}
    />
  ),
);
SheetOverlay.displayName = "SheetOverlay";

type SheetSide = "right" | "left";

const sideClasses: Record<SheetSide, string> = {
  right:
    "inset-y-0 right-0 h-full w-full border-l data-closed:slide-out-to-right data-open:slide-in-from-right sm:max-w-md",
  left: "inset-y-0 left-0 h-full w-full border-r data-closed:slide-out-to-left data-open:slide-in-from-left sm:max-w-md",
};

function SheetContent({
  side = "right",
  layer = "default",
  className,
  children,
  closeOnOverlayClick = true,
  showCloseButton = true,
  ...props
}: SheetPrimitive.Popup.Props & {
  side?: SheetSide;
  /** 层级：nav 用于主导航抽屉，须高于业务 Select/Popover */
  layer?: SheetLayer;
  /** 是否允许点击遮罩关闭 */
  closeOnOverlayClick?: boolean;
  showCloseButton?: boolean;
}) {
  const [portalContainer, setPortalContainer] = React.useState<HTMLElement | null>(null);
  const popupRef = React.useCallback((node: HTMLDivElement | null) => {
    setPortalContainer(node);
  }, []);
  const closeOnOverlayClickRef = React.useContext(SheetCloseOnOverlayClickRef);
  if (closeOnOverlayClickRef) {
    closeOnOverlayClickRef.current = closeOnOverlayClick;
  }

  return (
    <SheetPortal>
      <SheetOverlay layer={layer} />
      <SheetPrimitive.Popup
        ref={popupRef}
        data-slot="sheet-content"
        data-side={side}
        className={cn(
          "sheet-surface fixed flex flex-col gap-0 text-card-foreground transition ease-in-out data-closed:duration-300 data-open:duration-300",
          sheetLayerZ[layer].content,
          sideClasses[side],
          className,
        )}
        {...props}
      >
        <SheetPortalContext.Provider value={portalContainer}>{children}</SheetPortalContext.Provider>
        {showCloseButton ? (
          <SheetPrimitive.Close
            data-slot="sheet-close"
            className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full p-0 text-muted-foreground opacity-80 transition-opacity hover:bg-field hover:opacity-100 focus:outline-none focus-visible:opacity-100"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">关闭</span>
          </SheetPrimitive.Close>
        ) : null}
      </SheetPrimitive.Popup>
    </SheetPortal>
  );
}

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    data-slot="sheet-section"
    className={cn("flex flex-col gap-1.5 border-b px-6 py-4 pr-12", className)}
    {...props}
  />
);

function SheetTitle({ className, ...props }: SheetPrimitive.Title.Props) {
  return <SheetPrimitive.Title data-slot="sheet-title" className={cn("text-base font-medium", className)} {...props} />;
}

function SheetDescription({ className, ...props }: SheetPrimitive.Description.Props) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

const SheetBody = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <ScrollArea className="min-h-0 flex-1">
      <div ref={ref} className={cn("px-6 py-4 pr-2", className)} {...props}>
        {children}
      </div>
    </ScrollArea>
  ),
);
SheetBody.displayName = "SheetBody";

const SheetFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    data-slot="sheet-section"
    className={cn("flex shrink-0 flex-row flex-nowrap items-center justify-end gap-2 border-t px-6 py-4", className)}
    {...props}
  />
);

export {
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetRoot as Sheet,
  SheetTitle,
  SheetTrigger,
};
