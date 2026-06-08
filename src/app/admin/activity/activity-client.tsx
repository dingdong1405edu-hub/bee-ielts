"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Activity,
  BookOpen,
  Headphones,
  PenLine,
  Mic,
  TrendingUp,
  Brain,
  Sparkles,
  BookOpenText,
  Music,
  Volume2,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  ExternalLink,
} from "lucide-react";

interface ActivityRow {
  id: string;
  userId: string | null;
  userEmail: string;
  userName: string | null;
  action: string;
  entityType: string;
  entityId: string;
  entityTitle: string;
  entityHref: string | null;
  createdAt: string;
}

interface AdminLite {
  email: string;
  name: string | null;
}

const ENTITY_META: Record<
  string,
  { label: string; icon: React.ElementType; tone: string }
> = {
  READING_TEST: { label: "Reading", icon: BookOpen, tone: "bg-sage-100 text-sage-700" },
  LISTENING_TEST: { label: "Listening", icon: Headphones, tone: "bg-gold-100 text-gold-700" },
  WRITING_TASK: { label: "Writing", icon: PenLine, tone: "bg-rose-100 text-rose-700" },
  SPEAKING_SET: { label: "Speaking", icon: Mic, tone: "bg-honey-tint text-honey-deep" },
  BAND_STAGE: { label: "Vượt band", icon: TrendingUp, tone: "bg-leaf-tint text-leaf-deep" },
  MINI_QUIZ: { label: "Mini-quiz", icon: Brain, tone: "bg-honey-tint text-honey-deep" },
  VOCAB_UNIT: { label: "Vocab unit", icon: Sparkles, tone: "bg-leaf-tint text-leaf-deep" },
  VOCAB_LESSON: { label: "Vocab lesson", icon: Sparkles, tone: "bg-leaf-tint text-leaf-deep" },
  GRAMMAR_UNIT: { label: "Grammar unit", icon: BookOpenText, tone: "bg-honey-tint text-honey-deep" },
  GRAMMAR_LESSON: { label: "Grammar lesson", icon: BookOpenText, tone: "bg-honey-tint text-honey-deep" },
  BACKGROUND_MUSIC: { label: "Nhạc nền", icon: Music, tone: "bg-honey-tint text-honey-deep" },
  SPEAKING_VOICE: { label: "Giọng đọc", icon: Volume2, tone: "bg-honey-tint text-honey-deep" },
};

const ACTION_META: Record<string, { label: string; tone: string }> = {
  CREATE: { label: "Tạo mới", tone: "bg-sage-500 text-white" },
  UPDATE: { label: "Cập nhật", tone: "bg-gold-500 text-gold-950" },
  DELETE: { label: "Xoá", tone: "bg-rose-500 text-white" },
};

const ENTITY_OPTIONS = Object.entries(ENTITY_META).map(([value, meta]) => ({
  value,
  label: meta.label,
}));

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s trước`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} phút trước`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} giờ trước`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day} ngày trước`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo} tháng trước`;
  return `${Math.floor(mo / 12)} năm trước`;
}

function absoluteTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ActivityClient({
  rows,
  total,
  page,
  totalPages,
  filters,
  admins,
}: {
  rows: ActivityRow[];
  total: number;
  page: number;
  totalPages: number;
  filters: { entityType?: string; action?: string; userEmail?: string };
  admins: AdminLite[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    router.push(`/admin/activity?${params.toString()}`);
  };

  const goToPage = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    router.push(`/admin/activity?${params.toString()}`);
  };

  const clearFilters = () => {
    router.push("/admin/activity");
  };

  const hasFilters = Boolean(filters.entityType || filters.action || filters.userEmail);

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Activity className="h-7 w-7 text-honey-deep" /> Hoạt động admin
          </h1>
          <p className="text-muted-foreground text-sm">
            Theo dõi ai tạo / sửa / xoá bài, đề, quiz — tổng <strong>{total}</strong> mục.
          </p>
        </div>
        {hasFilters && (
          <Button variant="outline" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4" /> Xoá bộ lọc
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-sm font-semibold mb-3 text-muted-foreground">
            <Filter className="h-4 w-4" /> Bộ lọc
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Loại nội dung
              </label>
              <select
                value={filters.entityType ?? ""}
                onChange={(e) => updateFilter("entityType", e.target.value)}
                className="w-full rounded-lg border bg-card px-3 py-2 text-sm"
              >
                <option value="">Tất cả</option>
                {ENTITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Hành động
              </label>
              <select
                value={filters.action ?? ""}
                onChange={(e) => updateFilter("action", e.target.value)}
                className="w-full rounded-lg border bg-card px-3 py-2 text-sm"
              >
                <option value="">Tất cả</option>
                <option value="CREATE">Tạo mới</option>
                <option value="UPDATE">Cập nhật</option>
                <option value="DELETE">Xoá</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Admin
              </label>
              <select
                value={filters.userEmail ?? ""}
                onChange={(e) => updateFilter("userEmail", e.target.value)}
                className="w-full rounded-lg border bg-card px-3 py-2 text-sm"
              >
                <option value="">Tất cả</option>
                {admins.map((a) => (
                  <option key={a.email} value={a.email}>
                    {a.name ? `${a.name} (${a.email})` : a.email}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-muted/30 p-10 text-center text-muted-foreground">
          {hasFilters
            ? "Không có hoạt động nào khớp bộ lọc."
            : "Chưa có hoạt động nào — admin chưa tạo / sửa / xoá nội dung."}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 border-b">
                  <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-3 font-semibold">Thời gian</th>
                    <th className="px-4 py-3 font-semibold">Admin</th>
                    <th className="px-4 py-3 font-semibold">Hành động</th>
                    <th className="px-4 py-3 font-semibold">Loại</th>
                    <th className="px-4 py-3 font-semibold">Nội dung</th>
                    <th className="px-4 py-3 font-semibold w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const entityMeta = ENTITY_META[r.entityType] ?? {
                      label: r.entityType,
                      icon: Activity,
                      tone: "bg-muted text-foreground",
                    };
                    const actionMeta = ACTION_META[r.action] ?? {
                      label: r.action,
                      tone: "bg-muted text-foreground",
                    };
                    const Icon = entityMeta.icon;
                    return (
                      <tr key={r.id} className="border-b last:border-b-0 hover:bg-muted/20">
                        <td className="px-4 py-3 align-top">
                          <div className="text-sm font-medium" title={absoluteTime(r.createdAt)}>
                            {relativeTime(r.createdAt)}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {absoluteTime(r.createdAt)}
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="text-sm font-medium truncate max-w-[200px]">
                            {r.userName ?? r.userEmail.split("@")[0]}
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate max-w-[200px]">
                            {r.userEmail}
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <span
                            className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider ${actionMeta.tone}`}
                          >
                            {actionMeta.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <span
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ${entityMeta.tone}`}
                          >
                            <Icon className="h-3 w-3" /> {entityMeta.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="text-sm font-medium max-w-[420px] truncate" title={r.entityTitle}>
                            {r.entityTitle}
                          </div>
                          <div className="text-[11px] text-muted-foreground font-mono truncate max-w-[420px]">
                            {r.entityId}
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top text-right">
                          {r.entityHref && r.action !== "DELETE" ? (
                            <Link
                              href={r.entityHref}
                              className="inline-grid h-8 w-8 place-items-center rounded-md border hover:bg-muted text-muted-foreground"
                              title="Mở"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground">
            Trang {page} / {totalPages}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => goToPage(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" /> Trước
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => goToPage(page + 1)}
            >
              Tiếp <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
