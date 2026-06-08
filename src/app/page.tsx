"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Honeycomb } from "@/components/honeycomb";
import "./landing.css";

/* ---- Hexagon mark (inline SVG, no external assets) ---- */
function HexMark() {
  return (
    <svg className="mark" viewBox="0 0 40 40" fill="none" aria-hidden>
      <path
        d="M20 2.5 34.5 11v18L20 37.5 5.5 29V11L20 2.5Z"
        fill="var(--honey)"
        stroke="var(--primary-deep)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <text
        x="20"
        y="26"
        textAnchor="middle"
        fontSize="18"
        fontWeight="800"
        fill="#2a1c00"
      >
        🐝
      </text>
    </svg>
  );
}

const features = [
  {
    icon: "📚",
    title: "Reading",
    desc: "Passage chuẩn IELTS với đủ dạng câu hỏi: multiple choice, fill-in-the-blank, matching.",
    tag: "Đủ dạng bài",
    green: false,
  },
  {
    icon: "🎧",
    title: "Listening",
    desc: "Audio thật, transcript đối chiếu, luyện nghe theo từng section như đề thi.",
    tag: "Audio thật",
    green: true,
  },
  {
    icon: "✍️",
    title: "Writing",
    desc: "Task 1 + Task 2. AI chấm theo 4 tiêu chí band IELTS và gợi ý sửa ngay tức thì.",
    tag: "AI chấm 4 tiêu chí",
    green: false,
  },
  {
    icon: "🎙️",
    title: "Speaking",
    desc: "Part 1, 2, 3 chuẩn IELTS. Ghi âm ngay trên trình duyệt, AI chấm Fluency, Grammar, Pronunciation.",
    tag: "Ghi âm → AI chấm",
    green: true,
  },
  {
    icon: "📺",
    title: "Shadowing",
    desc: "Luyện nói theo video YouTube thật, bắt chước ngữ điệu và phát âm bản xứ.",
    tag: "Học qua YouTube",
    green: false,
  },
  {
    icon: "🧗",
    title: "Band Climber",
    desc: "Lộ trình leo band theo từng chặng — biết chính xác hôm nay nên luyện gì.",
    tag: "Lộ trình theo chặng",
    green: true,
  },
  {
    icon: "📝",
    title: "Mock Test",
    desc: "Thi thử đủ 4 kỹ năng trong điều kiện sát phòng thi, nhận band tổng tức thì.",
    tag: "Thi thử đủ 4 kỹ năng",
    green: false,
  },
];

const marqueeItems = [
  "Từ vựng",
  "Reading",
  "Listening",
  "Writing",
  "Speaking",
  "Shadowing",
  "Mock Test",
  "Band Climber",
];

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <main style={{ position: "relative", overflow: "hidden" }}>
      {/* ===== NAV ===== */}
      <header className={`nav${scrolled ? " scrolled" : ""}`}>
        <div className="wrap nav-inner">
          <Link href="/" className="brand">
            <HexMark />
            <span>🐝 Bee IELTS</span>
          </Link>
          <nav className="nav-actions">
            <Link href="#features" className="nav-link hide-sm">
              Tính năng
            </Link>
            <Link href="#path" className="nav-link hide-sm">
              Lộ trình
            </Link>
            <Link href="#about" className="nav-link hide-sm">
              Về chúng tôi
            </Link>
            <Link href="/login" className="btn btn-ghost btn-sm">
              Đăng nhập
            </Link>
            <Link href="/register" className="btn btn-honey btn-sm">
              Bắt đầu miễn phí
            </Link>
          </nav>
        </div>
      </header>

      {/* ===== HERO ===== */}
      <section className="hero">
        <Honeycomb className="honeycomb-wash" />
        <div className="wrap hero-grid">
          <div>
            <span className="hero-pill">
              <span className="dot" />
              AI chấm Writing &amp; Speaking
              <span className="tag">Miễn phí</span>
            </span>
            <h1 className="display">
              Luyện IELTS vui như <span className="hl">chơi game</span>.
            </h1>
            <p className="hero-sub">
              Học từ vựng kiểu Duolingo, luyện đủ 4 kỹ năng, và để AI chấm Writing
              &amp; Speaking của bạn tức thì.
            </p>
            <div className="hero-cta">
              <Link href="/register" className="btn btn-honey">
                Bắt đầu miễn phí <span className="arr">→</span>
              </Link>
              <Link href="/login" className="btn btn-ghost">
                Đăng nhập
              </Link>
            </div>
            <div className="hero-meta">
              <div className="stat">
                <span className="n">4 kỹ năng</span>
                <span className="l">Reading · Listening · Writing · Speaking</span>
              </div>
              <div className="stat">
                <span className="n">AI chấm điểm</span>
                <span className="l">Theo 4 tiêu chí band IELTS</span>
              </div>
              <div className="stat">
                <span className="n">Miễn phí</span>
                <span className="l">Bắt đầu trong 30 giây</span>
              </div>
            </div>
          </div>

          {/* Hero visual — CSS/emoji stage, no image assets */}
          <div
            style={{
              position: "relative",
              minHeight: 380,
              display: "grid",
              placeItems: "center",
            }}
          >
            <div
              style={{
                position: "relative",
                width: "min(340px, 80%)",
                aspectRatio: "1 / 1",
                borderRadius: "50%",
                background:
                  "radial-gradient(circle at 50% 42%, var(--primary-tint) 0%, var(--cream-2) 55%, transparent 72%)",
                display: "grid",
                placeItems: "center",
              }}
            >
              <div style={{ fontSize: "clamp(96px, 16vw, 168px)", lineHeight: 1 }}>
                🐝
              </div>

              {/* Floating XP card */}
              <div
                style={{
                  position: "absolute",
                  top: "6%",
                  left: "-6%",
                  background: "var(--paper)",
                  border: "1px solid var(--line)",
                  borderRadius: 16,
                  padding: "12px 16px",
                  boxShadow: "0 18px 40px -22px rgb(var(--shadow))",
                  fontWeight: 700,
                  fontSize: 14,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  color: "var(--ink)",
                }}
              >
                <span style={{ fontSize: 20 }}>⚡</span>
                <span>
                  +120 XP
                  <span
                    style={{
                      display: "block",
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--ink-faint)",
                    }}
                  >
                    Hôm nay
                  </span>
                </span>
              </div>

              {/* Floating streak card */}
              <div
                style={{
                  position: "absolute",
                  bottom: "10%",
                  right: "-8%",
                  background: "var(--ink)",
                  color: "var(--cream)",
                  borderRadius: 16,
                  padding: "12px 16px",
                  boxShadow: "0 18px 40px -20px rgb(var(--shadow))",
                  fontWeight: 700,
                  fontSize: 14,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span style={{ fontSize: 20 }}>🔥</span>
                <span>
                  7 ngày
                  <span
                    style={{
                      display: "block",
                      fontSize: 11,
                      fontWeight: 600,
                      color: "color-mix(in srgb, var(--cream) 60%, transparent)",
                    }}
                  >
                    Streak
                  </span>
                </span>
              </div>

              {/* Floating band card */}
              <div
                style={{
                  position: "absolute",
                  bottom: "-2%",
                  left: "2%",
                  background: "var(--leaf)",
                  color: "#fff",
                  borderRadius: 16,
                  padding: "12px 16px",
                  boxShadow: "0 18px 40px -22px rgb(var(--shadow))",
                  fontWeight: 700,
                  fontSize: 14,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span style={{ fontSize: 20 }}>🎯</span>
                <span>
                  Band 7.0
                  <span
                    style={{
                      display: "block",
                      fontSize: 11,
                      fontWeight: 600,
                      color: "rgba(255,255,255,0.75)",
                    }}
                  >
                    Mục tiêu
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== MARQUEE ===== */}
      <div className="marquee" aria-hidden>
        <div className="marquee-track">
          {[...marqueeItems, ...marqueeItems].map((item, i) => (
            <span className="marquee-item" key={i}>
              {item}
              <span className="sep">•</span>
            </span>
          ))}
        </div>
      </div>

      {/* ===== FEATURES ===== */}
      <section className="section" id="features">
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">Tính năng</span>
            <h2 className="section-title">
              Mọi thứ bạn cần để <span className="hl">level up</span>.
            </h2>
            <p>
              Từ học từ vựng mỗi ngày đến luyện đủ 4 kỹ năng và thi thử — tất cả
              gói gọn trong một chú ong chăm chỉ.
            </p>
          </div>

          <div className="feat-grid">
            {/* Lead dark card */}
            <article className="feat lead">
              <div className="ico">🍯</div>
              <span className="feat-name eyebrow" style={{ color: "var(--honey)" }}>
                Từ vựng
              </span>
              <h3>Học từ vựng kiểu Duolingo</h3>
              <p className="feat-desc">
                Bài học ngắn, gamified với XP, streak và hearts. Mỗi ngày góp nhặt
                một chút từ mới — kiên trì như ong, và band điểm cứ thế lớn dần.
              </p>
              <span className="feat-tag">XP · Streak · Hearts →</span>
            </article>

            {features.map((f) => (
              <article className="feat" key={f.title}>
                <div className="ico">{f.icon}</div>
                <h3>{f.title}</h3>
                <p className="feat-desc">{f.desc}</p>
                <span className={`feat-tag${f.green ? " green" : ""}`}>
                  {f.tag} →
                </span>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ===== STORY / ABOUT ===== */}
      <section className="section" id="about">
        <div className="wrap">
          <div className="story" id="path">
            <Honeycomb className="honeycomb-wash" />
            <div className="story-grid">
              <div>
                <span className="eyebrow">Về chúng tôi</span>
                <h2>
                  Mỗi ngày một chút,
                  <br />
                  như chú ong chăm chỉ.
                </h2>
              </div>
              <div>
                <p>
                  Bee IELTS được phát triển bởi{" "}
                  <strong>DingDong Company</strong>, với mong muốn giúp người Việt
                  chinh phục IELTS một cách nhẹ nhàng, vui vẻ và bền bỉ.
                </p>
                <p>
                  Cái tên <strong>&ldquo;Bee&rdquo;</strong> lấy cảm hứng từ những
                  chú ong — mỗi ngày góp nhặt một chút, kiên trì và đều đặn, để rồi
                  cùng nhau tạo nên mật ngọt.
                </p>
                <p className="honey-quote">
                  &ldquo;Chỉ cần mỗi ngày một chút, bạn sẽ tiến xa hơn mình tưởng.&rdquo;
                </p>
                <div className="contact-card">
                  <span className="lab">Liên hệ</span>
                  <p style={{ margin: "8px 0 0" }}>
                    <a
                      href="mailto:dingdong1405edu@gmail.com"
                      style={{ color: "#fff", fontWeight: 700 }}
                    >
                      dingdong1405edu@gmail.com
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section className="section cta-band">
        <div className="wrap">
          <div className="cta-inner">
            <div
              aria-hidden
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 0,
                opacity: 0.22,
                color: "#2a1c00",
                pointerEvents: "none",
              }}
            >
              <svg
                width="100%"
                height="100%"
                aria-hidden
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <pattern
                    id="cta-honeycomb"
                    width="28"
                    height="49"
                    patternUnits="userSpaceOnUse"
                    patternTransform="scale(2)"
                  >
                    <path
                      fill="currentColor"
                      d="M13.99 9.25l13 7.5v15l-13 7.5L1 31.75v-15l12.99-7.5zM3 17.9v12.7l10.99 6.34 11-6.35V17.9l-11-6.34L3 17.9zM0 15l12.98-7.5V0h-2v6.35L0 12.69v2.3zm0 18.5L12.98 41v8h-2v-6.85L0 35.81v-2.3zM15 0v7.5L27.99 15H28v-2.31h-.01L17 6.35V0h-2zm0 49v-8l12.99-7.5H28v2.31h-.01L17 42.15V49h-2z"
                    />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#cta-honeycomb)" />
              </svg>
            </div>
            <div style={{ position: "relative", zIndex: 1 }}>
              <h2>Sẵn sàng chinh phục band điểm mơ ước?</h2>
              <p>
                Đăng ký miễn phí trong 30 giây và bắt đầu luyện đủ 4 kỹ năng ngay
                hôm nay.
              </p>
              <div className="cta-actions">
                <Link href="/register" className="btn btn-primary">
                  Tạo tài khoản miễn phí <span className="arr">→</span>
                </Link>
                <Link href="/login" className="btn btn-ghost">
                  Đăng nhập
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="foot">
        <div className="wrap foot-inner">
          <Link href="/" className="brand">
            <HexMark />
            <span>🐝 Bee IELTS</span>
          </Link>
          <span className="copy">© 2026 Bee IELTS · DingDong Company</span>
        </div>
      </footer>
    </main>
  );
}
