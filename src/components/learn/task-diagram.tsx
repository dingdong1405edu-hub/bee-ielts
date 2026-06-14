"use client";

/**
 * Renders an IELTS Writing Task 1 diagram (inline SVG with a white background).
 * The SVG markup is trusted seed content, not user input.
 */
export function TaskDiagram({ svg }: { svg: string | null | undefined }) {
  if (!svg) return null;
  return (
    <div
      className="w-full overflow-x-auto rounded-lg border bg-card [&>svg]:block [&>svg]:w-full [&>svg]:h-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
