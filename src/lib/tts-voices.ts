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
  // Anh - Mỹ — Aurora (aura-2) is the default IELTS examiner voice
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

export const DEFAULT_VOICE = "aura-2-aurora-en";

export function isValidVoice(v: string | undefined | null): v is string {
  return !!v && TTS_VOICES.some((voice) => voice.id === v);
}
