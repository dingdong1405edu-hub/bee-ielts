import {} from "@/components/brand/textures";
import { LeafField } from "@/components/brand/leaf";

/**
 * Ambient decorative background shared by every learner page — a faint line
 * grid, soft animated brand glows, a honeycomb texture, and a scatter of
 * leaves. Subtle and motivating; fixed behind all content (see `.ambient-*`
 * rules in globals.css). This is the single backdrop that keeps every study
 * page visually in sync.
 */
export function AmbientBackground() {
  return (
    <div aria-hidden className="ambient-bg">
      <div className="ambient-grid" />
      <div className="ambient-honeycomb">
        
      </div>
      <LeafField className="ambient-leaves absolute inset-0" />
      <div className="ambient-glow ambient-glow-1" />
      <div className="ambient-glow ambient-glow-2" />
      <div className="ambient-glow ambient-glow-3" />
    </div>
  );
}
