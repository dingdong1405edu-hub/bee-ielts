"use client";
import { Bookmark } from "lucide-react";

const INSTRUCTIONS: Record<string, string> = {
  MCQ: "Choose the correct letter, A, B, C or D.",
  FILL_BLANK:
    "Complete the sentences below. Choose NO MORE THAN TWO WORDS from the passage for each answer.",
  TRUE_FALSE:
    "Do the following statements agree with the information given in the passage? Write TRUE if the statement agrees, FALSE if it contradicts.",
  TRUE_FALSE_NOT_GIVEN:
    "Do the following statements agree with the information given in the passage? Write TRUE if the statement agrees, FALSE if it contradicts, or NOT GIVEN if there is no information on this.",
  MATCHING:
    "Match each item below with the correct option from the list.",
  MATCHING_HEADINGS:
    "The passage has six paragraphs, A–F. Choose the correct heading for each paragraph from the list of headings below.",
  MATCHING_INFO:
    "The passage has paragraphs labelled A–F. Which paragraph contains the following information? You may use any letter more than once.",
  MATCHING_FEATURES:
    "Look at the following statements and the list of options below. Match each statement with the correct option.",
  MATCHING_SENTENCE_ENDINGS:
    "Complete each sentence with the correct ending from the list below.",
  SHORT_ANSWER:
    "Answer the questions below. Choose NO MORE THAN THREE WORDS from the passage for each answer.",
};

const NICE_NAME: Record<string, string> = {
  MCQ: "Multiple Choice",
  FILL_BLANK: "Sentence Completion",
  TRUE_FALSE: "True / False",
  TRUE_FALSE_NOT_GIVEN: "True / False / Not Given",
  MATCHING: "Matching",
  MATCHING_HEADINGS: "Matching Headings",
  MATCHING_INFO: "Matching Information",
  MATCHING_FEATURES: "Matching Features",
  MATCHING_SENTENCE_ENDINGS: "Matching Sentence Endings",
  SHORT_ANSWER: "Short Answer",
};

export function ReadingGroupHeader({
  type,
  start,
  end,
}: {
  type: string;
  start: number;
  end: number;
}) {
  const range = start === end ? `Question ${start}` : `Questions ${start}–${end}`;
  const instruction = INSTRUCTIONS[type] ?? "";
  const name = NICE_NAME[type] ?? type;
  return (
    <div className="my-4 first:mt-0">
      {/* Big green title like IELTS sample: 'Questions 27–29' */}
      <h3 className="text-lg md:text-xl font-extrabold text-sage-600 dark:text-sage-400">
        {range}
      </h3>
      <div className="mt-1 flex items-center gap-2">
        <Bookmark className="h-4 w-4 text-primary" />
        <span className="text-xs uppercase tracking-wider font-extrabold text-primary">{name}</span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-foreground">{instruction}</p>
      <div className="mt-3 h-px bg-border" />
    </div>
  );
}

/** Compute contiguous groups by type. */
export function computeQuestionGroups<T extends { type: string }>(
  questions: T[],
): { type: string; startIdx: number; endIdx: number }[] {
  const groups: { type: string; startIdx: number; endIdx: number }[] = [];
  for (let i = 0; i < questions.length; i++) {
    const last = groups[groups.length - 1];
    if (!last || last.type !== questions[i].type) {
      groups.push({ type: questions[i].type, startIdx: i, endIdx: i });
    } else {
      last.endIdx = i;
    }
  }
  return groups;
}

/** Returns the group startIdx if i starts a new group, otherwise null. */
export function groupStartFor<T extends { type: string }>(
  questions: T[],
  i: number,
): { start: number; end: number } | null {
  if (i === 0 || questions[i - 1].type !== questions[i].type) {
    let end = i;
    while (end + 1 < questions.length && questions[end + 1].type === questions[i].type) end++;
    return { start: i, end };
  }
  return null;
}
