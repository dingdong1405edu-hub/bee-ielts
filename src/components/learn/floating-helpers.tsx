"use client";
import dynamic from "next/dynamic";

/**
 * Floating helpers wrapper. The two children ship ~270 lines of client JS
 * (AddWordButton modal + PopQuiz scheduler) but neither matters during the
 * initial page paint — they only become useful once the user has settled
 * on a page. By dynamic-importing them with `ssr: false` we keep them off
 * the critical bundle so the learn layout hydrates faster on every
 * navigation. The wrapper itself is tiny.
 */
const AddWordButton = dynamic(
  () =>
    import("@/components/words/add-word-button").then((m) => ({
      default: m.AddWordButton,
    })),
  { ssr: false },
);
const PopQuiz = dynamic(
  () =>
    import("@/components/words/pop-quiz").then((m) => ({ default: m.PopQuiz })),
  { ssr: false },
);

export function FloatingHelpers({ popQuizEnabled }: { popQuizEnabled: boolean }) {
  return (
    <>
      <AddWordButton />
      <PopQuiz enabled={popQuizEnabled} />
    </>
  );
}
