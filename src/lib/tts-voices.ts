/**
 * Deepgram Aura voices offered to learners — different characters and accents
 * (British, American, Australian). Shared by the API route and the UI.
 */
export interface TtsVoice {
  id: string;
  name: string;
  accent: string;
  gender: "Nữ" | "Nam";
}

export const TTS_VOICES: TtsVoice[] = [
  // Anh - Mỹ — Andromeda + Helena are the IELTS Speaking examiner voices.
  // Both sit at the very top of the list because they're the most natural /
  // energetic Aura 2 female American voices and the player rotates between
  // them per session.
  { id: "aura-2-andromeda-en", name: "Andromeda", accent: "Anh - Mỹ", gender: "Nữ" },
  { id: "aura-2-helena-en", name: "Helena", accent: "Anh - Mỹ", gender: "Nữ" },
  { id: "aura-2-aurora-en", name: "Aurora", accent: "Anh - Mỹ", gender: "Nữ" },
  { id: "aura-asteria-en", name: "Asteria", accent: "Anh - Mỹ", gender: "Nữ" },
  { id: "aura-luna-en", name: "Luna", accent: "Anh - Mỹ", gender: "Nữ" },
  { id: "aura-stella-en", name: "Stella", accent: "Anh - Mỹ", gender: "Nữ" },
  { id: "aura-orion-en", name: "Orion", accent: "Anh - Mỹ", gender: "Nam" },
  { id: "aura-arcas-en", name: "Arcas", accent: "Anh - Mỹ", gender: "Nam" },
  { id: "aura-perseus-en", name: "Perseus", accent: "Anh - Mỹ", gender: "Nam" },
  // Anh - Anh
  { id: "aura-athena-en", name: "Athena", accent: "Anh - Anh", gender: "Nữ" },
  { id: "aura-2-pandora-en", name: "Pandora", accent: "Anh - Anh", gender: "Nữ" },
  { id: "aura-helios-en", name: "Helios", accent: "Anh - Anh", gender: "Nam" },
  { id: "aura-2-draco-en", name: "Draco", accent: "Anh - Anh", gender: "Nam" },
  // Anh - Ireland
  { id: "aura-angus-en", name: "Angus", accent: "Anh - Ireland", gender: "Nam" },
  // Anh - Úc
  { id: "aura-2-theia-en", name: "Theia", accent: "Anh - Úc", gender: "Nữ" },
  { id: "aura-2-hyperion-en", name: "Hyperion", accent: "Anh - Úc", gender: "Nam" },
];

export const DEFAULT_VOICE = "aura-2-andromeda-en";

/** Voice IDs the Speaking player rotates between for each new session.
 *  Kept tiny on purpose — the user only wants the natural / energetic
 *  examiner pair, NOT the full catalog. Picked uniformly at random when
 *  the candidate taps "Bắt đầu", then locked for the whole session. */
export const SPEAKING_EXAMINER_VOICES = [
  "aura-2-andromeda-en",
  "aura-2-helena-en",
] as const;

export function isValidVoice(v: string | undefined | null): v is string {
  return !!v && TTS_VOICES.some((voice) => voice.id === v);
}
