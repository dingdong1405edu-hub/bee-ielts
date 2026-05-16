/**
 * Lightweight content moderation for the community feed.
 * Blocks profanity / vulgar / provocative wording in English and Vietnamese.
 *
 * Strategy: normalise the text (lowercase, strip Vietnamese diacritics,
 * collapse repeated letters, drop separators used to dodge filters) and then
 * look for any banned token as a substring of the normalised string.
 */

// English profanity / slurs / vulgar terms (normalised, no spaces).
const EN_BAD = [
  "fuck", "fucker", "fucking", "motherfucker", "shit", "bullshit", "bitch",
  "bastard", "asshole", "dickhead", "cunt", "pussy", "cock", "dick", "slut",
  "whore", "nigger", "nigga", "faggot", "retard", "wanker", "jerkoff",
  "cumshot", "blowjob", "handjob", "porn", "pornhub", "xxx", "nsfw", "hentai",
  "rape", "rapist", "pedophile", "molest", "horny", "boobs", "tits", "anal",
  "dildo", "masturbate", "orgasm", "twat", "prick", "skank",
];

// Vietnamese profanity / vulgar terms — written WITHOUT diacritics because the
// checker strips them. Covers common spellings and obfuscations.
const VI_BAD = [
  "ditme", "ditmemay", "dume", "dumemay", "dmm", "vcl", "vl", "vkl", "cmm",
  "clgt", "dkm", "dcm", "dmay", "địtmẹ", "lon", "cailon", "cl", "buom",
  "cac", "caicac", "buoi", "caibuoi", "dau buoi", "daubuoi", "ditconme",
  "thangcho", "concho", "chocheet", "chochet", "doducho", "mecmay", "bome may",
  "dimm", "dume", "dit nhau", "ditnhau", "lambuom", "matday", "mat day",
  "ngucho", "do ngu", "dongu", "thangngu", "connguoi gi", "do cho", "docho",
  "suc vat", "sucvat", "do suc vat", "dosucvat", "khondan", "khon nan",
  "dophanboi", "doplo", "donguoi", "damau", "phimsex", "phim sex", "sex",
  "anchoi gai", "gaimaidam", "maidam", "khieucam", "loanluan", "hiepdam",
  "thudam", "concac", "đồ chó", "đồ ngu", "đồ điên",
];

const BANNED = [...EN_BAD, ...VI_BAD].map(normalise).filter(Boolean);

/** Remove Vietnamese diacritics. */
function stripDiacritics(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d");
}

/**
 * Normalise for matching:
 *  - lowercase
 *  - strip diacritics
 *  - collapse 3+ repeated letters to one (loooon -> lon)
 *  - drop everything that is not a-z or 0-9 (kills spaces, *, ., _, etc.)
 */
function normalise(s: string): string {
  return stripDiacritics(s.toLowerCase())
    .replace(/(.)\1{2,}/g, "$1")
    .replace(/[^a-z0-9]/g, "");
}

export interface ModerationResult {
  ok: boolean;
  /** The first banned term that was detected (for logging, not shown raw). */
  hit?: string;
}

/**
 * Returns { ok: false } if the text contains a banned term.
 * The normalised text removes separators, so "f u c k" and "f.u.c.k"
 * are both caught.
 */
export function moderateText(text: string): ModerationResult {
  const flat = normalise(text);
  if (!flat) return { ok: true };
  for (const term of BANNED) {
    if (term.length >= 2 && flat.includes(term)) {
      return { ok: false, hit: term };
    }
  }
  return { ok: true };
}

export const MODERATION_MESSAGE =
  "Nội dung chứa từ ngữ thô tục hoặc không phù hợp. Vui lòng diễn đạt lịch sự hơn.";
