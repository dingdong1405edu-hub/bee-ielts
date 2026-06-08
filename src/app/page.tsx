"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BeeLogo } from "@/components/brand/bee-logo";
import { BeeMascot } from "@/components/brand/bee-mascot";
import { Leaf } from "@/components/brand/leaf";
import "./landing.css";

type Feature = {
  icon: string;
  name?: string;
  title: string;
  desc: string;
  tag: string;
  color: string;
};

const features: Feature[] = [
  {
    icon: "📖",
    title: "Reading",
    desc: "Passage chuẩn IELTS với đủ dạng câu hỏi: multiple choice, fill-in-the-blank, matching.",
    tag: "Đủ dạng bài",
    color: "var(--skill-reading, #4F7A66)",
  },
  {
    icon: "🎧",
    title: "Listening",
    desc: "Audio thật, transcript đối chiếu, luyện nghe theo từng section như đề thi.",
    tag: "Audio thật",
    color: "#5B7E9C",
  },
  {
    icon: "✍️",
    title: "Writing",
    desc: "Task 1 + Task 2. AI chấm theo 4 tiêu chí band IELTS và gợi ý sửa ngay tức thì.",
    tag: "AI chấm 4 tiêu chí",
    color: "#B6883F",
  },
  {
    icon: "🎙️",
    title: "Speaking",
    desc: "Part 1, 2, 3 chuẩn IELTS. Ghi âm ngay trên trình duyệt, AI chấm Fluency, Grammar, Pronunciation.",
    tag: "Ghi âm → AI chấm",
    color: "#C0714E",
  },
  {
    icon: "📺",
    title: "Shadowing",
    desc: "Luyện nói theo video YouTube thật, bắt chước ngữ điệu và phát âm bản xứ.",
    tag: "Học qua YouTube",
    color: "#8A6E9C",
  },
  {
    icon: "🧗",
    title: "Band Climber",
    desc: "Lộ trình leo band theo từng chặng — biết chính xác hôm nay nên luyện gì.",
    tag: "Lộ trình theo chặng",
    color: "#7A8C46",
  },
  {
    icon: "📝",
    title: "Mock Test",
    desc: "Thi thử đủ 4 kỹ năng trong điều kiện sát phòng thi, nhận band tổng tức thì.",
    tag: "Thi thử đủ 4 kỹ năng",
    color: "#4C5B8A",
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
            <BeeLogo className="mark" />
            <span className="brand-stack">
              Bee IELTS
              <small>Học chăm như đàn ong</small>
            </span>
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
        <span className="ghostword" aria-hidden>
          IELTS
        </span>
        <div className="wrap hero-grid">
          <div>
            <span className="hero-pill">
              <span className="dot" />
              AI chấm Writing &amp; Speaking
              <span className="tag">Miễn phí</span>
            </span>
            <h1 className="display">
              Luyện IELTS bài bản,
              <br />
              lên band <span className="hl">vững vàng</span>.
            </h1>
            <p className="hero-sub">
              Học từ vựng mỗi ngày, luyện đủ 4 kỹ năng, và để AI chấm Writing
              &amp; Speaking của bạn theo đúng band score IELTS.
            </p>
            <div className="hero-cta">
              <Link href="/register" className="btn btn-cream">
                Bắt đầu miễn phí <span className="arr">→</span>
              </Link>
              <Link href="#features" className="btn btn-outline">
                Xem tính năng
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

          {/* Hero visual — sage disc + mascot + floating stat cards */}
          <div className="hero-visual">
            <div className="disc" aria-hidden />
            <Leaf className="hero-leaf hero-leaf-1 text-gold-soft/40" />
            <Leaf className="hero-leaf hero-leaf-2 text-mist/50" />
            <BeeMascot className="hero-mascot" priority />

            <div className="float-card c-xp">
              <span className="fi">⚡</span>
              <span>
                +120 XP
                <span className="sub">Hôm nay</span>
              </span>
            </div>

            <div className="float-card c-streak">
              <span className="fi">🔥</span>
              <span>
                7 ngày
                <span className="sub">Streak</span>
              </span>
            </div>

            <div className="float-card c-band">
              <span className="fi">🎯</span>
              <span>
                <span className="band">Band 7.0</span>
                <span className="sub">Mục tiêu</span>
              </span>
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
              <span className="sep">✦</span>
            </span>
          ))}
        </div>
      </div>

      {/* ===== FEATURES ===== */}
      <section className="section" id="features">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/textures/leaf-news.jpg" className="feat-leaf feat-leaf-a" alt="" aria-hidden />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/textures/leaf-news.jpg" className="feat-leaf feat-leaf-b" alt="" aria-hidden />
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">Tính năng</span>
            <h2 className="section-title">
              Mọi thứ bạn cần để <span className="hl">tiến bộ</span>.
            </h2>
            <p>
              Từ học từ vựng mỗi ngày đến luyện đủ 4 kỹ năng và thi thử — tất cả
              gói gọn trong một nền tảng, được chấm và phản hồi rõ ràng.
            </p>
          </div>

          <div className="feat-grid">
            {/* Lead card — Vocabulary */}
            <article className="feat lead">
              <div className="ico">🍃</div>
              <span className="feat-name">Từ vựng</span>
              <h3>Học từ vựng kiểu Duolingo</h3>
              <p className="feat-desc">
                Bài học ngắn, gamified với XP, streak và hearts. Mỗi ngày góp nhặt
                một chút từ mới — kiên trì và đều đặn, band điểm cứ thế lớn dần.
              </p>
              <span className="feat-tag">XP · Streak · Hearts →</span>
            </article>

            {features.map((f) => (
              <article
                className="feat"
                key={f.title}
                style={{ ["--c" as string]: f.color }}
              >
                <div className="ico">{f.icon}</div>
                <h3>{f.title}</h3>
                <p className="feat-desc">{f.desc}</p>
                <span className="feat-tag">{f.tag} →</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ===== STORY / ABOUT ===== */}
      <section className="section" id="about">
        <div className="wrap">
          <div className="story" id="path">
            <div className="story-grid">
              <div>
                <span className="eyebrow">Về chúng tôi</span>
                <h2>
                  Mỗi ngày một chút,
                  <br />
                  kiên trì như đàn ong.
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
                  &ldquo;Không phải học nhiều hơn — mà học đúng hơn, mỗi ngày.&rdquo;
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
            <BeeLogo className="mark" />
            <span>Bee IELTS</span>
          </Link>
          <span className="copy">© 2026 Bee IELTS · DingDong Company</span>
        </div>
      </footer>
    </main>
  );
}
