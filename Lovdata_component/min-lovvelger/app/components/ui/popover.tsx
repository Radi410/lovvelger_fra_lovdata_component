"use client";

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { cn } from "./utils";

type PopoverProps = React.ComponentProps<typeof PopoverPrimitive.Root>;

function Popover({ open: controlledOpen, onOpenChange, ...props }: PopoverProps) {
  const [open, setOpen] = React.useState(false);

  // Hvis komponenten brukes med kontrollert state, bruk den. Ellers fallback.
  const isControlled = controlledOpen !== undefined;
  const actualOpen = isControlled ? controlledOpen : open;
  const setActualOpen = isControlled ? onOpenChange : setOpen;

  return (
    <PopoverPrimitive.Root
      data-slot="popover"
      open={actualOpen}
      onOpenChange={setActualOpen}
      {...props}
    />
  );
}

function PopoverTrigger({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Trigger>) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

function PopoverContent({
  className,
  align = "center",
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        onInteractOutside={(event) => {
          // 🔒 Hindre lukking når du klikker på innhold inni popoveren
          if (event.target instanceof Element && event.target.closest("[data-slot='popover-content']")) {
            event.preventDefault();
          }
        }}
        className={cn(
          "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-72 origin-(--radix-popover-content-transform-origin) rounded-md border p-4 shadow-md outline-hidden",
          className
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}

function PopoverAnchor({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Anchor>) {
  return <PopoverPrimitive.Anchor data-slot="popover-anchor" {...props} />;
}

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor };
