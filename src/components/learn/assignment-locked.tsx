"use client";

/** Shown when a scheduled assignment hasn't opened yet (openAt in the future). */
import { Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function AssignmentLocked({
  title,
  className,
  openAt,
}: {
  title: string;
  className: string;
  openAt: string | null;
}) {
  const when = openAt
    ? new Date(openAt).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : null;
  return (
    <Card className="mx-auto mt-10 max-w-md">
      <CardContent className="space-y-3 p-8 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-muted">
          <Lock className="h-7 w-7 text-muted-foreground" />
        </div>
        <h2 className="text-lg font-bold">Bài chưa mở</h2>
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{title}</span>
          {className ? ` · ${className}` : ""}
        </p>
        {when && (
          <p className="text-sm">
            Bài sẽ mở lúc <span className="font-bold text-primary">{when}</span>. Quay lại sau nhé!
          </p>
        )}
      </CardContent>
    </Card>
  );
}
