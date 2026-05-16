"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Heart, MessageCircle, Trash2, Loader2, Send, ShieldCheck, ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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
interface FeedComment {
  id: string;
  content: string;
  createdAt: string;
  author: Author;
  isMine: boolean;
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
  comments: FeedComment[];
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "vừa xong";
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} ngày trước`;
  return new Date(iso).toLocaleDateString("vi-VN");
}

function Avatar({ author, size = 40 }: { author: Author; size?: number }) {
  return (
    <div
      className="shrink-0 overflow-hidden rounded-full bg-muted grid place-items-center"
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

export function CommunityFeed({ posts }: { posts: FeedPost[] }) {
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
    <div className="space-y-4">
      {/* Composer */}
      <Card>
        <CardContent className="p-4">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={1000}
            rows={3}
            placeholder="Bạn đang nghĩ gì? Chia sẻ tiến độ học, đặt câu hỏi..."
            className="w-full resize-none rounded-lg border-2 bg-background px-3 py-2 text-sm"
          />
          {image && (
            <div className="relative mt-2 w-fit">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image} alt="preview" className="max-h-56 rounded-lg border" />
              <button
                onClick={() => setImage(null)}
                className="absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-full bg-zinc-900 text-white shadow"
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
          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <button
                onClick={() => fileInput.current?.click()}
                className="flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold text-muted-foreground hover:border-primary hover:text-primary transition-colors"
              >
                <ImagePlus className="h-3.5 w-3.5" /> Ảnh
              </button>
              <span className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                Lọc từ thô tục & duyệt ảnh AI
              </span>
            </div>
            <Button
              onClick={submitPost}
              disabled={posting || (!draft.trim() && !image)}
              variant="brand"
              size="sm"
              className="rounded-full shrink-0"
            >
              {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Đăng
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Feed */}
      {posts.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            Chưa có bài viết nào. Hãy là người đầu tiên chia sẻ! 🐝
          </CardContent>
        </Card>
      ) : (
        posts.map((p) => <PostCard key={p.id} post={p} />)
      )}
    </div>
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
    // optimistic
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
      // revert
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

  const deleteComment = async (id: string) => {
    if (!confirm("Xoá bình luận này?")) return;
    try {
      const res = await fetch("/api/community/comment", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      toast.error("Xoá thất bại");
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar author={post.author} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm truncate">{post.author.name}</span>
              <span className="text-xs text-muted-foreground">· {timeAgo(post.createdAt)}</span>
              {post.isMine && (
                <button
                  onClick={deletePost}
                  disabled={busy}
                  className="ml-auto text-muted-foreground hover:text-destructive"
                  aria-label="Xoá bài"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
            {post.content && (
              <p className="mt-1 text-sm whitespace-pre-wrap break-words">{post.content}</p>
            )}
            {post.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={post.imageUrl}
                alt="post"
                className="mt-2 max-h-[420px] w-auto rounded-xl border"
              />
            )}

            {/* actions */}
            <div className="mt-3 flex items-center gap-4">
              <button
                onClick={toggleLike}
                className={cn(
                  "flex items-center gap-1.5 text-sm font-semibold transition-colors",
                  liked ? "text-rose-500" : "text-muted-foreground hover:text-rose-500",
                )}
              >
                <Heart className={cn("h-4 w-4", liked && "fill-rose-500")} />
                {likeCount > 0 && likeCount}
              </button>
              <button
                onClick={() => setShowComments((v) => !v)}
                className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-primary"
              >
                <MessageCircle className="h-4 w-4" />
                {post.comments.length > 0 && post.comments.length}
              </button>
            </div>

            {/* comments */}
            {showComments && (
              <div className="mt-3 space-y-3 border-t pt-3">
                {post.comments.map((c) => (
                  <div key={c.id} className="flex items-start gap-2">
                    <Avatar author={c.author} size={28} />
                    <div className="min-w-0 flex-1 rounded-2xl bg-muted/50 px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold">{c.author.name}</span>
                        <span className="text-[10px] text-muted-foreground">· {timeAgo(c.createdAt)}</span>
                        {c.isMine && (
                          <button
                            onClick={() => deleteComment(c.id)}
                            className="ml-auto text-muted-foreground hover:text-destructive"
                            aria-label="Xoá bình luận"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                      <p className="text-sm whitespace-pre-wrap break-words">{c.content}</p>
                    </div>
                  </div>
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
                    className="flex-1 rounded-full border-2 bg-background px-3 py-1.5 text-sm"
                  />
                  <Button
                    onClick={submitComment}
                    disabled={busy || !commentDraft.trim()}
                    size="sm"
                    variant="brand"
                    className="rounded-full shrink-0"
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
