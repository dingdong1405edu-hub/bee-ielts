"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Heart, MessageCircle, Repeat2, Send, Loader2, ImagePlus, X, MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/brand";

/** Resize an image file to fit within maxW×maxH and return a JPEG data URL. */
async function resizeImage(file: File, maxW: number, maxH: number, quality = 0.8): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Không đọc được ảnh"));
      el.src = url;
    });
    let { width, height } = img;
    const ratio = Math.min(maxW / width, maxH / height, 1);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas không khả dụng");
    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}

interface Author {
  name: string;
  avatarUrl: string | null;
}
export interface FeedComment {
  id: string;
  content: string;
  createdAt: string;
  author: Author;
  isMine: boolean;
  replies: FeedComment[];
}
export interface FeedPost {
  id: string;
  content: string;
  imageUrl: string | null;
  createdAt: string;
  author: Author;
  isMine: boolean;
  likeCount: number;
  likedByMe: boolean;
  /** Total comments including nested replies. */
  commentCount: number;
  /** Top-level comments; nested replies live in each comment's `replies`. */
  comments: FeedComment[];
}

/** Short "time ago" label, Threads-style ("5 giờ", "3 ngày"). */
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "vừa xong";
  if (m < 60) return `${m} phút`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} ngày`;
  return new Date(iso).toLocaleDateString("vi-VN");
}

function Avatar({ author, size = 36 }: { author: Author; size?: number }) {
  return (
    <div
      className="shrink-0 overflow-hidden rounded-full bg-muted grid place-items-center ring-1 ring-border"
      style={{ width: size, height: size }}
    >
      {author.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={author.avatarUrl} alt={author.name} className="h-full w-full object-cover" />
      ) : (
        <span className="gradient-brand grid h-full w-full place-items-center text-white text-xs font-extrabold">
          {author.name.slice(0, 2).toUpperCase()}
        </span>
      )}
    </div>
  );
}

export function CommunityFeed({
  posts,
  currentUser,
}: {
  posts: FeedPost[];
  currentUser: Author;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const pickImage = async (file: File) => {
    try {
      const dataUrl = await resizeImage(file, 1280, 1280, 0.8);
      if (dataUrl.length > 1_200_000) {
        toast.error("Ảnh quá lớn, hãy chọn ảnh nhỏ hơn");
        return;
      }
      setImage(dataUrl);
    } catch {
      toast.error("Không xử lý được ảnh");
    }
  };

  const submitPost = async () => {
    if ((!draft.trim() && !image) || posting) return;
    setPosting(true);
    try {
      const res = await fetch("/api/community/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: draft.trim(), ...(image ? { imageUrl: image } : {}) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi");
      toast.success("Đã đăng bài");
      setDraft("");
      setImage(null);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Đăng thất bại");
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card">
      {/* Composer */}
      <div className="flex items-start gap-3 px-4 py-4 border-b border-border">
        <Avatar author={currentUser} />
        <div className="min-w-0 flex-1">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={1000}
            rows={2}
            placeholder="Có gì mới?"
            className="w-full resize-none bg-transparent text-[15px] text-foreground placeholder:text-muted-foreground outline-none"
          />
          {image && (
            <div className="relative mt-1 w-fit">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image} alt="preview" className="max-h-56 rounded-xl border border-border" />
              <button
                onClick={() => setImage(null)}
                className="absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-full bg-foreground text-background shadow"
                aria-label="Bỏ ảnh"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) pickImage(f);
              e.target.value = "";
            }}
          />
          <div className="mt-2 flex items-center justify-between">
            <button
              onClick={() => fileInput.current?.click()}
              className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-muted"
              aria-label="Thêm ảnh"
            >
              <ImagePlus className="h-5 w-5" />
            </button>
            <button
              onClick={submitPost}
              disabled={posting || (!draft.trim() && !image)}
              className="flex items-center gap-1.5 rounded-full bg-foreground px-4 py-1.5 text-sm font-semibold text-background disabled:opacity-40"
            >
              {posting && <Loader2 className="h-4 w-4 animate-spin" />}
              Đăng
            </button>
          </div>
        </div>
      </div>

      {/* Feed */}
      {posts.length === 0 ? (
        <EmptyState
          className="rounded-t-none border-0"
          compact
          title="Chưa có bài viết nào"
          description="Hãy là người đầu tiên chia sẻ điều gì đó với cộng đồng Bee IELTS!"
        />
      ) : (
        posts.map((p) => <PostCard key={p.id} post={p} />)
      )}
    </div>
  );
}

/** One action button in the post action row (heart / comment / repost / share). */
function ActionButton({
  icon: Icon,
  count,
  active,
  filled,
  activeClass,
  onClick,
  label,
}: {
  icon: React.ElementType;
  count?: number;
  active?: boolean;
  filled?: boolean;
  activeClass?: string;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={cn(
        "flex items-center gap-1 rounded-full px-2 py-1.5 transition-colors hover:bg-muted",
        active ? activeClass : "text-foreground",
      )}
    >
      <Icon className={cn("h-[19px] w-[19px]", filled && "fill-current")} />
      {count !== undefined && count > 0 && (
        <span className="text-[13px] text-muted-foreground">{count}</span>
      )}
    </button>
  );
}

function PostCard({ post }: { post: FeedPost }) {
  const router = useRouter();
  const [liked, setLiked] = useState(post.likedByMe);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [showComments, setShowComments] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const toggleLike = async () => {
    setLiked((v) => !v);
    setLikeCount((c) => c + (liked ? -1 : 1));
    try {
      const res = await fetch("/api/community/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setLiked((v) => !v);
      setLikeCount((c) => c + (liked ? 1 : -1));
      toast.error("Không thực hiện được");
    }
  };

  const deletePost = async () => {
    if (!confirm("Xoá bài viết này?")) return;
    setBusy(true);
    try {
      const res = await fetch("/api/community/post", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: post.id }),
      });
      if (!res.ok) throw new Error();
      toast.success("Đã xoá");
      router.refresh();
    } catch {
      toast.error("Xoá thất bại");
      setBusy(false);
    }
  };

  const submitComment = async () => {
    if (!commentDraft.trim() || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/community/comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id, content: commentDraft.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi");
      setCommentDraft("");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Bình luận thất bại");
    } finally {
      setBusy(false);
    }
  };

  const sharePost = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/community`);
      toast.success("Đã sao chép liên kết cộng đồng");
    } catch {
      toast.error("Không sao chép được");
    }
  };

  return (
    <article className="flex gap-3 px-4 py-4 border-b border-border last:border-b-0">
      <Avatar author={post.author} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-[15px] text-foreground truncate">{post.author.name}</span>
          <span className="text-[15px] text-muted-foreground">{timeAgo(post.createdAt)}</span>
          {post.isMine && (
            <button
              onClick={deletePost}
              disabled={busy}
              className="ml-auto grid h-7 w-7 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Tuỳ chọn bài viết"
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
          )}
        </div>

        {post.content && (
          <p className="mt-0.5 text-[15px] leading-normal text-foreground whitespace-pre-wrap break-words">
            {post.content}
          </p>
        )}
        {post.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.imageUrl}
            alt="post"
            className="mt-2 max-h-[430px] w-auto rounded-xl border border-border"
          />
        )}

        {/* action row */}
        <div className="mt-1.5 flex items-center gap-1 -ml-2">
          <ActionButton
            icon={Heart}
            count={likeCount}
            active={liked}
            filled={liked}
            activeClass="text-rose-500"
            onClick={toggleLike}
            label="Thích"
          />
          <ActionButton
            icon={MessageCircle}
            count={post.commentCount}
            onClick={() => setShowComments((v) => !v)}
            label="Bình luận"
          />
          <ActionButton
            icon={Repeat2}
            onClick={() => toast.info("Tính năng chia sẻ lại đang được phát triển")}
            label="Chia sẻ lại"
          />
          <ActionButton icon={Send} onClick={sharePost} label="Chia sẻ" />
        </div>

        {/* comments */}
        {showComments && (
          <div className="mt-3 space-y-3 border-t border-border pt-3">
            {post.comments.map((c) => (
              <CommentNode key={c.id} comment={c} postId={post.id} />
            ))}
            <div className="flex items-center gap-2">
              <input
                value={commentDraft}
                onChange={(e) => setCommentDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submitComment();
                  }
                }}
                maxLength={500}
                placeholder="Viết bình luận..."
                className="flex-1 rounded-full border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-border"
              />
              <button
                onClick={submitComment}
                disabled={busy || !commentDraft.trim()}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-foreground text-background disabled:opacity-40"
                aria-label="Gửi bình luận"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

/** A single comment with its nested replies. Renders recursively. */
function CommentNode({ comment, postId }: { comment: FeedComment; postId: string }) {
  const router = useRouter();
  const [replying, setReplying] = useState(false);
  const [replyDraft, setReplyDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const submitReply = async () => {
    if (!replyDraft.trim() || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/community/comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, content: replyDraft.trim(), parentId: comment.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi");
      setReplyDraft("");
      setReplying(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Trả lời thất bại");
    } finally {
      setBusy(false);
    }
  };

  const deleteComment = async () => {
    if (!confirm("Xoá bình luận này?")) return;
    try {
      const res = await fetch("/api/community/comment", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: comment.id }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      toast.error("Xoá thất bại");
    }
  };

  return (
    <div className="flex items-start gap-2">
      <Avatar author={comment.author} size={28} />
      <div className="min-w-0 flex-1">
        <div className="rounded-2xl bg-muted px-3 py-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-foreground">{comment.author.name}</span>
            <span className="text-[10px] text-muted-foreground">· {timeAgo(comment.createdAt)}</span>
            {comment.isMine && (
              <button
                onClick={deleteComment}
                className="ml-auto text-muted-foreground hover:text-rose-500"
                aria-label="Xoá bình luận"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <p className="text-sm text-foreground whitespace-pre-wrap break-words">{comment.content}</p>
        </div>

        <button
          onClick={() => setReplying((v) => !v)}
          className="mt-1 ml-3 text-[11px] font-bold text-muted-foreground hover:text-foreground"
        >
          Trả lời
        </button>

        {replying && (
          <div className="mt-2 flex items-center gap-2">
            <input
              value={replyDraft}
              onChange={(e) => setReplyDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submitReply();
                }
              }}
              autoFocus
              maxLength={500}
              placeholder={`Trả lời ${comment.author.name}...`}
              className="flex-1 rounded-full border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-border"
            />
            <button
              onClick={submitReply}
              disabled={busy || !replyDraft.trim()}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-foreground text-background disabled:opacity-40"
              aria-label="Gửi trả lời"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        )}

        {comment.replies.length > 0 && (
          <div className="mt-2 space-y-3 border-l-2 border-border pl-3">
            {comment.replies.map((r) => (
              <CommentNode key={r.id} comment={r} postId={postId} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
