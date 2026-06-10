import { LeafField } from "@/components/brand/leaf";
import { Honeycomb } from "@/components/brand/honeycomb";

/**
 * Ambient decorative background shared by every learner page — a faint
 * honeycomb watermark (the BeeEnglish "tổ ong" motif), soft animated brand
 * glows and a scatter of leaves. Fixed behind content via `.ambient-*` rules.
 */
export function AmbientBackground() {
  return (
    <div aria-hidden className="ambient-bg">
      <Honeycomb className="absolute inset-0" color="#2B2417" opacity={0.035} size={34} />
      <LeafField className="ambient-leaves absolute inset-0" />
      <div className="ambient-glow ambient-glow-1" />
      <div className="ambient-glow ambient-glow-2" />
      <div className="ambient-glow ambient-glow-3" />
    </div>
  );
}
