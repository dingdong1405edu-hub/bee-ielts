"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Flame, Target, Clock, Sparkles, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  streakDays: number;
  streakRestoreRemaining: number;
  targetBand: number;
  weekMinutes: number;
  weekSessions: number;
};

export function StatsRow({ streakDays, streakRestoreRemaining, targetBand, weekMinutes, weekSessions }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editingBand, setEditingBand] = useState(false);
  const [bandDraft, setBandDraft] = useState(targetBand);

  const hours = Math.floor(weekMinutes / 60);
  const mins = weekMinutes % 60;

  const restoreStreak = () => {
    if (streakRestoreRemaining <= 0) {
      toast.error("Đã dùng hết lượt restore tháng này");
      return;
    }
    startTransition(async () => {
      const res = await fetch("/api/user/streak-restore", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Restore thất bại");
        return;
      }
      toast.success("Đã khôi phục streak 🔥");
      router.refresh();
    });
  };

  const saveBand = () => {
    startTransition(async () => {
      const res = await fetch("/api/user/target-band", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetBand: bandDraft }),
      });
      if (!res.ok) {
        toast.error("Lưu thất bại");
        return;
      }
      toast.success(`Target band: ${bandDraft.toFixed(1)} 🎯`);
      setEditingBand(false);
      router.refresh();
    });
  };

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {/* Streak card */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 p-5 text-white">
        <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-orange-500/20 blur-2xl" />
        <div className="relative flex items-start justify-between">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-orange-400 to-rose-500 shadow-lg shadow-orange-500/30">
            <Flame className="h-5 w-5 fill-white" />
          </div>
          <div className="text-3xl md:text-4xl font-extrabold bg-gradient-to-br from-orange-300 to-rose-400 bg-clip-text text-transparent">
            {streakDays} <span className="text-base font-bold text-orange-200">ngày</span>
          </div>
        </div>
        <div className="relative mt-4">
          <div className="font-bold">Streak</div>
          <div className="flex items-center justify-between text-xs text-slate-400 mt-0.5">
            <span>Restore còn lại: <span className="text-orange-300 font-bold">{streakRestoreRemaining}/5</span></span>
            <button
              onClick={restoreStreak}
              disabled={pending || streakRestoreRemaining <= 0}
              className="inline-flex items-center gap-1 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-40 px-2 py-1 text-[11px] font-semibold transition-colors"
            >
              <RefreshCw className="h-3 w-3" /> Restore
            </button>
          </div>
        </div>
      </div>

      {/* Target Band card */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 p-5 text-white">
        <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-violet-500/20 blur-2xl" />
        <div className="relative flex items-start justify-between">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-violet-400 to-fuchsia-500 shadow-lg shadow-violet-500/30">
            <Target className="h-5 w-5" />
          </div>
          {!editingBand ? (
            <div className="text-3xl md:text-4xl font-extrabold bg-gradient-to-br from-violet-300 to-fuchsia-400 bg-clip-text text-transparent">
              {targetBand.toFixed(1)} <span className="text-base font-bold text-violet-200">band</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="number"
                step={0.5}
                min={3}
                max={9}
                value={bandDraft}
                onChange={(e) => setBandDraft(parseFloat(e.target.value) || 0)}
                className="w-20 rounded-lg bg-slate-800 border border-slate-700 text-white text-xl font-bold px-2 py-1 text-center"
              />
            </div>
          )}
        </div>
        <div className="relative mt-4 flex items-center justify-between">
          <div>
            <div className="font-bold">Target Band</div>
            <div className="text-xs text-slate-400 mt-0.5">Định hướng lộ trình học</div>
          </div>
          {!editingBand ? (
            <button
              onClick={() => setEditingBand(true)}
              className="rounded-full bg-white/10 hover:bg-white/20 px-3 py-1 text-[11px] font-semibold transition-colors"
            >
              Sửa
            </button>
          ) : (
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => { setEditingBand(false); setBandDraft(targetBand); }} className="text-white hover:bg-white/10 h-7 px-2">
                <X className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" onClick={saveBand} disabled={pending} className="h-7 px-2 text-xs">
                Lưu
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Weekly hours card */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 p-5 text-white">
        <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-cyan-400/20 blur-2xl" />
        <div className="relative flex items-start justify-between">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 shadow-lg shadow-cyan-500/30">
            <Clock className="h-5 w-5" />
          </div>
          <div className="text-3xl md:text-4xl font-extrabold bg-gradient-to-br from-cyan-300 to-blue-400 bg-clip-text text-transparent">
            {hours > 0 ? `${hours}` : `${mins}`}
            <span className="text-base font-bold text-cyan-200 ml-1">{hours > 0 ? "giờ" : "phút"}</span>
          </div>
        </div>
        <div className="relative mt-4">
          <div className="font-bold">Tuần này</div>
          <div className="text-xs text-slate-400 mt-0.5">
            {weekSessions} session{weekSessions === 1 ? "" : "s"}
            {hours > 0 && ` · ${mins} phút thêm`}
          </div>
        </div>
      </div>

      <style jsx global>{`
        .gradient-text-streak { background: linear-gradient(135deg,#fb923c,#f43f5e); }
      `}</style>

      {pending && <span className="sr-only"><Sparkles /></span>}
    </div>
  );
}
