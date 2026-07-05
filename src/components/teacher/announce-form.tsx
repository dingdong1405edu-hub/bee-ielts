"use client";

/**
 * AnnounceForm — teacher composes a notification and sends it to a class (or all
 * classes). Posts to /api/teacher/notify; each student sees it in their bell.
 */
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { playSuccessSfx } from "@/lib/quiz-sfx";

export function AnnounceForm({ classes }: { classes: { id: string; name: string }[] }) {
  const [target, setTarget] = useState("ALL"); // "ALL" | classId
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!message.trim()) return toast.error("Nhập nội dung thông báo");
    setSending(true);
    try {
      const res = await fetch("/api/teacher/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: target === "ALL" ? undefined : target,
          title: title.trim() || undefined,
          message: message.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không gửi được");
      playSuccessSfx();
      toast.success(data.sent > 0 ? `Đã gửi tới ${data.sent} học sinh` : data.message || "Không có học sinh để gửi");
      setTitle("");
      setMessage("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi khi gửi thông báo");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold">Gửi thông báo</h1>
        <p className="text-sm text-muted-foreground">
          Thông báo sẽ hiện trong chuông của học sinh.
        </p>
      </header>

      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="space-y-1.5">
            <Label htmlFor="target">Gửi tới</Label>
            <select
              id="target"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            >
              <option value="ALL">Tất cả các lớp của tôi</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="title">Tiêu đề (tuỳ chọn)</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Nhắc nộp bài Reading"
              maxLength={140}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="msg">Nội dung</Label>
            <Textarea
              id="msg"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder="VD: Các em nhớ hoàn thành bài trước 21h tối nay nhé!"
              maxLength={2000}
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={send} disabled={sending} variant="brand" className="rounded-full min-w-[160px]">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4" /> Gửi thông báo</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      {classes.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Bạn chưa có lớp nào — tạo lớp ở tab “Lớp học” trước nhé.
        </p>
      )}
    </div>
  );
}
