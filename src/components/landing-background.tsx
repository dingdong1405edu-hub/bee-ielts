import { Sparkles, Star } from "lucide-react";
import { Honeycomb } from "@/components/honeycomb";

/**
 * Decorative background for the marketing landing page — a layered design:
 * a colour gradient wash, the Bee IELTS honeycomb texture, soft floating
 * colour blobs and scattered decorative shapes (rings, dots, sparkles) so the
 * page feels crafted rather than empty.
 */
export function LandingBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* gradient colour wash */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(50rem 34rem at 8% -6%, hsl(265 95% 64% / 0.34), transparent 66%)," +
            "radial-gradient(46rem 34rem at 100% 6%, hsl(322 95% 64% / 0.30), transparent 66%)," +
            "radial-gradient(44rem 34rem at 0% 46%, hsl(196 95% 56% / 0.26), transparent 66%)," +
            "radial-gradient(48rem 36rem at 100% 62%, hsl(28 96% 58% / 0.24), transparent 66%)," +
            "radial-gradient(52rem 40rem at 50% 116%, hsl(150 82% 50% / 0.26), transparent 70%)",
        }}
      />

      {/* honeycomb texture — the Bee IELTS signature pattern */}
      <Honeycomb className="absolute inset-0 h-full w-full text-primary/[0.07]" />

      {/* soft colour blobs */}
      <div className="absolute -top-28 -left-24 h-80 w-80 rounded-full bg-violet-400 blob animate-blob" />
      <div className="absolute top-[12%] -right-20 h-[22rem] w-[22rem] rounded-full bg-fuchsia-400 blob animate-blob" style={{ animationDelay: "2s" }} />
      <div className="absolute top-[34%] -left-28 h-80 w-80 rounded-full bg-sky-400 blob animate-blob" style={{ animationDelay: "4s" }} />
      <div className="absolute top-[40%] left-[44%] h-72 w-72 rounded-full bg-indigo-400 blob animate-blob" style={{ animationDelay: "7s" }} />
      <div className="absolute top-[56%] -right-24 h-[22rem] w-[22rem] rounded-full bg-amber-300 blob animate-blob" style={{ animationDelay: "6s" }} />
      <div className="absolute top-[74%] left-1/4 h-80 w-80 rounded-full bg-emerald-400 blob animate-blob" style={{ animationDelay: "3s" }} />
      <div className="absolute -bottom-28 right-1/5 h-80 w-80 rounded-full bg-rose-400 blob animate-blob" style={{ animationDelay: "5s" }} />

      {/* decorative outline rings */}
      <div className="absolute top-[7%] right-[9%] h-40 w-40 rounded-full border-2 border-violet-400/25 animate-float" />
      <div className="absolute top-[30%] left-[7%] h-24 w-24 rounded-full border-2 border-sky-400/30 animate-float" style={{ animationDelay: "1.5s" }} />
      <div className="absolute top-[63%] right-[12%] h-28 w-28 rounded-full border-2 border-emerald-400/25 animate-float" style={{ animationDelay: "2.5s" }} />
      <div className="absolute bottom-[8%] left-[12%] h-20 w-20 rounded-full border-2 border-amber-400/30 animate-float" style={{ animationDelay: "0.8s" }} />

      {/* small floating dots */}
      <div className="absolute top-[16%] left-[20%] h-3 w-3 rounded-full bg-fuchsia-400/60 animate-float" />
      <div className="absolute top-[24%] right-[24%] h-2.5 w-2.5 rounded-full bg-violet-500/60 animate-float" style={{ animationDelay: "1s" }} />
      <div className="absolute top-[52%] left-[14%] h-2.5 w-2.5 rounded-full bg-sky-500/60 animate-float" style={{ animationDelay: "2s" }} />
      <div className="absolute top-[70%] right-[28%] h-3 w-3 rounded-full bg-emerald-500/60 animate-float" style={{ animationDelay: "1.3s" }} />
      <div className="absolute bottom-[16%] right-[20%] h-2.5 w-2.5 rounded-full bg-amber-500/60 animate-float" style={{ animationDelay: "0.5s" }} />

      {/* sparkles */}
      <Sparkles className="absolute top-[20%] right-[16%] h-7 w-7 text-amber-400/50 animate-pulse" />
      <Sparkles className="absolute top-[58%] left-[10%] h-6 w-6 text-violet-400/50 animate-pulse" style={{ animationDelay: "1.2s" }} />
      <Star className="absolute top-[44%] right-[6%] h-5 w-5 text-fuchsia-400/50 animate-pulse" style={{ animationDelay: "0.6s" }} />
      <Star className="absolute bottom-[12%] left-[26%] h-6 w-6 text-sky-400/50 animate-pulse" style={{ animationDelay: "1.8s" }} />
    </div>
  );
}
