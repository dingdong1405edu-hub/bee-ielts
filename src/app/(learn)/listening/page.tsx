import Link from "next/link";
import { Headphones, Construction, Sparkles, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default function ListeningMaintenancePage() {
  return (
    <div className="max-w-xl mx-auto py-10">
      <Card className="border-2 border-amber-200 dark:border-amber-900/50 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20">
        <CardContent className="p-8 text-center space-y-5">
          {/* Maintenance illustration */}
          <div className="relative mx-auto h-24 w-24">
            <div className="absolute inset-0 grid place-items-center rounded-3xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-orange-500/30">
              <Headphones className="h-12 w-12" />
            </div>
            <div className="absolute -bottom-2 -right-2 grid h-10 w-10 place-items-center rounded-2xl bg-white text-orange-500 shadow-md ring-2 ring-amber-200 dark:bg-zinc-900 dark:ring-amber-900/50">
              <Construction className="h-5 w-5" />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-extrabold tracking-tight">
              Phần Listening đang được nâng cấp 🛠️
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
              Rất xin lỗi bạn! Tụi mình đang dọn dẹp và hoàn thiện phần luyện nghe để
              mang lại trải nghiệm tốt hơn. Hãy quay lại sau một chút nhé — cảm ơn bạn
              đã kiên nhẫn 💛
            </p>
          </div>

          <div className="rounded-xl border bg-card/60 p-4 text-sm text-muted-foreground flex items-start gap-2 text-left">
            <Sparkles className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <span>
              Trong lúc chờ đợi, bạn có thể luyện <strong>Reading</strong>,{" "}
              <strong>Writing</strong> hoặc <strong>Speaking</strong> để giữ streak nhé!
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Button asChild variant="brand" size="lg" className="rounded-full">
              <Link href="/dashboard">
                <ArrowLeft className="h-4 w-4" /> Về trang chủ
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="rounded-full">
              <Link href="/speaking">Luyện Speaking</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
