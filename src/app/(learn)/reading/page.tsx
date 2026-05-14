import { BookOpen, Clock, FileText, Brain, Trophy } from "lucide-react";
import { SkillIntro } from "@/components/learn/skill-intro";

export const dynamic = "force-dynamic";

export default function ReadingIntroPage() {
  return (
    <SkillIntro
      title="Reading"
      subtitle="4 passages · 60 phút · chuẩn IELTS Academic"
      icon={BookOpen}
      grad="from-emerald-500 to-teal-500"
      startHref="/reading/start"
      bullets={[
        { icon: FileText, text: "4 bài đọc khác nhau, mỗi bài 4-6 câu hỏi (MCQ / Fill-blank / True-False)" },
        { icon: Clock, text: "Tổng thời gian 60 phút — bạn tự phân bổ giữa các passage" },
        { icon: Brain, text: "Đề tự chọn theo target band, không trùng những lần làm gần đây" },
        { icon: Trophy, text: "Sau khi nộp, AI sẽ phân tích kết quả và đưa tips" },
      ]}
    />
  );
}
