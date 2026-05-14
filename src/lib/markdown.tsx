import React from "react";

/**
 * Tiny inline markdown → React for lesson content.
 * Supports: **bold**, *italic*, `code`, line breaks.
 */
export function renderMarkdown(text: string): React.ReactNode {
  return text.split(/\n\n+/).map((para, pi) => {
    const lines = para.split("\n");
    return (
      <p key={pi} className="mb-3 last:mb-0 leading-relaxed">
        {lines.map((line, li) => (
          <React.Fragment key={li}>
            {renderInline(line)}
            {li < lines.length - 1 && <br />}
          </React.Fragment>
        ))}
      </p>
    );
  });
}

function renderInline(text: string): React.ReactNode {
  const tokens = tokenize(text);
  return tokens.map((tok, i) => {
    switch (tok.type) {
      case "bold":
        return (
          <strong key={i} className="font-bold text-foreground">
            {tok.value}
          </strong>
        );
      case "italic":
        return (
          <em key={i} className="italic">
            {tok.value}
          </em>
        );
      case "code":
        return (
          <code key={i} className="rounded bg-muted px-1 py-0.5 text-[0.85em] font-mono">
            {tok.value}
          </code>
        );
      default:
        return <React.Fragment key={i}>{tok.value}</React.Fragment>;
    }
  });
}

type Token = { type: "text" | "bold" | "italic" | "code"; value: string };

function tokenize(text: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  while (i < text.length) {
    if (text.startsWith("**", i)) {
      const end = text.indexOf("**", i + 2);
      if (end !== -1) {
        out.push({ type: "bold", value: text.slice(i + 2, end) });
        i = end + 2;
        continue;
      }
    }
    if (text.startsWith("`", i)) {
      const end = text.indexOf("`", i + 1);
      if (end !== -1) {
        out.push({ type: "code", value: text.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }
    if (
      text[i] === "*" &&
      text[i + 1] !== "*" &&
      text[i - 1] !== "*"
    ) {
      const end = text.indexOf("*", i + 1);
      if (end !== -1 && text[end + 1] !== "*") {
        out.push({ type: "italic", value: text.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }
    const last = out[out.length - 1];
    if (last?.type === "text") last.value += text[i];
    else out.push({ type: "text", value: text[i] });
    i++;
  }
  return out;
}
