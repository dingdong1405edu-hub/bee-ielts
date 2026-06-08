import { Heart, Flame, Zap } from "lucide-react";

export function StatsBar({ xp, hearts, streakDays }: { xp: number; hearts: number; streakDays: number }) {
  return (
    <div className="flex items-center gap-1.5 sm:gap-2 text-sm">
      <div className="flex items-center gap-1.5 rounded-full border-2 border-gold-200 bg-gold-100 px-2.5 sm:px-3 py-1 font-extrabold text-gold-700 dark:border-gold-500/30 dark:bg-gold-500/15 dark:text-gold-300">
        <Zap className="h-4 w-4 fill-gold-500 text-gold-500" />
        <span>{xp}</span>
      </div>
      <div className="flex items-center gap-1.5 rounded-full border-2 border-orange-200 bg-orange-100 px-2.5 sm:px-3 py-1 font-extrabold text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/15 dark:text-orange-300">
        <Flame className="h-4 w-4 fill-orange-500 text-orange-600" />
        <span>{streakDays}</span>
      </div>
      <div className="flex items-center gap-1.5 rounded-full border-2 border-red-200 bg-red-100 px-2.5 sm:px-3 py-1 font-extrabold text-red-700 dark:border-red-500/30 dark:bg-red-500/15 dark:text-red-300">
        <Heart className="h-4 w-4 fill-red-500 text-red-500" />
        <span>{hearts}</span>
      </div>
    </div>
  );
}
