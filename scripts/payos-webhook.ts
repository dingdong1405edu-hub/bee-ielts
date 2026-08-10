/**
 * Đăng ký (confirm) webhook URL với PayOS, và kiểm tra credentials.
 *
 *   npx tsx scripts/payos-webhook.ts                       # dùng NEXT_PUBLIC_APP_URL
 *   npx tsx scripts/payos-webhook.ts https://beeielts.com/api/payment/webhook
 *
 * PayOS sẽ POST thử vào URL này; nếu endpoint không trả 2xx thì việc đăng ký
 * thất bại. Vì vậy phải DEPLOY code mới lên production TRƯỚC khi chạy script.
 *
 * Chạy lại bất cứ lúc nào cũng an toàn (idempotent).
 */
import { readFileSync } from "fs";
import path from "path";

function loadEnvLocal() {
  const file = path.join(process.cwd(), ".env.local");
  let raw = "";
  try {
    raw = readFileSync(file, "utf8");
  } catch {
    return;
  }
  for (const line of raw.split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/i.exec(line);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}
loadEnvLocal();

async function main() {
  const { PayOS } = await import("@payos/node");

  const missing = ["PAYOS_CLIENT_ID", "PAYOS_API_KEY", "PAYOS_CHECKSUM_KEY"].filter(
    (k) => !process.env[k],
  );
  if (missing.length) {
    console.error("❌ Thiếu env:", missing.join(", "));
    process.exit(1);
  }

  const base = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/+$/, "");
  const url = process.argv[2] || (base ? `${base}/api/payment/webhook` : "");
  if (!url) {
    console.error("❌ Truyền webhook URL vào tham số, hoặc đặt NEXT_PUBLIC_APP_URL.");
    process.exit(1);
  }
  if (/localhost|127\.0\.0\.1/.test(url)) {
    console.error("❌ PayOS không gọi được localhost — cần URL public (https://beeielts.com/...).");
    process.exit(1);
  }

  const payos = new PayOS({
    clientId: process.env.PAYOS_CLIENT_ID!,
    apiKey: process.env.PAYOS_API_KEY!,
    checksumKey: process.env.PAYOS_CHECKSUM_KEY!,
  });

  console.log("→ Đăng ký webhook:", url);
  try {
    const res = await payos.webhooks.confirm(url);
    console.log("✅ Đã đăng ký webhook thành công.");
    console.log("   Tài khoản nhận:", res.accountName, "-", res.accountNumber);
    console.log("   Ngân hàng:", res.name, `(${res.shortName})`);
  } catch (e) {
    console.error("❌ Đăng ký thất bại:", e instanceof Error ? e.message : e);
    console.error(
      "   Kiểm tra: đã deploy code mới chưa, URL có trả 200 khi POST không, domain có HTTPS không.",
    );
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});
