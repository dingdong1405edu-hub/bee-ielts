import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { CommunityFeed, type FeedPost, type FeedComment } from "./community-feed";
import { BeeLogo, Honeycomb, Leaf } from "@/components/brand";

export const dynamic = "force-dynamic";

export default async function CommunityPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const me = session.user.id;

  const meUser = await prisma.user.findUnique({
    where: { id: me },
    select: { name: true, email: true, avatarUrl: true },
  });
  const currentUser = {
    name: meUser?.name ?? meUser?.email?.split("@")[0] ?? "Bạn",
    avatarUrl: meUser?.avatarUrl ?? null,
  };

  const posts = await prisma.post.findMany({
    orderBy: { createdAt: "desc" },
    take: 60,
    include: {
      user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      likes: { select: { userId: true } },
      comments: {
        orderBy: { createdAt: "asc" },
        include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
      },
    },
  });

  const feed: FeedPost[] = posts.map((p) => {
    // Build a nested reply tree from the flat (createdAt-ordered) comment list.
    const nodes = new Map<string, FeedComment>();
    for (const c of p.comments) {
      nodes.set(c.id, {
        id: c.id,
        content: c.content,
        createdAt: c.createdAt.toISOString(),
        author: {
          name: c.user.name ?? c.user.email.split("@")[0],
          avatarUrl: c.user.avatarUrl,
        },
        isMine: c.userId === me,
        replies: [],
      });
    }
    const roots: FeedComment[] = [];
    for (const c of p.comments) {
      const node = nodes.get(c.id)!;
      const parent = c.parentId ? nodes.get(c.parentId) : null;
      if (parent) parent.replies.push(node);
      else roots.push(node);
    }

    return {
      id: p.id,
      content: p.content,
      imageUrl: p.imageUrl,
      createdAt: p.createdAt.toISOString(),
      author: {
        name: p.user.name ?? p.user.email.split("@")[0],
        avatarUrl: p.user.avatarUrl,
      },
      isMine: p.userId === me,
      likeCount: p.likes.length,
      likedByMe: p.likes.some((l) => l.userId === me),
      commentCount: p.comments.length,
      comments: roots,
    };
  });

  return (
    <div className="-m-4 min-h-screen bg-background text-foreground md:-m-8">
      <div className="mx-auto flex max-w-[1000px] gap-6 px-4">
        <main className="mx-auto w-full max-w-[600px]">
          <header className="relative my-4 overflow-hidden rounded-2xl border border-border bg-card px-4 py-3 text-center">
            <Honeycomb className="absolute inset-0 text-gold/[0.06]" />
            <h1 className="relative flex items-center justify-center gap-1.5 text-[15px] font-bold text-foreground">
              <Leaf className="h-3.5 w-3.5 text-leaf" aria-hidden />
              Trang chủ
              <Leaf className="h-3.5 w-3.5 -scale-x-100 text-leaf" aria-hidden />
            </h1>
          </header>
          <CommunityFeed posts={feed} currentUser={currentUser} />
        </main>
        <aside className="hidden w-[290px] shrink-0 py-4 lg:block">
          <div className="sticky top-20 space-y-3">
            <div className="rounded-2xl border border-border bg-card p-5 text-center shadow-sm">
              <h2 className="flex items-center justify-center gap-1.5 text-base font-bold text-foreground">
                Cộng đồng Bee IELTS
                <BeeLogo variant="bare" className="h-5 w-5 text-ink" />
              </h2>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                Xem mọi người đang học gì, hỏi đáp và động viên nhau trên hành trình
                chinh phục IELTS.
              </p>
            </div>
            <div className="px-3 text-[12px] leading-relaxed text-muted-foreground">
              © 2026 Bee IELTS · Điều khoản · Quyền riêng tư · Cookie · Báo cáo sự cố
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
