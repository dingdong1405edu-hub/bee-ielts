/**
 * Ambient decorative background shared by every learner page.
 * Sits behind all content (`.learn-bg` is fixed, z-index -10) so the large
 * empty areas of the dark UI feel alive — soft colour orbs + a faint dot grid.
 */
export function LearnBackground() {
  return (
    <div aria-hidden className="learn-bg">
      <div
        className="learn-orb learn-orb-float h-[34rem] w-[34rem] bg-violet-500"
        style={{ top: "-10rem", left: "-9rem" }}
      />
      <div
        className="learn-orb learn-orb-float h-[30rem] w-[30rem] bg-fuchsia-500"
        style={{ top: "-8rem", right: "-8rem", animationDelay: "-4s" }}
      />
      <div
        className="learn-orb learn-orb-float h-[36rem] w-[36rem] bg-indigo-500"
        style={{ top: "32%", right: "-13rem", animationDelay: "-9s" }}
      />
      <div
        className="learn-orb learn-orb-float h-[26rem] w-[26rem] bg-amber-400"
        style={{ bottom: "-9rem", left: "12%", animationDelay: "-6s" }}
      />
      <div
        className="learn-orb learn-orb-float h-[28rem] w-[28rem] bg-emerald-500"
        style={{ bottom: "-7rem", right: "8%", animationDelay: "-12s" }}
      />
    </div>
  );
}
