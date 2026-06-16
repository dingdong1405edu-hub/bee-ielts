import { BadgeCheck } from "lucide-react";

/**
 * Verified tick shown next to a community author's name.
 *  - Owner / official "Bee" account: blue tick + a "Bee" chip.
 *  - Premium learner: blue tick only.
 *  - Everyone else: nothing.
 *
 * Premium status is computed live at render time by the caller, so the tick
 * automatically disappears the moment a learner's premium lapses.
 */
export function VerifiedBadge({
  isOwner,
  isPremium,
  size = 15,
}: {
  isOwner?: boolean;
  isPremium?: boolean;
  size?: number;
}) {
  if (isOwner) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 align-middle">
        <BadgeCheck
          className="text-sky-500"
          style={{ width: size, height: size }}
          aria-label="Tài khoản Bee chính thức"
        />
        <span className="rounded-full bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-sky-600 dark:text-sky-400">
          Bee
        </span>
      </span>
    );
  }
  if (isPremium) {
    return (
      <BadgeCheck
        className="shrink-0 align-middle text-sky-500"
        style={{ width: size, height: size }}
        aria-label="Tài khoản Premium"
      />
    );
  }
  return null;
}
