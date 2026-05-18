/**
 * Ambient background shared by every learner page.
 * Minimal and modern: a single soft brand glow plus a faint line grid that
 * fades out softly (see `.learn-bg` in globals.css). Fixed, behind all
 * content (z-index -10).
 */
export function LearnBackground() {
  return <div aria-hidden className="learn-bg" />;
}
