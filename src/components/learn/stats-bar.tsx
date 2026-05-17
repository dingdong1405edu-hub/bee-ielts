import { Heart, Flame, Zap } from "lucide-react";

export function StatsBar({ xp, hearts, streakDays }: { xp: number; hearts: number; streakDays: number }) {
  return (
    <div className="flex items-center gap-1.5 sm:gap-2 text-sm">
      <div className="flex items-center gap-1.5 rounded-full bg-yellow-100 px-2.5 sm:px-3 py-1.5 font-bold text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-300">
        <Zap className="h-4 w-4 fill-yellow-500 text-yellow-500" />
        <span>{xp}</span>
      </div>
      <div className="flex items-center gap-1.5 rounded-full bg-orange-100 px-2.5 sm:px-3 py-1.5 font-bold text-orange-700 dark:bg-orange-500/15 dark:text-orange-300">
        <Flame className="h-4 w-4 fill-orange-500 text-orange-500" />
        <span>{streakDays}</span>
      </div>
      <div className="flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 sm:px-3 py-1.5 font-bold text-red-700 dark:bg-red-500/15 dark:text-red-300">
        <Heart className="h-4 w-4 fill-red-500 text-red-500" />
        <span>{hearts}</span>
      </div>
    </div>
  );
}
