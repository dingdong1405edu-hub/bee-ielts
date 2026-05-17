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
  { id: "aura-asteria-en", name: "Asteria", accent: "Anh - Mỹ", gender: "Nữ" },
  { id: "aura-orion-en", name: "Orion", accent: "Anh - Mỹ", gender: "Nam" },
  { id: "aura-athena-en", name: "Athena", accent: "Anh - Anh", gender: "Nữ" },
  { id: "aura-helios-en", name: "Helios", accent: "Anh - Anh", gender: "Nam" },
  { id: "aura-2-theia-en", name: "Theia", accent: "Anh - Úc", gender: "Nữ" },
  { id: "aura-2-hyperion-en", name: "Hyperion", accent: "Anh - Úc", gender: "Nam" },
];

export const DEFAULT_VOICE = "aura-asteria-en";

export function isValidVoice(v: string | undefined | null): v is string {
  return !!v && TTS_VOICES.some((voice) => voice.id === v);
}
