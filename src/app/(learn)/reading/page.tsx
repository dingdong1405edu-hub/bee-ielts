import { BookOpen, Clock, FileText, Brain, Trophy } from "lucide-react";
import { SkillIntro } from "@/components/learn/skill-intro";

export const dynamic = "force-dynamic";

export default function ReadingIntroPage() {
  return (
    <SkillIntro
      title="Reading"
      subtitle="1 bài đọc mỗi lần luyện tập · không giới hạn thời gian"
      icon={BookOpen}
      grad="from-emerald-500 to-teal-500"
      startHref="/reading/start"
      bullets={[
        { icon: FileText, text: "Mỗi lần luyện tập 1 bài đọc với nhiều câu hỏi (MCQ / Nối tiêu đề / Điền chỗ trống / True-False-Not Given)" },
        { icon: Clock, text: "Không bấm giờ — hệ thống chỉ đếm thời gian bạn đã làm" },
        { icon: Brain, text: "Đề tự chọn, ưu tiên bài chưa làm gần đây" },
        { icon: Trophy, text: "Sau khi nộp, AI sẽ phân tích kết quả và đưa tips. Muốn làm cả 4 bài hãy vào Thi thử." },
      ]}
    />
  );
}
