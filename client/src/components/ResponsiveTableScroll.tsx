import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

type ResponsiveTableScrollProps = {
  children: ReactNode;
  className?: string;
  /** Max height for vertical scroll (e.g. "400px" or "min(60vh, 400px)") */
  maxHeight?: string;
  testId?: string;
};

/**
 * Wraps wide tables so they scroll horizontally on small screens without page overflow.
 */
export function ResponsiveTableScroll({
  children,
  className,
  maxHeight,
  testId,
}: ResponsiveTableScrollProps) {
  if (maxHeight) {
    return (
      <ScrollArea
        className={cn("w-full", className)}
        style={{ height: maxHeight }}
        data-testid={testId}
      >
        <div className="min-w-0">{children}</div>
        <ScrollBar orientation="horizontal" />
        <ScrollBar orientation="vertical" />
      </ScrollArea>
    );
  }

  return (
    <div
      className={cn("w-full overflow-x-auto", className)}
      data-testid={testId}
    >
      {children}
    </div>
  );
}
