/** A single vocabulary card used by every study mode. */
export type StudyCard = {
  id: string;
  term: string;
  definition: string;
  example: string | null;
};
