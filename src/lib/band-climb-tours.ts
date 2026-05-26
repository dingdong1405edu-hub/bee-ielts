/**
 * Default Bee tour scripts per skill for the 4→5 stage. Each tour walks
 * the learner through the most useful band-climb tips before the player
 * mounts. Stages later than 4→5 fall back to these too until an admin
 * authors a per-test tour (Commit 2's `bandClimbTips` JSON field).
 */
import type { TourStep } from "@/components/learn/bee-guide";

export const LISTENING_DEFAULT_TOUR: TourStep[] = [
  {
    target: "center",
    title: "Bee 🐝 chỉ mẹo Listening 4→5",
    body:
      "Listening 4→5 thi ăn điểm ở Section 1 và 2. Mình chỉ bạn 3 mẹo cốt lõi trước khi vào.",
    ctaLabel: "OK, chỉ mình",
  },
  {
    target: "center",
    title: "Mẹo 1 — Đọc câu hỏi TRƯỚC khi audio bật",
    body:
      "Bạn có 30 giây trước mỗi section — dùng hết. Khoanh các 'từ neo' trong câu hỏi: tên riêng, số, năm, thuật ngữ trong ngoặc.\n\nKhi audio nói tới từ neo đó, đáp án nằm sát ngay sau.",
    highlights: [
      {
        label: "Từ neo phải săn trong câu hỏi",
        items: ["Tên người", "Số/Năm", "Địa danh", "Thuật ngữ", "Đơn vị (kg, km)"],
      },
    ],
  },
  {
    target: "center",
    title: "Mẹo 2 — Audio chỉ phát MỘT lần",
    body:
      "Đừng tiếc câu vừa lỡ — bỏ qua, tập trung câu kế tiếp. Sai 1 câu vẫn còn cứu được 9 câu sau. Mất tập trung thì sai cả chục câu.",
  },
  {
    target: "center",
    title: "Mẹo 3 — Cẩn thận BẪY PARAPHRASE",
    body:
      "Người Anh thường nói 1 từ rồi 'sửa lại' bằng từ khác — câu hỏi thường ăn theo từ thứ hai.\n\nVD: 'I'll pay £25... no, actually £30' → đáp án là 30, không phải 25.",
  },
  {
    target: "center",
    title: "Sẵn sàng nghe chưa?",
    body: "Bấm 'Bắt đầu' và áp dụng 3 mẹo trên. Audio sẽ chạy ngay khi bạn vào bài.",
    ctaLabel: "Bắt đầu",
  },
];

export const WRITING_DEFAULT_TOUR: TourStep[] = [
  {
    target: "center",
    title: "Bee 🐝 chỉ mẹo Writing 4→5",
    body:
      "Writing 4→5 thường rớt vì viết lan man, ý lặp, sai ngữ pháp cơ bản. Mình chỉ bạn 3 mẹo cứu band.",
    ctaLabel: "OK, chỉ mình",
  },
  {
    target: "center",
    title: "Mẹo 1 — DÀN BÀI 5 phút trước khi viết",
    body:
      "Đừng nhảy vào viết ngay. Dành 5 phút gạch ra: 1 luận điểm + 2 ý phụ cho mỗi đoạn.\n\nDàn bài xong viết nhanh + ít sai hơn — band 5 cần coherence, không cần ý hay.",
  },
  {
    target: "center",
    title: "Mẹo 2 — Cấu trúc 4 đoạn kinh điển",
    body:
      "Mở bài (paraphrase đề + thesis) → 2 đoạn thân (mỗi đoạn 1 ý chính + 1 ví dụ) → Kết bài (tóm tắt).\n\nĐủ 4 đoạn = ăn được Coherence band 5.",
    highlights: [
      {
        label: "Cụm linking band 5+ nên dùng",
        items: ["Firstly,", "On the other hand,", "For example,", "In conclusion,", "However,"],
      },
    ],
  },
  {
    target: "center",
    title: "Mẹo 3 — Đếm chữ và GIỮ THÌ",
    body:
      "Task 1 ≥ 150 từ, Task 2 ≥ 250 từ — thiếu là mất điểm. Viết về xu hướng quá khứ dùng past simple; tả biểu đồ general dùng present simple. Đừng nhảy thì.",
  },
  {
    target: "center",
    title: "Vào viết thôi!",
    body:
      "Sau khi nộp, Bee sẽ chấm 4 tiêu chí IELTS + chỉ ra lỗi sửa được ngay để bạn áp dụng cho bài sau.",
    ctaLabel: "Bắt đầu viết",
  },
];

export const SPEAKING_DEFAULT_TOUR: TourStep[] = [
  {
    target: "center",
    title: "Bee 🐝 chỉ mẹo Speaking 4→5",
    body:
      "Speaking 4→5 chủ yếu rớt vì im lặng, ngắt quãng, lặp từ. Mình chỉ 3 mẹo để 'cứu band' nhanh.",
    ctaLabel: "OK, chỉ mình",
  },
  {
    target: "center",
    title: "Mẹo 1 — Đừng 'tắc tị' — DÙNG FILLER",
    body:
      "Sai band 5 là im 5 giây. Khi bí, dùng filler tự nhiên: 'Well,…' / 'That's a good question,…' / 'Let me think,…'\n\nNghe tự nhiên hơn nhiều so với 'um... um...'",
    highlights: [
      {
        label: "Filler band 5+ tự nhiên",
        items: ["Well,", "That's a tricky question", "Let me think for a moment", "Actually,", "You know,"],
      },
    ],
  },
  {
    target: "center",
    title: "Mẹo 2 — Trả lời theo 2 LỚP",
    body:
      "Đừng trả lời 1 câu rồi im. Cấu trúc: ý chính → 'because…' → ví dụ ngắn.\n\nVD: 'I love coffee, because it helps me focus — I usually drink one in the morning before class.'",
  },
  {
    target: "center",
    title: "Mẹo 3 — Part 2 dùng đủ 4 dòng cue card",
    body:
      "Mỗi gạch đầu dòng trong cue = 1 ý. Cố nói 30 giây / dòng → đủ 2 phút.\n\nBí ý? Lặp lại bằng cách khác: 'It was really, really memorable. Like, super unforgettable.'",
  },
  {
    target: "center",
    title: "Nói tự nhiên nào!",
    body:
      "Bee sẽ chấm cả Fluency, Lexical, Grammar, Pronunciation. Nói trôi chảy quan trọng hơn hoàn hảo.",
    ctaLabel: "Bắt đầu nói",
  },
];
