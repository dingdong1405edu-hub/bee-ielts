import { Mic, Clock, Volume2, Brain, Trophy } from "lucide-react";
import { SkillIntro } from "@/components/learn/skill-intro";

export const dynamic = "force-dynamic";

export default function SpeakingIntroPage() {
  return (
    <SkillIntro
      title="Speaking"
      subtitle="3 part · từng câu hỏi một · AI examiner đọc câu hỏi"
      icon={Mic}
      grad="from-indigo-500 to-blue-500"
      startHref="/speaking/start"
      bullets={[
        { icon: Volume2, text: "AI examiner đọc từng câu hỏi (cần bật loa)" },
        { icon: Mic, text: "Cần cho phép truy cập micro để ghi âm" },
        { icon: Clock, text: "Mỗi câu có timer riêng; hết giờ tự chuyển câu tiếp theo" },
        { icon: Brain, text: "Không quay lại được — y như thi thật" },
        { icon: Trophy, text: "AI chấm 4 tiêu chí + cho sample tham khảo + tips" },
      ]}
    />
  );
}
