import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Điều khoản dịch vụ — Bee IELTS",
  description:
    "Điều khoản dịch vụ của Bee IELTS: các quy định khi sử dụng nền tảng học IELTS.",
};

const UPDATED = "13/06/2026";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-cream text-ink">
      <div className="mx-auto max-w-3xl px-5 py-10 sm:py-14">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-bold text-ink-soft hover:text-ink transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Về trang chủ
        </Link>

        <h1 className="mt-6 font-display text-3xl sm:text-4xl font-extrabold tracking-tight">
          Điều khoản dịch vụ
        </h1>
        <p className="mt-2 text-sm text-ink-faint">Cập nhật lần cuối: {UPDATED}</p>

        <div className="mt-8 space-y-7 text-[15px] leading-relaxed text-ink-soft">
          <p>
            Bằng việc tạo tài khoản và sử dụng Bee IELTS,
            bạn đồng ý với các điều khoản dưới đây. Vui lòng đọc kỹ trước khi sử dụng.
          </p>

          <Section title="1. Tài khoản">
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Bạn chịu trách nhiệm bảo mật thông tin đăng nhập của mình.</li>
              <li>
                Thông tin đăng ký phải chính xác; mỗi người dùng nên sử dụng một tài
                khoản thật của mình.
              </li>
              <li>
                Bạn không chia sẻ tài khoản theo cách vi phạm gói dịch vụ (ví dụ tài
                khoản Premium).
              </li>
            </ul>
          </Section>

          <Section title="2. Sử dụng hợp lệ">
            <p>Khi dùng Bee IELTS, bạn đồng ý không:</p>
            <ul className="list-disc pl-5 space-y-1.5 mt-2">
              <li>Sao chép, phát tán lại nội dung bài học vì mục đích thương mại.</li>
              <li>Can thiệp, dò quét hoặc phá hoại hệ thống.</li>
              <li>Đăng nội dung vi phạm pháp luật hoặc xâm phạm quyền của người khác.</li>
            </ul>
          </Section>

          <Section title="3. Nội dung &amp; bản quyền">
            <p>
              Toàn bộ bài học, đề luyện, hình ảnh và thương hiệu của Bee thuộc quyền
              sở hữu của Bee IELTS. Nội dung do bạn tạo ra (bài viết, bản ghi âm) vẫn
              thuộc về bạn; bạn cho phép chúng tôi xử lý chúng để cung cấp dịch vụ chấm
              điểm và lưu tiến độ.
            </p>
          </Section>

          <Section title="4. Gói trả phí (Premium)">
            <p>
              Một số nội dung có thể yêu cầu tài khoản Premium. Quyền lợi và thời hạn
              được mô tả tại thời điểm bạn đăng ký. Vui lòng liên hệ chúng tôi nếu cần
              hỗ trợ về thanh toán hoặc hoàn phí.
            </p>
          </Section>

          <Section title="5. Thay đổi điều khoản">
            <p>
              Chúng tôi có thể cập nhật điều khoản theo thời gian. Khi có thay đổi quan
              trọng, chúng tôi sẽ thông báo trên nền tảng. Việc tiếp tục sử dụng đồng
              nghĩa bạn chấp nhận điều khoản mới.
            </p>
          </Section>

          <Section title="6. Liên hệ">
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Email: nguyenminhsantafe@gmail.com</li>
              <li>Zalo: 0378315088</li>
              <li>
                Facebook:{" "}
                <a
                  href="https://www.facebook.com/profile.php?id=61590634713044"
                  target="_blank"
                  rel="noopener"
                  className="font-semibold text-honey hover:underline"
                >
                  Bee IELTS
                </a>
              </li>
            </ul>
          </Section>
        </div>

        <div className="mt-10 border-t border-ink/10 pt-5 text-sm text-ink-faint">
          © 2026 Bee IELTS.{" "}
          <Link href="/privacy" className="font-semibold text-honey hover:underline">
            Chính sách bảo mật
          </Link>
        </div>
      </div>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h2 className="font-display text-lg font-extrabold tracking-tight text-ink">
        {title}
      </h2>
      {children}
    </section>
  );
}
