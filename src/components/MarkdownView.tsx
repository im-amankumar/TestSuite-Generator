import React from "react";

// Parses markdown inline tags: **bold** and `code`
function renderInlineStyles(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let index = 0;

  // Regex to find **bold** or `code`
  const regex = /(\*\*.*?\*\*|`.*?`)/g;
  const matches = text.split(regex);

  return matches.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={idx} className="font-semibold text-zinc-900 dark:text-white px-0.5">
          {part.slice(2, -2)}
        </strong>
      );
    } else if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={idx}
          className="font-mono text-xs text-blue-700 dark:text-sky-300 bg-blue-50/50 dark:bg-sky-950/40 border border-blue-200/60 dark:border-sky-900/35 px-1 py-0.5 rounded"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

interface MarkdownViewProps {
  content: string;
}

export function MarkdownView({ content }: MarkdownViewProps) {
  if (!content) return null;

  const lines = content.split("\n");

  return (
    <div className="space-y-2 text-sm text-zinc-700 dark:text-slate-300 leading-relaxed font-sans">
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        // 1. Headers
        if (trimmed.startsWith("### ")) {
          return (
            <h4
              key={idx}
              className="text-xs font-semibold text-blue-600 dark:text-sky-400 mt-5 mb-2 uppercase tracking-wide flex items-center gap-2 border-l-2 border-blue-500 pl-2"
            >
              {trimmed.substring(4)}
            </h4>
          );
        }
        if (trimmed.startsWith("## ")) {
          return (
            <h3
              key={idx}
              className="text-sm font-bold text-zinc-900 dark:text-white mt-6 mb-3 border-b border-zinc-200 dark:border-slate-800 pb-1.5 flex items-center gap-2"
            >
              {trimmed.substring(3)}
            </h3>
          );
        }
        if (trimmed.startsWith("# ")) {
          return (
            <h2
              key={idx}
              className="text-base font-extrabold text-zinc-950 dark:text-white mt-8 mb-4 border-b-2 border-blue-500/20 dark:border-indigo-500/30 pb-2 flex items-center gap-2"
            >
              {trimmed.substring(2)}
            </h2>
          );
        }

        // 2. Bullet Lists
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          const body = trimmed.replace(/^[-*]\s+/, "");
          return (
            <div key={idx} className="flex items-start gap-2 pl-4">
              <span className="text-blue-500 dark:text-indigo-400 select-none mt-1 text-xs">•</span>
              <span className="flex-1">{renderInlineStyles(body)}</span>
            </div>
          );
        }

        // 3. Numbered list
        const numberedMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numberedMatch) {
          const num = numberedMatch[1];
          const body = numberedMatch[2];
          return (
            <div key={idx} className="flex items-start gap-2.5 pl-4">
              <span className="text-blue-600 dark:text-sky-405 font-mono text-xs select-none bg-blue-55/40 dark:bg-sky-950/20 border border-blue-200 dark:border-sky-900/30 w-5 h-5 rounded-md flex items-center justify-center font-bold">
                {num}
              </span>
              <span className="flex-1 self-center">{renderInlineStyles(body)}</span>
            </div>
          );
        }

        // 4. Code Blocks (simple filterout because the code is shown in separate tabs,
        // but if they put some inline code fences, we format nicely)
        if (trimmed.startsWith("```")) {
          return null; // Skip markdown code blocks as they are displayed elegantly in tabs!
        }

        // 5. Empty line
        if (!trimmed) {
          return <div key={idx} className="h-1" />;
        }

        // 6. Normal text block
        return (
          <p key={idx} className="pl-1">
            {renderInlineStyles(line)}
          </p>
        );
      })}
    </div>
  );
}
export default MarkdownView;
