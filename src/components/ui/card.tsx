import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Card — Figma: project card (139:986), action card (99:6).
 * Pass `media` for an image; omit it to show the placeholder.
 */
export interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  title: ReactNode;
  description?: ReactNode;
  media?: ReactNode;
  showMedia?: boolean;
  children?: ReactNode;
}

export function Card({ title, description, media, showMedia = true, className, children, ...props }: CardProps) {
  return (
    <div className={cn("flex flex-col overflow-hidden rounded-lg border border-line bg-canvas", className)} {...props}>
      {showMedia && <div className="h-[105px] bg-placeholder [&>*]:size-full [&>*]:object-cover">{media}</div>}
      <div className="flex flex-col gap-3 p-3">
        <div className="flex flex-col gap-1">
          <h3 className="m-0 text-title font-semibold text-fg">{title}</h3>
          {description && <p className="m-0 text-small text-fg-tertiary">{description}</p>}
        </div>
        {children && <div className="flex justify-end gap-2">{children}</div>}
      </div>
    </div>
  );
}
