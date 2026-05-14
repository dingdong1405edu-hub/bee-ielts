import { Heart, Flame, Trophy } from "lucide-react";

export function StatsBar({ xp, hearts, streakDays }: { xp: number; hearts: number; streakDays: number }) {
  return (
    <div className="flex items-center gap-2 sm:gap-4 text-sm">
      <div className="flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 font-medium">
        <Trophy className="h-4 w-4 text-yellow-500" />
        <span>{xp} XP</span>
      </div>
      <div className="flex items-center gap-1.5 rounded-full bg-orange-100 dark:bg-orange-950 px-3 py-1.5 font-medium text-orange-700 dark:text-orange-300">
        <Flame className="h-4 w-4" />
        <span>{streakDays}</span>
      </div>
      <div className="flex items-center gap-1.5 rounded-full bg-red-100 dark:bg-red-950 px-3 py-1.5 font-medium text-red-700 dark:text-red-300">
        <Heart className="h-4 w-4 fill-current" />
        <span>{hearts}</span>
      </div>
    </div>
  );
}
