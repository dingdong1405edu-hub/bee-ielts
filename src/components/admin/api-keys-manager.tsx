"use client";

/**
 * ApiKeysManager — OWNER tool to see which AI keys are alive/expired and replace
 * them IN THE APP (stored in DB, overriding the Railway env) without redeploying.
 * The full key is never shown — only a masked hint. Editing a key only sends the
 * new value up; it never downloads a stored key.
 */
import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, Loader2, ExternalLink, KeyRound, Save, Trash2, Beaker } from "lucide-react";
import type { KeyStatus, Provider } from "@/lib/api-keys";

type TestResult = { ok: boolean; status: number; detail: string };

export function ApiKeysManager({ initial }: { initial: KeyStatus[] }) {
  const [providers, setProviders] = useState<KeyStatus[]>(initial);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<Record<string, "test" | "save" | "clear" | null>>({});
  const [result, setResult] = useState<Record<string, TestResult | null>>({});

  const setBusyFor = (p: string, v: "test" | "save" | "clear" | null) => setBusy((b) => ({ ...b, [p]: v }));

  const test = async (provider: Provider, useDraft: boolean) => {
    setBusyFor(provider, "test");
    setResult((r) => ({ ...r, [provider]: null }));
    try {
      const key = useDraft ? (draft[provider] ?? "").trim() : undefined;
      const res = await fetch("/api/admin/api-keys/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, key }),
      });
      const data = (await res.json()) as TestResult & { error?: string };
      if (!res.ok) throw new Error(data.error || "Không kiểm tra được");
      setResult((r) => ({ ...r, [provider]: { ok: data.ok, status: data.status, detail: data.detail } }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi kiểm tra khoá");
    } finally {
      setBusyFor(provider, null);
    }
  };

  const mutate = async (provider: Provider, action: "set" | "clear") => {
    const value = (draft[provider] ?? "").trim();
    if (action === "set" && value.length < 8) return toast.error("Dán khoá mới vào ô trước đã");
    setBusyFor(provider, action === "set" ? "save" : "clear");
    try {
      const res = await fetch("/api/admin/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, action, value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không lưu được");
      setProviders(data.providers as KeyStatus[]);
      setDraft((d) => ({ ...d, [provider]: "" }));
      setResult((r) => ({ ...r, [provider]: null }));
      toast.success(action === "set" ? "Đã lưu khoá mới (ưu tiên dùng khoá này)" : "Đã xoá — dùng lại khoá env trên Railway");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi khi lưu");
    } finally {
      setBusyFor(provider, null);
    }
  };

  return (
    <div className="space-y-4">
      {providers.map((p) => {
        const b = busy[p.provider];
        const r = result[p.provider];
        return (
          <Card key={p.provider}>
            <CardContent className="space-y-3 p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <KeyRound className="h-4 w-4 text-primary" />
                    <h3 className="font-bold">{p.label}</h3>
                    <SourceBadge status={p} />
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{p.used}</p>
                </div>
                <a
                  href={p.console}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  Lấy/đổi khoá <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-muted-foreground">Khoá hiện tại:</span>
                {p.masked ? (
                  <code className="rounded bg-muted px-2 py-0.5 font-mono text-xs">{p.masked}</code>
                ) : (
                  <span className="text-xs font-semibold text-destructive">chưa cấu hình</span>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 rounded-lg"
                  disabled={!!b || (!p.masked)}
                  onClick={() => test(p.provider as Provider, false)}
                >
                  {b === "test" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Beaker className="h-3.5 w-3.5" />}
                  Kiểm tra còn sống
                </Button>
              </div>

              {r && (
                <div
                  className={cn(
                    "flex items-start gap-2 rounded-lg border p-2.5 text-sm",
                    r.ok
                      ? "border-leaf/40 bg-leaf/5 text-leaf"
                      : "border-destructive/40 bg-destructive/10 text-destructive",
                  )}
                >
                  {r.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0" />}
                  <span>{r.detail}</span>
                </div>
              )}

              <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
                <label className="text-xs font-semibold text-muted-foreground">
                  Thay khoá mới (lưu vào app, ưu tiên hơn env — không cần Redeploy):
                </label>
                <div className="flex flex-wrap gap-2">
                  <Input
                    type="password"
                    value={draft[p.provider] ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, [p.provider]: e.target.value }))}
                    placeholder={`Dán khoá ${p.label} mới…`}
                    className="h-9 flex-1 min-w-[220px] font-mono text-sm"
                    autoComplete="off"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-9 rounded-lg"
                    disabled={!!b || !(draft[p.provider] ?? "").trim()}
                    onClick={() => test(p.provider as Provider, true)}
                  >
                    {b === "test" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Beaker className="h-4 w-4" />} Thử khoá này
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="brand"
                    className="h-9 rounded-lg"
                    disabled={!!b || !(draft[p.provider] ?? "").trim()}
                    onClick={() => mutate(p.provider as Provider, "set")}
                  >
                    {b === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Lưu
                  </Button>
                </div>
                {p.hasOverride && (
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="text-[11px] text-muted-foreground">
                      Đang dùng khoá lưu trong app{p.updatedAt ? ` · cập nhật ${new Date(p.updatedAt).toLocaleString("vi-VN")}` : ""}.
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 rounded-lg text-muted-foreground hover:text-destructive"
                      disabled={!!b}
                      onClick={() => mutate(p.provider as Provider, "clear")}
                    >
                      {b === "clear" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} Xoá, dùng lại env
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function SourceBadge({ status }: { status: KeyStatus }) {
  if (status.source === "db")
    return <Badge variant="outline" className="border-leaf/50 text-leaf">Khoá trong app</Badge>;
  if (status.source === "env")
    return <Badge variant="outline" className="text-muted-foreground">Khoá env (Railway)</Badge>;
  return <Badge variant="outline" className="border-destructive/50 text-destructive">Chưa có khoá</Badge>;
}
