"use client";

import { cn } from "@/lib/cn";
import * as React from "react";

export interface CodeBlockProps extends React.HTMLAttributes<HTMLDivElement> {
  language?: string;
  filename?: string;
  copyable?: boolean;
  children: string;
}

const CodeBlock = React.forwardRef<HTMLDivElement, CodeBlockProps>(
  (
    {
      language,
      filename,
      copyable = false,
      children,
      className,
      "aria-label": ariaLabel,
      ...props
    },
    ref,
  ) => {
    const [copied, setCopied] = React.useState(false);

    const handleCopy = async () => {
      try {
        await navigator.clipboard.writeText(children);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // clipboard write failed silently
      }
    };

    return (
      <div
        ref={ref}
        role="region"
        aria-label={ariaLabel ?? (language ? `${language} code block` : "code block")}
        className={cn(
          "rounded-lg border border-[var(--color-border,#2a2a2a)]",
          "bg-[var(--color-surface,#111)] overflow-hidden",
          className,
        )}
        {...props}
      >
        {/* Header bar: shows language label; filename conveyed via aria on wrapper */}
        <div
          className="flex items-center justify-between px-4 py-2 border-b border-[var(--color-border,#2a2a2a)] bg-[var(--color-surface-raised,#1a1a1a)]"
          aria-label={filename ? `File: ${filename}` : undefined}
        >
          <span className="text-xs font-mono text-[var(--color-muted,#888)]">
            {language ?? "code"}
          </span>
          {copyable && (
            <button
              type="button"
              aria-label={copied ? "Copied" : "Copy code"}
              onClick={handleCopy}
              className={cn(
                "text-xs font-mono px-2 py-0.5 rounded",
                "border border-[var(--color-border,#2a2a2a)]",
                "text-[var(--color-muted,#888)] hover:text-[#00d184]",
                "transition-colors duration-150",
              )}
            >
              {copied ? "Copied" : "Copy"}
            </button>
          )}
        </div>

        {/* Code body */}
        <pre className="p-4 overflow-x-auto text-sm font-mono leading-relaxed text-[var(--color-foreground,#f5f5f5)]">
          <code>{children}</code>
        </pre>
      </div>
    );
  },
);

CodeBlock.displayName = "CodeBlock";

export { CodeBlock };
