import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PostAsOwnerToggle } from "./post-as-owner-toggle";

export default async function AdminUsersPage() {
  const session = await auth();
  const viewer = session?.user?.id
    ? await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } })
    : null;
  const viewerIsOwner = viewer?.role === "OWNER";

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      xp: true,
      streakDays: true,
      createdAt: true,
      canPostAsOwner: true,
    },
    take: 100,
  });
  return (
    <div className="max-w-5xl space-y-4">
      <h1 className="text-2xl md:text-3xl font-bold">Users</h1>
      {viewerIsOwner && (
        <p className="text-sm text-muted-foreground">
          Bật <b>“Cho phép đăng as Bee”</b> cho một admin để họ đăng bài cộng đồng dưới danh nghĩa
          Bee (Owner) — bài sẽ có tích xanh “Bee” và gửi thông báo cho mọi người.
        </p>
      )}
      <Card>
        <CardContent className="p-0 divide-y">
          {users.map((u) => (
            <div key={u.id} className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <div className="font-medium truncate">
                  {u.name || "—"} <span className="text-muted-foreground text-sm">({u.email})</span>
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {new Date(u.createdAt).toLocaleString("vi-VN")} • XP {u.xp} • Streak {u.streakDays}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {viewerIsOwner && u.role === "ADMIN" && (
                  <PostAsOwnerToggle userId={u.id} initial={u.canPostAsOwner} />
                )}
                <Badge variant={u.role === "ADMIN" ? "default" : "secondary"}>{u.role}</Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
