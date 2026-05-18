/**
 * Background for the marketing landing page.
 * Minimal and modern: a soft brand glow and a faint line grid that fades
 * out softly — clean, not busy. Fixed, behind all content.
 */
export function LandingBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* soft brand glow */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(48rem 32rem at 50% -8rem, hsl(var(--primary) / 0.20), transparent 72%)," +
            "radial-gradient(40rem 28rem at 96% 102%, hsl(var(--primary) / 0.10), transparent 72%)",
        }}
      />
      {/* faint line grid, masked so it fades softly outward */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--foreground) / 0.05) 1px, transparent 1px)," +
            "linear-gradient(90deg, hsl(var(--foreground) / 0.05) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          WebkitMaskImage: "radial-gradient(circle at 50% 24%, #000 0%, transparent 82%)",
          maskImage: "radial-gradient(circle at 50% 24%, #000 0%, transparent 82%)",
        }}
      />
    </div>
  );
}
