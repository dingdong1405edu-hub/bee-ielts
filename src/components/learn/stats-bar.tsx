import { Heart, Flame, Zap } from "lucide-react";

export function StatsBar({ xp, hearts, streakDays }: { xp: number; hearts: number; streakDays: number }) {
  return (
    <div className="flex items-center gap-1.5 sm:gap-2 text-sm">
      <div className="flex items-center gap-1.5 rounded-full bg-gold-100 px-2.5 sm:px-3 py-1.5 font-bold text-gold-700 dark:bg-gold-500/15 dark:text-gold-300">
        <Zap className="h-4 w-4 fill-gold-500 text-gold-500" />
        <span>{xp}</span>
      </div>
      <div className="flex items-center gap-1.5 rounded-full bg-gradient-to-br from-gold-100 to-rose-100 px-2.5 sm:px-3 py-1.5 font-bold text-rose-700 dark:from-gold-500/15 dark:to-rose-500/15 dark:text-rose-300">
        <Flame className="h-4 w-4 fill-rose-500 text-rose-600" />
        <span>{streakDays}</span>
      </div>
      <div className="flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 sm:px-3 py-1.5 font-bold text-red-700 dark:bg-red-500/15 dark:text-red-300">
        <Heart className="h-4 w-4 fill-red-500 text-red-500" />
        <span>{hearts}</span>
      </div>
    </div>
  );
}
