import { ReadingTestForm } from "@/components/admin/reading-test-form";
import { ReadingAiImport } from "@/components/admin/reading-ai-import";

export default function NewReadingMockPage() {
  return (
    <div className="space-y-6">
      <ReadingAiImport bank="MOCK" />
      <ReadingTestForm bank="MOCK" />
    </div>
  );
}
