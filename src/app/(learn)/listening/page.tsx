import { Headphones, Clock, Volume2, Brain, Trophy } from "lucide-react";
import { SkillIntro } from "@/components/learn/skill-intro";

export const dynamic = "force-dynamic";

export default function ListeningIntroPage() {
  return (
    <SkillIntro
      title="Listening"
      subtitle="1 audio · 4-6 câu hỏi · audio có speed control"
      icon={Headphones}
      grad="from-amber-500 to-orange-500"
      startHref="/listening/start"
      bullets={[
        { icon: Volume2, text: "Audio có nút điều chỉnh tốc độ 0.75x – 2x" },
        { icon: Clock, text: "Timer riêng cho mỗi bài, hết giờ tự nộp" },
        { icon: Brain, text: "Đề chọn ngẫu nhiên, có cả transcript để review sau khi nộp" },
        { icon: Trophy, text: "Sau khi nộp, AI đưa tips để nghe tốt hơn lần sau" },
      ]}
    />
  );
}
