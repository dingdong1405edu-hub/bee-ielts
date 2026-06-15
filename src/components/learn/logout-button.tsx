"use client";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import { LogOut, Loader2 } from "lucide-react";

/**
 * Logout trigger with a confirmation step. Clicking it opens a small centred
 * "Bạn có chắc muốn đăng xuất?" dialog instead of signing out immediately, so
 * a stray tap on the door icon doesn't kick the user out of their account.
 *
 * Renders its own <button> styled by `className` (so the desktop top-nav icon
 * button and the mobile sheet tile can each keep their own look) and wraps the
 * confirm dialog. Hand-rolled overlay — the project has no Radix Dialog and we
 * don't pull in a new dependency for one prompt.
 */
export function LogoutButton({
  className,
  title,
  ariaLabel,
  children,
}: {
  className?: string;
  title?: string;
  ariaLabel?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  // While the dialog is open: lock background scroll, focus the confirm
  // button, close on Escape, and restore focus to the trigger on close.
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
      triggerRef.current?.focus();
    };
  }, [open, loading]);

  const confirm = async () => {
    setLoading(true);
    // signOut redirects to callbackUrl, so we don't reset loading afterwards.
    await signOut({ callbackUrl: "/" });
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        title={title}
        aria-label={ariaLabel}
        className={className}
      >
        {children}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="logout-confirm-title"
        >
          <div
            className="absolute inset-0 bg-black/45 backdrop-blur-sm"
            onClick={() => !loading && setOpen(false)}
          />
          <div className="relative w-full max-w-sm rounded-2xl border border-border bg-background p-5 shadow-2xl">
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-destructive/10 text-destructive">
                <LogOut className="h-5 w-5" />
              </span>
              <div className="flex-1 pt-0.5">
                <h2 id="logout-confirm-title" className="text-base font-extrabold">
                  Đăng xuất tài khoản?
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Bạn có chắc muốn đăng xuất khỏi tài khoản này không?
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={loading}
                className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
              >
                Huỷ
              </button>
              <button
                ref={confirmRef}
                type="button"
                onClick={confirm}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground transition-[filter] hover:brightness-95 disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
