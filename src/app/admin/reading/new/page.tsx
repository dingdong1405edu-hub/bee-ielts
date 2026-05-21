import { ReadingTestForm } from "@/components/admin/reading-test-form";
import { ReadingAiImport } from "@/components/admin/reading-ai-import";

export default function NewReadingPracticePage() {
  return (
    <div className="space-y-6">
      <ReadingAiImport bank="PRACTICE" />
      <ReadingTestForm bank="PRACTICE" />
    </div>
  );
}
