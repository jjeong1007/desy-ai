import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes, type ReactNode } from "react";
import { ArrowUpRight, Search, Command } from "lucide-react";
import { cn } from "@/lib/utils";
import { IconButton } from "./icon-button";

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd className={cn("inline-flex size-4 items-center justify-center rounded-xs bg-line font-sans text-panel text-fg-tertiary [&_svg]:size-3", className)}>
      {children}
    </kbd>
  );
}

const fieldBase = "border border-line bg-canvas text-fg placeholder:text-fg-tertiary outline-none transition-colors focus-within:border-line-strong";

/** SearchInput — Figma: top nav search (91:586). */
export const SearchInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { shortcut?: boolean }>(
  ({ className, shortcut = true, placeholder = "Search documents, interviews, product features, and more", ...props }, ref) => (
    <label className={cn(fieldBase, "flex h-[33px] items-center gap-2 rounded-sm px-4", className)}>
      <Search className="size-4 shrink-0 text-fg-secondary" aria-hidden />
      <input ref={ref} type="search" placeholder={placeholder} className="min-w-0 flex-1 bg-transparent text-body outline-none placeholder:text-fg-tertiary" {...props} />
      {shortcut && (
        <span className="flex gap-1" aria-hidden>
          <Kbd><Command /></Kbd>
          <Kbd>K</Kbd>
        </span>
      )}
    </label>
  ),
);
SearchInput.displayName = "SearchInput";

/** TextInput — single line field with the same visual language. */
export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(({ className, invalid, ...props }, ref) => (
  <input
    ref={ref}
    aria-invalid={invalid || undefined}
    className={cn(fieldBase, "h-[33px] rounded-sm px-3 text-body focus:border-line-strong aria-invalid:border-git-deleted", className)}
    {...props}
  />
));
TextInput.displayName = "TextInput";

/** PromptInput — Figma: Home research prompt (91:538) and session chat. */
export interface PromptInputProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  onSubmitPrompt?: (value: string) => void;
  size?: "lg" | "md";
  leading?: ReactNode;
  /** Controls inside the box, left of submit (e.g. an attach button). */
  tools?: ReactNode;
  /** Chips shown inside the box above the text (e.g. attached context). */
  attachments?: ReactNode;
}

export const PromptInput = forwardRef<HTMLTextAreaElement, PromptInputProps>(
  ({ className, onSubmitPrompt, size = "lg", leading, tools, attachments, placeholder = "Enter a research topic you want to explore to get started", ...props }, ref) => {
    const field = (
      <textarea
        ref={ref}
        rows={size === "lg" ? 3 : 1}
        placeholder={placeholder}
        className={cn("w-full flex-1 resize-none bg-transparent outline-none placeholder:text-fg-tertiary", size === "lg" ? "text-title font-normal" : "text-body")}
        {...props}
        onKeyDown={(e) => {
          props.onKeyDown?.(e);
          if (e.key === "Enter" && !e.shiftKey && onSubmitPrompt) {
            e.preventDefault();
            onSubmitPrompt(e.currentTarget.value);
          }
        }}
      />
    );
    const submit = (
      <IconButton
        label="Submit"
        variant="filled"
        size="lg"
        className="ml-auto self-end"
        onClick={(e) => {
          const el = e.currentTarget.closest("[data-prompt-input]")?.querySelector("textarea");
          if (el && onSubmitPrompt) onSubmitPrompt(el.value);
        }}
      >
        <ArrowUpRight />
      </IconButton>
    );
    return (
      <div className={cn("flex gap-2", className)}>
        {leading}
        <div data-prompt-input className={cn(fieldBase, "flex flex-1 flex-col gap-2 rounded-lg px-4 py-3", size === "lg" ? "min-h-[169px] justify-between" : "min-h-[58px] justify-center shadow-card")}>
          {attachments ? <div className="flex flex-wrap gap-1.5">{attachments}</div> : null}
          {size === "lg" ? (
            <>
              {field}
              <div className="flex items-end gap-2">
                {tools}
                {submit}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              {tools}
              {field}
              {submit}
            </div>
          )}
        </div>
      </div>
    );
  },
);
PromptInput.displayName = "PromptInput";
