import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { effectivePremium } from "@/lib/premium";
import { CommunityFeed, type FeedPost, type FeedComment } from "./community-feed";
import { BeeLogo, Leaf } from "@/components/brand";

export const dynamic = "force-dynamic";

/** Author fields needed to compute owner/premium badges. */
const AUTHOR_SELECT = {
  id: true,
  name: true,
  email: true,
  avatarUrl: true,
  role: true,
  isPremium: true,
  premiumUntil: true,
} as const;

export default async function CommunityPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const me = session.user.id;

  const meUser = await prisma.user.findUnique({
    where: { id: me },
    select: { name: true, email: true, avatarUrl: true, role: true, canPostAsOwner: true },
  });
  // Owner profile used to render "asOwner" posts under the Bee identity even
  // when an authorised admin wrote them.
  const owner = await prisma.user.findFirst({
    where: { role: "OWNER" },
    select: { name: true, email: true, avatarUrl: true },
  });
  const ownerName = owner?.name ?? owner?.email?.split("@")[0] ?? "Bee";
  const ownerAvatar = owner?.avatarUrl ?? null;

  // Whether the composer offers the "post as Bee" toggle.
  const canPostAsOwner =
    meUser?.role === "OWNER" || (meUser?.role === "ADMIN" && meUser?.canPostAsOwner === true);

  const currentUser = {
    name: meUser?.name ?? meUser?.email?.split("@")[0] ?? "Bạn",
    avatarUrl: meUser?.avatarUrl ?? null,
  };

  const posts = await prisma.post.findMany({
    orderBy: { createdAt: "desc" },
    take: 60,
    include: {
      user: { select: AUTHOR_SELECT },
      likes: { select: { userId: true } },
      comments: {
        orderBy: { createdAt: "asc" },
        include: { user: { select: AUTHOR_SELECT } },
      },
    },
  });

  /** Resolve display name/avatar + verified badges for a post/comment author. */
  type AuthorRow = {
    name: string | null;
    email: string;
    avatarUrl: string | null;
    role: "LEARNER" | "ADMIN" | "OWNER";
    isPremium: boolean;
    premiumUntil: Date | null;
  };
  const resolveAuthor = (u: AuthorRow, official: boolean) => {
    const isOwner = official || u.role === "OWNER";
    return {
      name: isOwner ? ownerName : (u.name ?? u.email.split("@")[0]),
      avatarUrl: isOwner ? ownerAvatar : u.avatarUrl,
      isOwner,
      // Owner already carries the "Bee" badge; only show the premium tick for
      // non-owner authors. Computed live → lapses with the user's premium.
      isPremium: !isOwner && effectivePremium(u),
    };
  };

  const feed: FeedPost[] = posts.map((p) => {
    const nodes = new Map<string, FeedComment>();
    for (const c of p.comments) {
      nodes.set(c.id, {
        id: c.id,
        content: c.content,
        createdAt: c.createdAt.toISOString(),
        author: resolveAuthor(c.user, false),
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
      author: resolveAuthor(p.user, p.asOwner),
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
            <h1 className="relative flex items-center justify-center gap-1.5 text-[15px] font-bold text-foreground">
              <Leaf className="h-3.5 w-3.5 text-leaf" aria-hidden />
              Trang chủ
              <Leaf className="h-3.5 w-3.5 -scale-x-100 text-leaf" aria-hidden />
            </h1>
          </header>
          <CommunityFeed posts={feed} currentUser={currentUser} canPostAsOwner={canPostAsOwner} />
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
