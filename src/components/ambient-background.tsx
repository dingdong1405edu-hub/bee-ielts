import { LeafField } from "@/components/brand/leaf";

/**
 * Ambient decorative background shared by every learner page — soft animated
 * brand glows and a scatter of leaves. Honeycomb texture removed (user fb:
 * "xóa cái background tổ ong"). Fixed behind content via `.ambient-*` rules.
 */
export function AmbientBackground() {
  return (
    <div aria-hidden className="ambient-bg">
      <LeafField className="ambient-leaves absolute inset-0" />
      <div className="ambient-glow ambient-glow-1" />
      <div className="ambient-glow ambient-glow-2" />
      <div className="ambient-glow ambient-glow-3" />
    </div>
  );
}
