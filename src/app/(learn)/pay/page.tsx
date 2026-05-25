import { Wallet } from "lucide-react";
import { PayForm } from "./pay-form";

export const dynamic = "force-dynamic";

export default function PayPage() {
  return (
    <div className="max-w-md mx-auto py-10 space-y-6">
      <div className="text-center space-y-3">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl gradient-brand text-white shadow-lg shadow-primary/30">
          <Wallet className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">Thanh toán</h1>
        <p className="text-muted-foreground text-sm">
          Nhập số tiền và mô tả đơn — chuyển sang PayOS để hoàn tất.
        </p>
      </div>
      <PayForm />
    </div>
  );
}
