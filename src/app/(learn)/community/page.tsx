import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { CommunityFeed, type FeedPost, type FeedComment } from "./community-feed";

export const dynamic = "force-dynamic";

export default async function CommunityPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const me = session.user.id;

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
    <div className="max-w-2xl mx-auto">
      {/* Solid black backdrop for the community page — covers the ambient orbs. */}
      <div aria-hidden className="fixed inset-0 bg-black" style={{ zIndex: -9 }} />
      <div className="mb-4">
        <h1 className="text-2xl font-extrabold tracking-tight">Cộng đồng 🐝</h1>
        <p className="text-sm text-muted-foreground">
          Nơi học viên trao đổi, hỏi đáp và động viên nhau. Hãy giữ lời lẽ lịch sự —
          nội dung thô tục sẽ bị chặn tự động.
        </p>
      </div>
      <CommunityFeed posts={feed} />
    </div>
  );
}
