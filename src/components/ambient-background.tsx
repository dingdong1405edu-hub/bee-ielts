/**
 * Ambient decorative background — a faint line grid plus a few soft,
 * slowly-animating light glows in the brand colours. Minimal and modern;
 * the motion gives a gentle "living light" effect. Fixed, behind all
 * content (see `.ambient-*` rules in globals.css).
 */
export function AmbientBackground() {
  return (
    <div aria-hidden className="ambient-bg">
      <div className="ambient-grid" />
      <div className="ambient-glow ambient-glow-1" />
      <div className="ambient-glow ambient-glow-2" />
      <div className="ambient-glow ambient-glow-3" />
    </div>
  );
}
