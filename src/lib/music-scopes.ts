// One source of truth for background-music scoping. Admin assigns each
// track to one or more of these scopes, and the client player asks
// `scopeForPathname()` which scope the current page belongs to. Returning
// null means: the user is in a focused exercise/test — kill the music so
// it doesn't compete with the lesson audio.

export const MUSIC_SCOPES = [
  { value: "HOME", label: "Trang chủ (Dashboard)" },
  { value: "PROFILE", label: "Hồ sơ" },
  { value: "COMMUNITY", label: "Cộng đồng" },
  { value: "BAND_CLIMBER", label: "Vượt band" },
  { value: "VOCAB", label: "Vocabulary (danh sách)" },
  { value: "GRAMMAR", label: "Grammar (danh sách)" },
  { value: "READING", label: "Reading (danh sách)" },
  { value: "LISTENING", label: "Listening (danh sách)" },
  { value: "WRITING", label: "Writing (danh sách)" },
  { value: "SPEAKING", label: "Speaking (danh sách)" },
  { value: "WORDS", label: "Học từ" },
  { value: "MOCK", label: "Thi thử (landing)" },
] as const;

export type MusicScope = (typeof MUSIC_SCOPES)[number]["value"];

const SCOPE_SET = new Set<string>(MUSIC_SCOPES.map((s) => s.value));
export function isMusicScope(v: unknown): v is MusicScope {
  return typeof v === "string" && SCOPE_SET.has(v);
}

/**
 * Map a pathname to a MusicScope, or null when the user is inside an actual
 * exercise / test runner (the music must stop there).
 *
 * The rule: a section's *landing/listing* pages keep music on; the *runner*
 * pages (lessons, tests, sessions, the band-climber sub-routes) turn it off.
 */
export function scopeForPathname(pathname: string): MusicScope | null {
  if (!pathname) return null;

  // Strip query/hash just in case (usePathname() never includes them but
  // be defensive).
  const path = pathname.split("?")[0].split("#")[0];

  // ---- Always-off (focused runners) — check these BEFORE the section
  // landing matchers because /vocab/ABC123 should be off even though it
  // shares a prefix with /vocab.
  const offPatterns: RegExp[] = [
    /^\/vocab\/[^/]+$/,
    /^\/grammar\/[^/]+$/,
    /^\/reading\/[^/]+\/?$/, // /reading/{testId}
    /^\/listening\/[^/]+\/?$/,
    /^\/writing\/[^/]+\/?$/,
    /^\/speaking\/[^/]+\/?$/,
    /^\/(reading|listening|writing|speaking)\/session\/?$/,
    /^\/mock\/test\/?$/,
    /^\/words\/[^/]+\/?$/,
    /^\/band-climber\/[^/]+\/(reading|listening|writing|speaking|mini-quiz)\//,
  ];
  for (const re of offPatterns) {
    if (re.test(path)) return null;
  }

  // ---- Section landings & review/start pages keep music ON.
  if (path === "/dashboard" || path.startsWith("/dashboard/")) return "HOME";
  if (path === "/profile" || path.startsWith("/profile/")) return "PROFILE";
  if (path === "/community" || path.startsWith("/community/")) return "COMMUNITY";
  if (path === "/band-climber" || path.startsWith("/band-climber/")) return "BAND_CLIMBER";
  if (path === "/words") return "WORDS";
  if (path === "/mock" || path.startsWith("/mock/review/")) return "MOCK";
  if (path === "/vocab") return "VOCAB";
  if (path === "/grammar") return "GRAMMAR";
  if (path === "/reading" || path.startsWith("/reading/review/") || path === "/reading/start") return "READING";
  if (path === "/listening" || path.startsWith("/listening/review/") || path === "/listening/start") return "LISTENING";
  if (path === "/writing" || path.startsWith("/writing/review/") || path === "/writing/start") return "WRITING";
  if (path === "/speaking" || path.startsWith("/speaking/review/") || path === "/speaking/start") return "SPEAKING";

  return null;
}
