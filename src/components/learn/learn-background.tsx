/**
 * Ambient decorative background shared by every learner page.
 * Sits behind all content (`.learn-bg` is fixed, z-index -10) so the large
 * empty areas of the UI feel alive — soft colour orbs spread across the whole
 * viewport, a gentle gradient wash and a faint dot grid (see globals.css).
 */
export function LearnBackground() {
  return (
    <div aria-hidden className="learn-bg">
      {/* top */}
      <div
        className="learn-orb learn-orb-float h-[34rem] w-[34rem] bg-violet-500"
        style={{ top: "-11rem", left: "-9rem" }}
      />
      <div
        className="learn-orb learn-orb-float h-[30rem] w-[30rem] bg-fuchsia-500"
        style={{ top: "-8rem", right: "-8rem", animationDelay: "-4s" }}
      />
      {/* upper-middle */}
      <div
        className="learn-orb learn-orb-float h-[27rem] w-[27rem] bg-sky-500"
        style={{ top: "24%", left: "-10rem", animationDelay: "-7s" }}
      />
      <div
        className="learn-orb learn-orb-float h-[36rem] w-[36rem] bg-indigo-500"
        style={{ top: "32%", right: "-13rem", animationDelay: "-9s" }}
      />
      {/* centre — fills the area that used to feel empty */}
      <div
        className="learn-orb learn-orb-float h-[26rem] w-[26rem] bg-emerald-500"
        style={{ top: "50%", left: "28%", animationDelay: "-13s" }}
      />
      {/* lower */}
      <div
        className="learn-orb learn-orb-float h-[23rem] w-[23rem] bg-cyan-400"
        style={{ bottom: "20%", left: "-8rem", animationDelay: "-11s" }}
      />
      <div
        className="learn-orb learn-orb-float h-[26rem] w-[26rem] bg-amber-400"
        style={{ bottom: "-9rem", left: "10%", animationDelay: "-6s" }}
      />
      <div
        className="learn-orb learn-orb-float h-[30rem] w-[30rem] bg-rose-500"
        style={{ bottom: "-11rem", right: "5%", animationDelay: "-15s" }}
      />
    </div>
  );
}
