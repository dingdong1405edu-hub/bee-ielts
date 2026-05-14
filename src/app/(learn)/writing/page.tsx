import { PenLine, Clock, BarChart3, FileText, Trophy } from "lucide-react";
import { SkillIntro } from "@/components/learn/skill-intro";

export const dynamic = "force-dynamic";

export default function WritingIntroPage() {
  return (
    <SkillIntro
      title="Writing"
      subtitle="2 task · 60 phút · AI chấm 4 tiêu chí IELTS"
      icon={PenLine}
      grad="from-rose-500 to-pink-500"
      startHref="/writing/start"
      bullets={[
        { icon: BarChart3, text: "Task 1 (20 phút, ≥150 từ): mô tả biểu đồ / số liệu" },
        { icon: FileText, text: "Task 2 (40 phút, ≥250 từ): essay về một chủ đề" },
        { icon: Clock, text: "Autosave draft. Hết giờ Task 1 tự chuyển Task 2." },
        { icon: Trophy, text: "AI chấm cả 2 task — overall = Task1 × 1/3 + Task2 × 2/3" },
      ]}
    />
  );
}
