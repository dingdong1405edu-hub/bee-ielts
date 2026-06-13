import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Chính sách bảo mật — Bee IELTS",
  description:
    "Chính sách bảo mật của Bee IELTS (BeeEnglish): cách chúng tôi thu thập, sử dụng và bảo vệ thông tin của bạn.",
};

const UPDATED = "13/06/2026";

export default function PrivacyPage() {
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
          Chính sách bảo mật
        </h1>
        <p className="mt-2 text-sm text-ink-faint">Cập nhật lần cuối: {UPDATED}</p>

        <div className="mt-8 space-y-7 text-[15px] leading-relaxed text-ink-soft">
          <p>
            BeeEnglish (&ldquo;Bee IELTS&rdquo;, &ldquo;chúng tôi&rdquo;) tôn trọng quyền riêng tư của
            bạn. Trang này giải thích chúng tôi thu thập, sử dụng và bảo vệ thông
            tin cá nhân như thế nào khi bạn sử dụng nền tảng học IELTS của chúng tôi.
          </p>

          <Section title="1. Thông tin chúng tôi thu thập">
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <b>Thông tin tài khoản:</b> tên, email và mật khẩu (được mã hoá) khi
                bạn đăng ký, hoặc thông tin cơ bản từ Google nếu bạn đăng nhập bằng Google.
              </li>
              <li>
                <b>Dữ liệu học tập:</b> bài làm, điểm số, lịch sử luyện tập, streak,
                XP, lộ trình học và các bản ghi âm Speaking bạn gửi để chấm.
              </li>
              <li>
                <b>Dữ liệu kỹ thuật:</b> loại thiết bị, trình duyệt và thông tin cần
                thiết để vận hành và bảo mật dịch vụ.
              </li>
            </ul>
          </Section>

          <Section title="2. Cách chúng tôi sử dụng thông tin">
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Cung cấp và cá nhân hoá trải nghiệm học tập của bạn.</li>
              <li>
                Chấm điểm Writing &amp; Speaking và đưa ra nhận xét, định hướng học tập.
              </li>
              <li>Lưu tiến độ, nhắc nhở luyện tập và gửi thông báo cần thiết.</li>
              <li>Cải thiện chất lượng nội dung và tính năng của nền tảng.</li>
            </ul>
          </Section>

          <Section title="3. Chia sẻ với bên thứ ba">
            <p>
              Chúng tôi <b>không bán</b> thông tin cá nhân của bạn. Dữ liệu chỉ được xử
              lý qua các nhà cung cấp dịch vụ giúp Bee vận hành — ví dụ hạ tầng máy
              chủ và cơ sở dữ liệu (Railway), và dịch vụ AI chấm bài (Anthropic
              Claude) chỉ để xử lý nội dung bài làm của bạn. Các bên này chỉ truy cập
              dữ liệu trong phạm vi cần thiết để cung cấp dịch vụ.
            </p>
          </Section>

          <Section title="4. Lưu trữ &amp; bảo mật">
            <p>
              Mật khẩu được băm (hash) trước khi lưu. Chúng tôi áp dụng các biện pháp
              kỹ thuật hợp lý để bảo vệ dữ liệu của bạn. Tuy nhiên, không có hệ thống
              nào an toàn tuyệt đối — vui lòng dùng mật khẩu mạnh và bảo mật tài khoản.
            </p>
          </Section>

          <Section title="5. Quyền của bạn">
            <p>
              Bạn có thể xem, cập nhật hoặc yêu cầu xoá thông tin cá nhân và tài khoản
              của mình bất cứ lúc nào. Để thực hiện, hãy liên hệ với chúng tôi qua các
              kênh bên dưới.
            </p>
          </Section>

          <Section title="6. Liên hệ">
            <p>
              Mọi thắc mắc về quyền riêng tư, vui lòng liên hệ:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 mt-2">
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
                  fb.com/BeeEnglish
                </a>
              </li>
            </ul>
          </Section>
        </div>

        <div className="mt-10 border-t border-ink/10 pt-5 text-sm text-ink-faint">
          © 2026 BeeEnglish.{" "}
          <Link href="/terms" className="font-semibold text-honey hover:underline">
            Điều khoản dịch vụ
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
