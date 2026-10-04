"use client";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as DropdownPrimitive from "@radix-ui/react-dropdown-menu";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { X } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

// ---- Dialog
export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({ className, children, title, description, wide }: { className?: string; children: React.ReactNode; title: string; description?: string; wide?: boolean }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/30 animate-fade-in" />
      <DialogPrimitive.Content
        className={cn(
          "fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-line bg-canvas p-5 shadow-float animate-fade-in",
          wide ? "max-w-3xl" : "max-w-lg",
          className,
        )}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <DialogPrimitive.Title className="text-lg font-semibold tracking-tight">{title}</DialogPrimitive.Title>
            {description ? <DialogPrimitive.Description className="mt-1 text-sm text-ink-2">{description}</DialogPrimitive.Description> : <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>}
          </div>
          <DialogPrimitive.Close className="rounded p-1 text-fg-tertiary hover:bg-surface hover:text-ink" aria-label="Close">
            <X className="size-4" />
          </DialogPrimitive.Close>
        </div>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

// ---- Sheet (right drawer; left on mobile nav)
export function SheetContent({ children, title, side = "right", className, description }: { children: React.ReactNode; title: string; side?: "right" | "left"; className?: string; description?: string }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/25 animate-fade-in" />
      <DialogPrimitive.Content
        className={cn(
          "fixed inset-y-0 z-50 flex w-full flex-col border-line bg-canvas shadow-float",
          side === "right" ? "right-0 max-w-[560px] border-l animate-slide-in-right" : "left-0 max-w-[280px] border-r animate-fade-in",
          className,
        )}
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <DialogPrimitive.Title className="truncate text-sm font-semibold">{title}</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">{description ?? title}</DialogPrimitive.Description>
          <DialogPrimitive.Close className="rounded border border-line p-1 text-ink-2 hover:bg-surface" aria-label="Close">
            <X className="size-4" />
          </DialogPrimitive.Close>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

// ---- Dropdown
export const DropdownMenu = DropdownPrimitive.Root;
export const DropdownMenuTrigger = DropdownPrimitive.Trigger;
export function DropdownMenuContent({ children, align = "end", className }: { children: React.ReactNode; align?: "start" | "end" | "center"; className?: string }) {
  return (
    <DropdownPrimitive.Portal>
      <DropdownPrimitive.Content align={align} sideOffset={6} className={cn("z-50 min-w-[200px] rounded-lg border border-line bg-canvas p-1 shadow-pop animate-fade-in", className)}>
        {children}
      </DropdownPrimitive.Content>
    </DropdownPrimitive.Portal>
  );
}
export const DropdownMenuItem = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof DropdownPrimitive.Item>>(({ className, ...props }, ref) => (
  <DropdownPrimitive.Item ref={ref} className={cn("flex cursor-pointer select-none items-center gap-2 rounded px-2 py-1.5 text-sm text-ink-2 outline-none data-[highlighted]:bg-surface data-[highlighted]:text-ink [&_svg]:size-4", className)} {...props} />
));
DropdownMenuItem.displayName = "DropdownMenuItem";
export const DropdownMenuSeparator = () => <DropdownPrimitive.Separator className="my-1 h-px bg-line" />;
export const DropdownMenuLabel = ({ children }: { children: React.ReactNode }) => <DropdownPrimitive.Label className="px-2 py-1.5 text-xs text-fg-tertiary">{children}</DropdownPrimitive.Label>;

// ---- Popover
export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export function PopoverContent({ children, className, align = "start" }: { children: React.ReactNode; className?: string; align?: "start" | "center" | "end" }) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content align={align} sideOffset={6} collisionPadding={12} className={cn("z-50 w-80 rounded-lg border border-line bg-canvas p-4 text-sm shadow-pop animate-fade-in", className)}>
        {children}
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  );
}

// ---- Tooltip
export const TooltipProvider = TooltipPrimitive.Provider;
export function Tip({ children, content }: { children: React.ReactNode; content: React.ReactNode }) {
  return (
    <TooltipPrimitive.Root delayDuration={200}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content sideOffset={6} className="z-50 max-w-xs rounded bg-ink px-2 py-1 text-xs text-canvas shadow-pop">
          {content}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

// ---- Confirm dialog
export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel, onConfirm, destructive = true, children }: { open: boolean; onOpenChange: (v: boolean) => void; title: string; description: string; confirmLabel: string; onConfirm: () => void; destructive?: boolean; children?: React.ReactNode }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={title} description={description}>
        {children}
        <div className="mt-5 flex justify-end gap-2">
          <DialogClose asChild>
            <button type="button" className="h-9 rounded border border-line px-3 text-sm font-medium hover:bg-surface">Cancel</button>
          </DialogClose>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
            className={cn("h-9 rounded px-3 text-sm font-medium", destructive ? "bg-weak text-white dark:text-canvas" : "bg-accent-strong text-accent-fg")}
          >
            {confirmLabel}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
