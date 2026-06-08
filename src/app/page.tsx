"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BeeLogo } from "@/components/brand/bee-logo";
import { BeeMascot } from "@/components/brand/bee-mascot";
import "./landing.css";

/* ---------------------------------------------------------------------------
   Bee IELTS — Duolingo-style sales landing page.
   Bright, gamified, conversion-oriented: hero → trust → skills → how-it-works
   → AI-grading proof → gamification → social proof → pricing → FAQ → CTA.
--------------------------------------------------------------------------- */

type Skill = { icon: string; title: string; desc: string; color: string };

const skills: Skill[] = [
  { icon: "🍃", title: "Từ vựng", desc: "Học từ mới kiểu Duolingo: thẻ ghi nhớ, XP, streak — mỗi ngày một chút.", color: "#FF5CA8" },
  { icon: "✏️", title: "Ngữ pháp", desc: "Bài học ngắn, ví dụ rõ ràng, luyện tập ngay để nhớ lâu.", color: "#14B8A6" },
  { icon: "📖", title: "Reading", desc: "Passage chuẩn IELTS đủ dạng câu hỏi, chấm tự động kèm giải thích đáp án.", color: "#58CC02" },
  { icon: "🎧", title: "Listening", desc: "Audio thật, transcript đối chiếu, luyện nghe theo từng section như đề thi.", color: "#1CB0F6" },
  { icon: "✍️", title: "Writing", desc: "Task 1 & 2 — AI chấm theo 4 tiêu chí band IELTS và gợi ý sửa từng câu.", color: "#FF9600" },
  { icon: "🎙️", title: "Speaking", desc: "Part 1·2·3 chuẩn IELTS. Ghi âm ngay trên trình duyệt, AI chấm tức thì.", color: "#FF4B6E" },
  { icon: "📺", title: "Shadowing", desc: "Luyện nói theo video thật, bắt chước ngữ điệu và phát âm bản xứ.", color: "#A560E8" },
  { icon: "📝", title: "Thi thử", desc: "Mock test đủ 4 kỹ năng sát phòng thi, nhận band tổng tức thì.", color: "#4B6BFB" },
  { icon: "🧗", title: "Vượt band", desc: "Lộ trình leo band theo từng chặng — biết chính xác hôm nay nên luyện gì.", color: "#F0A800" },
];

const steps = [
  { n: "1", icon: "🎯", title: "Chọn mục tiêu", desc: "Đặt band mong muốn. Bee dựng lộ trình học mỗi ngày vừa sức cho bạn." },
  { n: "2", icon: "⚡", title: "Học mỗi ngày", desc: "Bài học ngắn, gamified với XP, streak và hearts — vui đến mức không muốn bỏ." },
  { n: "3", icon: "🚀", title: "AI chấm & tiến bộ", desc: "Writing & Speaking được AI chấm theo band, biết ngay điểm yếu để cải thiện." },
];

// NOTE: sample/illustrative testimonials — thay bằng review thật của học viên.
const loves = [
  { name: "Minh Anh", tag: "6.0 → 7.5 Writing", quote: "AI chấm Writing chi tiết từng câu, mình biết chính xác lỗi để sửa. Lên band rõ rệt sau 2 tháng.", color: "#FF9600" },
  { name: "Quốc Bảo", tag: "Streak 96 ngày", quote: "Học từ vựng kiểu Duolingo cuốn cực kỳ. Mình giữ streak 3 tháng liền mà không thấy chán.", color: "#FF4B6E" },
  { name: "Thu Hà", tag: "Speaking 7.0", quote: "Ghi âm rồi được AI chấm Fluency với Pronunciation ngay, tự tin hẳn khi vào phòng thi thật.", color: "#1CB0F6" },
];

const faqs = [
  { q: "Bee IELTS có miễn phí không?", a: "Có! Bạn bắt đầu hoàn toàn miễn phí: từ vựng, ngữ pháp, Reading, Listening và chấm Writing & Speaking cơ bản. Gói Premium mở khoá lộ trình Vượt band và các tính năng nâng cao." },
  { q: "AI chấm Writing & Speaking chính xác đến đâu?", a: "AI chấm theo đúng 4 tiêu chí band score IELTS, kèm nhận xét từng đoạn và bản viết lại gợi ý. Đây là công cụ luyện tập tuyệt vời để biết điểm yếu — không thay thế giám khảo thật ở kỳ thi chính thức." },
  { q: "Mình mất gốc có học được không?", a: "Được. Lộ trình bắt đầu từ từ vựng & ngữ pháp nền tảng theo cấp độ CEFR (A1→C2), tăng dần độ khó nên người mới bắt đầu vẫn theo kịp." },
  { q: "Học trên điện thoại được không?", a: "Hoàn toàn được. Bee IELTS thiết kế mobile-first, chạy mượt trên trình duyệt điện thoại — kể cả ghi âm Speaking." },
  { q: "Cần học bao lâu mỗi ngày?", a: "Chỉ 10–15 phút mỗi ngày là đủ giữ streak và tiến bộ đều. Kiên trì như đàn ong — mỗi ngày một chút, band điểm cứ thế lớn dần." },
];

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lightweight scroll-reveal for `.lp-reveal` elements.
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>(".lp-reveal"));
    if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      els.forEach((el) => el.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("in")),
      { threshold: 0.12 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <main className="lp">
      {/* ===== NAV ===== */}
      <header className={`lp-nav${scrolled ? " scrolled" : ""}`}>
        <div className="wrap lp-nav-inner">
          <Link href="/" className="lp-brand">
            <BeeLogo className="mark" />
            <span className="lp-brand-text">Bee IELTS</span>
          </Link>
          <nav className="lp-nav-links">
            <Link href="#skills" className="lp-nav-link hide-sm">Tính năng</Link>
            <Link href="#how" className="lp-nav-link hide-sm">Cách học</Link>
            <Link href="#pricing" className="lp-nav-link hide-sm">Học phí</Link>
            <Link href="#faq" className="lp-nav-link hide-sm">Hỏi đáp</Link>
            <Link href="/login" className="lp-login">Đăng nhập</Link>
            <Link href="/register" className="btn btn-primary btn-sm">Bắt đầu free</Link>
          </nav>
        </div>
      </header>

      {/* ===== HERO ===== */}
      <section className="lp-hero">
        <div className="wrap lp-hero-grid">
          <div className="lp-hero-copy">
            <span className="lp-pill">
              <span className="dot" /> AI chấm Writing &amp; Speaking
              <span className="tag">Miễn phí</span>
            </span>
            <h1 className="lp-h1">
              Luyện IELTS vui như chơi,
              <br />
              lên band <span className="hl">thật.</span>
            </h1>
            <p className="lp-sub">
              Học từ vựng &amp; ngữ pháp kiểu Duolingo, luyện đủ 4 kỹ năng, và để
              AI chấm Writing &amp; Speaking theo đúng band score IELTS — ngay tức thì.
            </p>
            <div className="lp-cta">
              <Link href="/register" className="btn btn-primary lp-cta-main">
                Bắt đầu miễn phí <span className="arr">→</span>
              </Link>
              <Link href="#how" className="btn btn-outline">Xem cách học</Link>
            </div>
            <div className="lp-trust">
              <span className="lp-trust-stars">★★★★★</span>
              <span>Không cần thẻ · Bắt đầu trong 30 giây</span>
            </div>
          </div>

          {/* Hero art — mascot in a green disc + floating gamified cards */}
          <div className="lp-hero-art lp-reveal">
            <div className="lp-disc" aria-hidden />
            <div className="lp-blob lp-blob-1" aria-hidden />
            <div className="lp-blob lp-blob-2" aria-hidden />
            <BeeMascot className="lp-mascot" priority />

            <div className="lp-chip chip-xp">
              <span className="ci" style={{ background: "#FFF0BF" }}>⚡</span>
              <span className="ct">+120 XP<small>Hôm nay</small></span>
            </div>
            <div className="lp-chip chip-streak">
              <span className="ci" style={{ background: "#FFE0E0" }}>🔥</span>
              <span className="ct">7 ngày<small>Streak</small></span>
            </div>
            <div className="lp-chip chip-band">
              <span className="ci" style={{ background: "#DDF4C0" }}>🎯</span>
              <span className="ct">Band 7.0<small>Mục tiêu</small></span>
            </div>
          </div>
        </div>

        {/* trust strip */}
        <div className="wrap lp-badges lp-reveal">
          {[
            { i: "📚", t: "4 kỹ năng IELTS" },
            { i: "🤖", t: "AI chấm tức thì" },
            { i: "🎮", t: "Học gamified" },
            { i: "📱", t: "Mọi thiết bị" },
          ].map((b) => (
            <div className="lp-badge" key={b.t}>
              <span>{b.i}</span> {b.t}
            </div>
          ))}
        </div>
      </section>

      {/* ===== MARQUEE ===== */}
      <div className="lp-marquee" aria-hidden>
        <div className="lp-marquee-track">
          {[...Array(2)].flatMap((_, k) =>
            ["Từ vựng", "Ngữ pháp", "Reading", "Listening", "Writing", "Speaking", "Shadowing", "Thi thử"].map((m) => (
              <span className="lp-marquee-item" key={`${k}-${m}`}>{m}<span className="sep">🐝</span></span>
            )),
          )}
        </div>
      </div>

      {/* ===== SKILLS ===== */}
      <section className="lp-section" id="skills">
        <div className="wrap">
          <div className="lp-head lp-reveal">
            <span className="lp-eyebrow">Tất cả trong một app</span>
            <h2 className="lp-h2">Mọi thứ bạn cần để <span className="hl">lên band</span>.</h2>
            <p>Từ học từ vựng mỗi ngày đến luyện đủ 4 kỹ năng và thi thử — tất cả gói gọn trong một nền tảng, được chấm và phản hồi rõ ràng.</p>
          </div>
          <div className="lp-skill-grid">
            {skills.map((s) => (
              <article className="lp-skill lp-reveal" key={s.title} style={{ ["--c" as string]: s.color }}>
                <span className="ico">{s.icon}</span>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
                <span className="lp-skill-arr">→</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="lp-section lp-how" id="how">
        <div className="wrap">
          <div className="lp-head center lp-reveal">
            <span className="lp-eyebrow">Cách học</span>
            <h2 className="lp-h2">Tiến bộ chỉ với <span className="hl">3 bước</span>.</h2>
            <p>Đơn giản, đều đặn, hiệu quả — như cách đàn ong góp mật mỗi ngày.</p>
          </div>
          <div className="lp-steps">
            {steps.map((st) => (
              <div className="lp-step lp-reveal" key={st.n}>
                <span className="lp-step-n">{st.n}</span>
                <span className="lp-step-ico">{st.icon}</span>
                <h3>{st.title}</h3>
                <p>{st.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== AI GRADING SHOWCASE ===== */}
      <section className="lp-section">
        <div className="wrap lp-grade-grid">
          <div className="lp-reveal">
            <span className="lp-eyebrow">Điểm khác biệt</span>
            <h2 className="lp-h2">AI chấm như <span className="hl">giám khảo IELTS</span>.</h2>
            <p className="lp-grade-sub">
              Nộp bài Writing hoặc ghi âm Speaking — AI trả về band tổng cùng 4 tiêu chí,
              nhận xét từng đoạn và bản viết lại gợi ý. Bạn biết chính xác phải cải thiện điều gì.
            </p>
            <ul className="lp-checks">
              {["Band tổng + 4 tiêu chí chi tiết", "Nhận xét & sửa lỗi từng câu", "Bản viết lại mẫu để học theo", "Phản hồi ngay, không phải chờ"].map((c) => (
                <li key={c}><span className="tick">✓</span>{c}</li>
              ))}
            </ul>
            <Link href="/register" className="btn btn-primary lp-grade-cta">Thử AI chấm bài <span className="arr">→</span></Link>
          </div>

          {/* mock result card */}
          <div className="lp-result lp-reveal">
            <div className="lp-result-top">
              <div>
                <span className="lp-result-label">Band tổng</span>
                <span className="lp-result-band">7.0</span>
              </div>
              <span className="lp-result-badge">Writing Task 2</span>
            </div>
            <div className="lp-result-bars">
              {[
                { k: "Task Response", v: 7.0, c: "#58CC02" },
                { k: "Coherence & Cohesion", v: 7.5, c: "#1CB0F6" },
                { k: "Lexical Resource", v: 6.5, c: "#FF9600" },
                { k: "Grammar", v: 7.0, c: "#A560E8" },
              ].map((b) => (
                <div className="lp-bar" key={b.k}>
                  <div className="lp-bar-head"><span>{b.k}</span><b>{b.v.toFixed(1)}</b></div>
                  <div className="lp-bar-track"><span style={{ width: `${(b.v / 9) * 100}%`, background: b.c }} /></div>
                </div>
              ))}
            </div>
            <div className="lp-result-note">
              <span className="tick">💡</span>
              <p>“Mở rộng ý ở đoạn 2 bằng ví dụ cụ thể, và thay <i>‘good’</i> bằng từ học thuật hơn để nâng Lexical Resource.”</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== GAMIFICATION ===== */}
      <section className="lp-section lp-game">
        <div className="wrap lp-game-inner lp-reveal">
          <div className="lp-game-copy">
            <span className="lp-eyebrow light">Vì sao học cuốn?</span>
            <h2 className="lp-h2">Học đều đặn nhờ <span className="hl">streak, XP &amp; hearts</span>.</h2>
            <p>Mỗi bài học cộng XP, hoàn thành mỗi ngày để giữ streak. Cơ chế gamified giúp bạn quay lại đều đặn — và tiến bộ là chuyện tất yếu.</p>
          </div>
          <div className="lp-game-stats">
            <div className="lp-gstat"><span className="gi">⚡</span><b>+1.250</b><small>XP tuần này</small></div>
            <div className="lp-gstat"><span className="gi">🔥</span><b>32</b><small>Ngày streak</small></div>
            <div className="lp-gstat"><span className="gi">❤️</span><b>5</b><small>Hearts</small></div>
          </div>
        </div>
      </section>

      {/* ===== TESTIMONIALS ===== */}
      <section className="lp-section">
        <div className="wrap">
          <div className="lp-head center lp-reveal">
            <span className="lp-eyebrow">Học viên nói gì</span>
            <h2 className="lp-h2">Được học viên <span className="hl">yêu thích</span>.</h2>
          </div>
          <div className="lp-loves">
            {loves.map((l) => (
              <figure className="lp-love lp-reveal" key={l.name}>
                <div className="lp-love-stars">★★★★★</div>
                <blockquote>“{l.quote}”</blockquote>
                <figcaption>
                  <span className="lp-love-avatar" style={{ background: l.color }}>{l.name.slice(0, 1)}</span>
                  <span>
                    <b>{l.name}</b>
                    <small style={{ color: l.color }}>{l.tag}</small>
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ===== PRICING ===== */}
      <section className="lp-section lp-pricing" id="pricing">
        <div className="wrap">
          <div className="lp-head center lp-reveal">
            <span className="lp-eyebrow">Học phí</span>
            <h2 className="lp-h2">Bắt đầu <span className="hl">miễn phí</span>, nâng cấp khi cần.</h2>
            <p>Không cần thẻ tín dụng. Học thử toàn bộ tính năng cốt lõi ngay hôm nay.</p>
          </div>
          <div className="lp-plans">
            <div className="lp-plan lp-reveal">
              <span className="lp-plan-name">Miễn phí</span>
              <div className="lp-plan-price">0đ<small>/ mãi mãi</small></div>
              <ul>
                {["Từ vựng & ngữ pháp gamified", "Reading & Listening sát đề", "AI chấm Writing & Speaking", "Streak, XP, hearts mỗi ngày"].map((f) => (
                  <li key={f}><span className="tick">✓</span>{f}</li>
                ))}
              </ul>
              <Link href="/register" className="btn btn-outline lp-plan-cta">Bắt đầu free</Link>
            </div>

            <div className="lp-plan featured lp-reveal">
              <span className="lp-plan-flag">Phổ biến nhất</span>
              <span className="lp-plan-name">Premium</span>
              <div className="lp-plan-price">Vượt band<small>/ mở khoá toàn bộ</small></div>
              <ul>
                {["Mọi thứ ở gói Miễn phí", "Lộ trình Vượt band theo chặng", "Mock test đầy đủ 4 kỹ năng", "Ưu tiên chấm AI & tính năng mới"].map((f) => (
                  <li key={f}><span className="tick">✓</span>{f}</li>
                ))}
              </ul>
              <Link href="/premium" className="btn btn-honey lp-plan-cta">Khám phá Premium <span className="arr">→</span></Link>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section className="lp-section lp-faq" id="faq">
        <div className="wrap lp-faq-grid">
          <div className="lp-head lp-reveal">
            <span className="lp-eyebrow">Hỏi đáp</span>
            <h2 className="lp-h2">Câu hỏi <span className="hl">thường gặp</span>.</h2>
            <p>Còn thắc mắc khác? Nhắn cho tụi mình bất cứ lúc nào.</p>
          </div>
          <div className="lp-faq-list lp-reveal">
            {faqs.map((f) => (
              <details className="lp-faq-item" key={f.q}>
                <summary>{f.q}<span className="chev">+</span></summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section className="lp-section">
        <div className="wrap">
          <div className="lp-cta-band lp-reveal">
            <BeeMascot className="lp-cta-mascot" />
            <h2>Sẵn sàng chinh phục band điểm mơ ước?</h2>
            <p>Đăng ký miễn phí trong 30 giây và bắt đầu luyện đủ 4 kỹ năng ngay hôm nay.</p>
            <div className="lp-cta-actions">
              <Link href="/register" className="btn btn-cream lp-cta-band-btn">Tạo tài khoản miễn phí <span className="arr">→</span></Link>
              <Link href="/login" className="btn btn-cta-ghost">Đăng nhập</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="lp-foot">
        <div className="wrap lp-foot-inner">
          <Link href="/" className="lp-brand">
            <BeeLogo className="mark" />
            <span className="lp-brand-text">Bee IELTS</span>
          </Link>
          <nav className="lp-foot-links">
            <Link href="#skills">Tính năng</Link>
            <Link href="#pricing">Học phí</Link>
            <Link href="#faq">Hỏi đáp</Link>
            <a href="mailto:dingdong1405edu@gmail.com">Liên hệ</a>
          </nav>
          <span className="lp-copy">© 2026 Bee IELTS · DingDong Company</span>
        </div>
      </footer>
    </main>
  );
}
