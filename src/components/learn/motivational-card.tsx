"use client";
import { Sparkles, Heart, Flame, Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

type Mood = "celebrate" | "encourage" | "steady";

interface Quote {
  vi: string;
  en?: string;
  author: string;
}

const QUOTES: Record<Mood, Quote[]> = {
  celebrate: [
    {
      vi: "Tôi tin rằng những điều bất khả thi chỉ là vấn đề của thời gian.",
      author: "Elon Musk",
    },
    {
      vi: "Thiên tài là 1% cảm hứng và 99% mồ hôi.",
      en: "Genius is one percent inspiration and ninety-nine percent perspiration.",
      author: "Thomas Edison",
    },
    {
      vi: "Tương lai thuộc về những ai tin vào vẻ đẹp của giấc mơ mình.",
      en: "The future belongs to those who believe in the beauty of their dreams.",
      author: "Eleanor Roosevelt",
    },
    {
      vi: "Hôm nay bạn đã làm tốt hơn hôm qua — đó chính là tiến bộ.",
      author: "Bee IELTS",
    },
    {
      vi: "Hiện tại tôi đang quan tâm tới tương lai vì tôi sẽ dành phần đời còn lại của mình ở đó.",
      en: "I am interested in the future because I am going to spend the rest of my life there.",
      author: "Charles Kettering",
    },
    {
      vi: "Không có gì là không thể với người luôn cố gắng.",
      author: "Alexander Đại Đế",
    },
  ],
  encourage: [
    {
      vi: "Tôi không thất bại. Tôi chỉ tìm ra 10 nghìn cách không hoạt động.",
      en: "I have not failed. I've just found 10,000 ways that won't work.",
      author: "Thomas Edison",
    },
    {
      vi: "Học, học nữa, học mãi.",
      author: "V. I. Lenin",
    },
    {
      vi: "Không có việc gì khó, chỉ sợ lòng không bền. Đào núi và lấp biển, quyết chí ắt làm nên.",
      author: "Chủ tịch Hồ Chí Minh",
    },
    {
      vi: "Mỗi sai lầm hôm nay là một bài học cho ngày mai. Tiếp tục tiến lên nhé!",
      author: "Bee IELTS",
    },
    {
      vi: "Hiện tại không thể không có nghĩa là mãi mãi không thể.",
      en: "Just because you fail once, doesn't mean you're gonna fail at everything.",
      author: "Marilyn Monroe",
    },
    {
      vi: "Khi bạn muốn từ bỏ, hãy nhớ vì sao mình đã bắt đầu.",
      author: "Khuyết danh",
    },
    {
      vi: "Sự kiên trì là sự khác biệt giữa thành công và thất bại.",
      author: "Nikola Tesla",
    },
    {
      vi: "Đừng so sánh hành trình của bạn với người khác — hãy so với chính bạn của hôm qua.",
      author: "Bee IELTS",
    },
  ],
  steady: [
    {
      vi: "Hành trình ngàn dặm bắt đầu bằng một bước chân.",
      author: "Lão Tử",
    },
    {
      vi: "Thành công là tổng của những nỗ lực nhỏ, lặp đi lặp lại mỗi ngày.",
      en: "Success is the sum of small efforts, repeated day in and day out.",
      author: "Robert Collier",
    },
    {
      vi: "Đi chậm thôi nhưng đừng bao giờ dừng lại.",
      en: "It does not matter how slowly you go as long as you do not stop.",
      author: "Khổng Tử",
    },
    {
      vi: "Bạn đang đi đúng hướng. Cứ giữ phong độ này nhé.",
      author: "Bee IELTS",
    },
  ],
};

function pickMood(currentBand: number, targetBand: number): Mood {
  const diff = currentBand - targetBand;
  if (diff >= 0.5) return "celebrate";
  if (diff <= -0.5) return "encourage";
  return "steady";
}

function pickQuote(mood: Mood, seed: number): Quote {
  const list = QUOTES[mood];
  return list[seed % list.length];
}

export function MotivationalCard({
  currentBand,
  targetBand,
}: {
  currentBand: number;
  targetBand: number;
}) {
  const mood = pickMood(currentBand, targetBand);
  // Use the band number as a deterministic seed so the same result shows the same quote
  const seed = Math.floor(currentBand * 10) + Math.floor(targetBand * 10);
  const quote = pickQuote(mood, seed);

  const config = {
    celebrate: {
      Icon: Star,
      headline: "🎉 Tuyệt vời — bạn đã vượt target!",
      message: `Điểm hôm nay (${currentBand.toFixed(1)}) đã vượt mục tiêu ${targetBand.toFixed(1)} của bạn. Cứ giữ phong độ này nhé!`,
      gradient: "from-gold-400 via-gold-500 to-rose-500",
      bg: "from-gold-50 to-rose-50 dark:from-gold-950/30 dark:to-rose-950/30",
      border: "border-gold-300/40",
    },
    encourage: {
      Icon: Heart,
      headline: "🐝 Cố lên — bạn sẽ đạt được mục tiêu!",
      message: `Điểm hôm nay (${currentBand.toFixed(1)}) còn cách mục tiêu ${targetBand.toFixed(1)} — nhưng mỗi lần luyện tập là một bước tiến gần hơn.`,
      gradient: "from-honey via-gold-400 to-honey-deep",
      bg: "from-honey-tint to-gold-50 dark:from-honey-deep/30 dark:to-gold-950/30",
      border: "border-honey/40",
    },
    steady: {
      Icon: Flame,
      headline: "🔥 Bạn đang đi đúng hướng",
      message: `Điểm hôm nay (${currentBand.toFixed(1)}) đã rất gần mục tiêu ${targetBand.toFixed(1)}. Một chút nữa thôi!`,
      gradient: "from-sage-500 via-teal-500 to-primary",
      bg: "from-sage-50 to-primary/10 dark:from-sage-950/30 dark:to-primary/10",
      border: "border-sage-300/40",
    },
  }[mood];

  const { Icon } = config;

  return (
    <Card className={`border-2 ${config.border} bg-gradient-to-br ${config.bg}`}>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start gap-3">
          <div className={`grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br ${config.gradient} text-white shrink-0`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-extrabold leading-tight">{config.headline}</h3>
            <p className="text-sm text-muted-foreground mt-1">{config.message}</p>
          </div>
        </div>

        <blockquote className="border-l-4 border-foreground/20 pl-4 py-1">
          <div className="flex items-start gap-2">
            <Sparkles className="h-4 w-4 text-foreground/40 shrink-0 mt-0.5" />
            <div>
              <p className="text-[15px] leading-relaxed italic font-medium">"{quote.vi}"</p>
              {quote.en && <p className="text-xs text-muted-foreground italic mt-1">"{quote.en}"</p>}
              <p className="text-xs font-bold text-foreground/60 mt-1">— {quote.author}</p>
            </div>
          </div>
        </blockquote>
      </CardContent>
    </Card>
  );
}
