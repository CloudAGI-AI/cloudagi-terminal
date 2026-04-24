import * as React from "react";
import { cn } from "@/lib/cn";

export type TerminalLineType = "command" | "output" | "info" | "prompt";

export interface TerminalLine {
  type: TerminalLineType;
  text: string;
}

export interface TerminalPreviewProps extends React.HTMLAttributes<HTMLDivElement> {
  lines: TerminalLine[];
  title?: string;
}

const lineColor: Record<TerminalLineType, string> = {
  command: "text-[var(--color-foreground,#f5f5f5)]",
  output: "text-[#00d184]",
  info: "text-[var(--color-muted,#888)]",
  prompt: "text-yellow-400",
};

const TerminalPreview = React.forwardRef<HTMLDivElement, TerminalPreviewProps>(
  ({ lines, title, className, "aria-label": ariaLabel, ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="img"
        aria-label={ariaLabel ?? "Terminal interface preview"}
        className={cn(
          "rounded-lg border border-[var(--color-border,#2a2a2a)]",
          "bg-[var(--color-surface,#111)] overflow-hidden",
          "shadow-md",
          className
        )}
        {...props}
      >
        {/* Window chrome */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--color-border,#2a2a2a)] bg-[var(--color-surface-raised,#1a1a1a)]">
          <span className="w-3 h-3 rounded-full bg-[#ff5f57]" aria-hidden="true" />
          <span className="w-3 h-3 rounded-full bg-[#febc2e]" aria-hidden="true" />
          <span className="w-3 h-3 rounded-full bg-[#28c840]" aria-hidden="true" />
          {title && (
            <span className="ml-2 text-xs font-mono text-[var(--color-muted,#888)]">
              {title}
            </span>
          )}
        </div>

        {/* Terminal body */}
        <div className="p-4 font-mono text-sm space-y-1.5 min-h-[80px]">
          {lines.map((line, i) => (
            <p key={i} className={cn("leading-relaxed", lineColor[line.type])}>
              {line.type === "command"
                ? `$ ${line.text}`
                : line.text}
            </p>
          ))}
        </div>
      </div>
    );
  }
);

TerminalPreview.displayName = "TerminalPreview";

export { TerminalPreview };
