"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Loader2, Trash2, Send } from "lucide-react";

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  userId: string;
  user: { name: string | null; email: string; avatarUrl: string | null };
}

function initials(c: Comment["user"]) {
  return (c.name || c.email || "U").slice(0, 2).toUpperCase();
}

/** Comment section shown under a reading passage so learners can discuss it. */
export function ReadingComments({ testId }: { testId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);

  const load = async () => {
    try {
      const res = await fetch(`/api/reading/comment?testId=${encodeURIComponent(testId)}`);
      const data = await res.json();
      if (res.ok) {
        setComments(data.comments ?? []);
        setCurrentUserId(data.currentUserId ?? null);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testId]);

  const submit = async () => {
    const content = text.trim();
    if (!content) return;
    setPosting(true);
    try {
      const res = await fetch("/api/reading/comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testId, content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gửi bình luận thất bại");
      setText("");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Thất bại");
    } finally {
      setPosting(false);
    }
  };

  const remove = async (id: string) => {
    try {
      const res = await fetch("/api/reading/comment", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error();
      setComments((cs) => cs.filter((c) => c.id !== id));
    } catch {
      toast.error("Xoá thất bại");
    }
  };

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-primary" />
          <h3 className="font-extrabold">Bình luận{comments.length > 0 ? ` (${comments.length})` : ""}</h3>
        </div>

        {/* Composer */}
        <div className="space-y-2">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Chia sẻ cảm nhận, đặt câu hỏi về bài đọc này..."
            className="min-h-[80px]"
            maxLength={800}
          />
          <div className="flex justify-end">
            <Button onClick={submit} disabled={posting || !text.trim()} size="sm" className="rounded-full">
              {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Gửi bình luận
            </Button>
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Đang tải bình luận...
          </div>
        ) : comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có bình luận nào. Hãy là người đầu tiên!</p>
        ) : (
          <div className="space-y-3">
            {comments.map((c) => (
              <div key={c.id} className="flex gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full ring-1 ring-border">
                  {c.user.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.user.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="grid h-full w-full place-items-center gradient-brand text-white text-[11px] font-extrabold">
                      {initials(c.user)}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0 rounded-2xl border bg-muted/30 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold truncate">{c.user.name || c.user.email}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(c.createdAt).toLocaleString("vi-VN")}
                      </span>
                      {c.userId === currentUserId && (
                        <button
                          onClick={() => remove(c.id)}
                          aria-label="Xoá bình luận"
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-sm whitespace-pre-wrap break-words mt-0.5">{c.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
