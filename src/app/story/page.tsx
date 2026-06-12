import Link from "next/link";
import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { ScrollReveal } from "@/components/scroll-reveal";
import { ReadingProgress } from "./reading-progress";

export const metadata: Metadata = {
  title: "Ong Bee và Khu Vườn Ngàn Tiếng Nói — Bài viết của Bee",
  description:
    "Một câu chuyện cổ tích về chú ong nhỏ chăm chỉ, lấy cảm hứng cho hành trình học tiếng Anh cùng BeeEnglish.",
};

// The tale, paragraph by paragraph. Kept as data so the layout stays clean.
const PARAS = [
  "Ngày xửa ngày xưa, ở một thung lũng nơi nắng rót xuống vàng óng như mật, có một tổ ong nhỏ nép mình bên sườn đồi. Trong tổ ấy có chú ong tên Bee — bé nhất đàn, đôi cánh còn mỏng tang, nhưng trái tim thì đầy ắp ước mơ.",
  "Khu vườn quanh tổ chẳng giống bất kỳ khu vườn nào. Ở đó, mỗi bông hoa chỉ chịu hé nở khi nghe đúng “tiếng nói” của riêng mình — có đoá thích một lời chào buổi sớm, có đoá chỉ mở cánh khi được nghe kể chuyện, có đoá ngủ vùi cho tới khi ai đó gọi tên nó bằng thứ ngôn ngữ của gió. Chú ong nào hiểu càng nhiều tiếng nói, chú ong ấy hút được càng nhiều mật.",
  "Những chú ong lớn bay vút qua, chê khu vườn “khó tính” rồi bỏ đi tìm nơi dễ hơn. Riêng Bee ở lại. Mỗi sáng, khi sương còn đọng trên lá, em đậu bên một bông hoa và lặng yên lắng nghe. Ngày đầu tiên, em chỉ học được vỏn vẹn một từ. Bông hoa hé nở một chút xíu, vừa đủ cho một giọt mật long lanh.",
  "“Một giọt thôi ư?” — lũ ong cười nhạo. Nhưng Bee chỉ mỉm cười: “Một giọt hôm nay, một giọt ngày mai — rồi tổ sẽ đầy.”",
  "Xuân qua, hạ tới. Mỗi ngày Bee lại học thêm vài tiếng nói mới: cách hỏi đường của hoa hướng dương, khúc hát ru của hoa oải hương, lời cảm ơn dịu dàng của những đoá cúc trắng. Em xếp từng từ vào ô sáp ngay ngắn như xếp mật — kiên nhẫn, đều đặn. Có hôm mưa giông, đôi cánh ướt sũng, Bee vẫn bay ra vườn. Bởi em hiểu một điều: tổ ong ngọt nhất luôn được xây nên từ chính những ngày chẳng ai buồn cất cánh.",
  "Rồi một mùa đông khắc nghiệt ập đến. Vườn hoa cụp mình, cả thung lũng chìm trong im lặng trắng xoá. Những tổ ong khác cạn mật, đói lả đi. Nhưng tổ của Bee thì khác hẳn: nơi ấy đầy ắp mật vàng — thành quả của hàng trăm buổi sáng lắng nghe. Hơn thế nữa, Bee đã hiểu đủ nhiều tiếng nói để đánh thức cả những bông hoa cuối cùng còn say ngủ dưới tuyết, xin chúng dâng lên những giọt mật cứu sống cả đàn.",
  "Từ ngày ấy, người ta truyền tai nhau câu chuyện về chú ong bé nhỏ đã làm nên điều kỳ diệu — không phải bằng đôi cánh khoẻ nhất, mà bằng sự chăm chỉ của mỗi một ngày.",
];

// A single decorative honeycomb cell (pointy-top hexagon outline).
function Hex({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="-1 -1 2 2" className={className} style={style} aria-hidden="true">
      <polygon
        points="0,-1 0.866,-0.5 0.866,0.5 0,1 -0.866,0.5 -0.866,-0.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.1"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function StoryPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#FFE6A0] via-[#FFF2CF] to-[#FFFCF3]">
      <ReadingProgress />

      {/* ===== Decorative backdrop — soft glows, honeycomb, sparkles, a bee ===== */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {/* warm honey glows */}
        <div className="story-glow story-breathe absolute -left-28 -top-24 h-[28rem] w-[28rem] rounded-full bg-gold-300/45 blur-3xl" />
        <div className="story-glow story-drift absolute -right-32 top-1/3 h-[26rem] w-[26rem] rounded-full bg-honey/30 blur-3xl" />
        <div className="story-glow story-drift-rev absolute -left-24 bottom-0 h-[24rem] w-[24rem] rounded-full bg-leaf/15 blur-3xl" />
        <div className="story-glow story-breathe absolute right-1/4 -bottom-20 h-[22rem] w-[22rem] rounded-full bg-gold-200/40 blur-3xl" />

        {/* floating honeycomb cells (mostly in the side gutters) */}
        <Hex className="story-bob absolute left-[3%] top-[12%] w-20 text-honey/30" style={{ "--rot": "10deg" } as CSSProperties} />
        <Hex className="story-bob absolute left-[7%] top-[55%] w-12 text-gold-400/30" style={{ "--rot": "-8deg", animationDelay: "1.2s" } as CSSProperties} />
        <Hex className="story-bob absolute right-[4%] top-[24%] w-24 text-honey/25" style={{ "--rot": "-12deg", animationDelay: "0.6s" } as CSSProperties} />
        <Hex className="story-bob absolute right-[8%] bottom-[14%] w-14 text-gold-400/30" style={{ "--rot": "14deg", animationDelay: "2s" } as CSSProperties} />
        <Hex className="story-bob absolute left-[14%] bottom-[8%] w-10 text-leaf/25" style={{ "--rot": "6deg", animationDelay: "1.8s" } as CSSProperties} />

        {/* twinkling sparkles */}
        <Sparkles className="story-twinkle absolute left-[10%] top-[34%] h-6 w-6 text-gold-400/70" />
        <Sparkles className="story-twinkle absolute right-[12%] top-[48%] h-5 w-5 text-honey/70" style={{ animationDelay: "1.5s" }} />
        <Sparkles className="story-twinkle absolute right-[18%] top-[8%] h-4 w-4 text-gold-300/70" style={{ animationDelay: "0.8s" }} />
        <Sparkles className="story-twinkle absolute left-[20%] bottom-[20%] h-5 w-5 text-honey/60" style={{ animationDelay: "2.3s" }} />

        {/* a little bee drifting in the corner */}
        <div className="story-sway absolute right-[6%] top-[16%] text-4xl drop-shadow-sm sm:text-5xl">🐝</div>
      </div>

      <article className="relative z-10 mx-auto w-full max-w-2xl px-5 py-10 sm:py-16">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-1.5 text-sm font-bold text-ink-soft transition-colors hover:text-honey-deep"
        >
          <ArrowLeft className="h-4 w-4" /> Về trang chủ
        </Link>

        {/* Header */}
        <ScrollReveal>
          <header className="text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-honey/15 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-honey-deep">
              <Sparkles className="h-3.5 w-3.5" /> Bài viết của Bee
            </span>
            <div className="mt-5 text-5xl story-bob inline-block">🐝</div>
            <h1 className="mt-3 font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
              Ong Bee và Khu Vườn<br className="hidden sm:block" /> Ngàn Tiếng Nói
            </h1>
            <p className="mt-3 italic text-ink-soft">Một câu chuyện cổ tích nhỏ — về sự chăm chỉ</p>
            <div className="mx-auto mt-6 h-1 w-16 rounded-full bg-honey/50" />
          </header>
        </ScrollReveal>

        {/* Body — each paragraph fades up as you scroll to it */}
        <div className="mt-8 space-y-5 text-[17px] leading-[1.85] text-ink">
          {PARAS.map((p, i) => (
            <ScrollReveal key={i} delay={i === 0 ? 0 : 60}>
              <p
                className={
                  i === 0
                    ? "first-letter:float-left first-letter:mr-3 first-letter:font-display first-letter:text-6xl first-letter:font-extrabold first-letter:leading-[0.8] first-letter:text-honey-deep"
                    : ""
                }
              >
                {p}
              </p>
            </ScrollReveal>
          ))}
        </div>

        {/* Pull quote */}
        <ScrollReveal>
          <blockquote className="my-10 rounded-2xl border-l-4 border-honey bg-honey-tint/50 p-6 text-center shadow-sm backdrop-blur-sm">
            <p className="font-display text-2xl font-extrabold text-honey-deep sm:text-3xl">
              “Chăm chỉ như ong, kết quả ngọt như mật.”
            </p>
          </blockquote>
        </ScrollReveal>

        {/* Closing + CTA */}
        <ScrollReveal>
          <div className="space-y-5 text-[17px] leading-[1.85] text-ink">
            <p>
              Và bạn cũng vậy. Mỗi từ mới bạn học hôm nay là một giọt mật cho ngày mai.
              Mỗi bài luyện nhỏ là một ô sáp trong tổ ong tri thức của riêng bạn. Đừng vội —
              chỉ cần đều đặn mỗi ngày, rồi một mùa đông nào đó, bạn sẽ ngỡ ngàng vì tổ mật
              mình đã xây.
            </p>
            <p className="font-bold">Hãy bắt đầu nhé — Bee sẽ bay cùng bạn. 🐝</p>
          </div>
        </ScrollReveal>

        <ScrollReveal>
          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-2xl gradient-brand px-7 py-3.5 font-extrabold text-white shadow-lg shadow-honey/20 transition-opacity hover:opacity-90"
            >
              Bắt đầu luyện tập <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/feedback"
              className="inline-flex items-center gap-2 rounded-2xl border-2 border-honey/40 px-7 py-3.5 font-bold text-ink hover:bg-honey-tint"
            >
              Gửi cảm nghĩ cho Bee
            </Link>
          </div>
        </ScrollReveal>
      </article>
    </main>
  );
}
