"use client";

/**
 * Renders an IELTS Writing Task 1 diagram (inline SVG with a white background).
 * The SVG markup is trusted seed content, not user input.
 */
export function TaskDiagram({ svg }: { svg: string | null | undefined }) {
  if (!svg) return null;
  return (
    <div
      className="w-full overflow-hidden rounded-lg border bg-card"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
