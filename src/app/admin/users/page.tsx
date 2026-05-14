import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, name: true, role: true, xp: true, streakDays: true, createdAt: true },
    take: 100,
  });
  return (
    <div className="max-w-5xl space-y-4">
      <h1 className="text-2xl md:text-3xl font-bold">Users</h1>
      <Card>
        <CardContent className="p-0 divide-y">
          {users.map((u) => (
            <div key={u.id} className="flex items-center justify-between p-4">
              <div>
                <div className="font-medium">{u.name || "—"} <span className="text-muted-foreground text-sm">({u.email})</span></div>
                <div className="text-xs text-muted-foreground">{new Date(u.createdAt).toLocaleString("vi-VN")} • XP {u.xp} • Streak {u.streakDays}</div>
              </div>
              <Badge variant={u.role === "ADMIN" ? "default" : "secondary"}>{u.role}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
