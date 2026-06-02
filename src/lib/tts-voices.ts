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
  // Anh - Mỹ — Thalia / Phoebe / Asteria-2 are the IELTS examiner pool.
  // All three are Deepgram-tagged "energetic" in Aura 2 — the closest match
  // to the lively, real-person voice the user asked for. Listed first so
  // admin sees the recommended trio at the top of the picker.
  { id: "aura-2-thalia-en", name: "Thalia", accent: "Anh - Mỹ", gender: "Nữ" },
  { id: "aura-2-phoebe-en", name: "Phoebe", accent: "Anh - Mỹ", gender: "Nữ" },
  { id: "aura-2-asteria-en", name: "Asteria 2", accent: "Anh - Mỹ", gender: "Nữ" },
  { id: "aura-2-andromeda-en", name: "Andromeda", accent: "Anh - Mỹ", gender: "Nữ" },
  { id: "aura-2-helena-en", name: "Helena", accent: "Anh - Mỹ", gender: "Nữ" },
  { id: "aura-2-aurora-en", name: "Aurora", accent: "Anh - Mỹ", gender: "Nữ" },
  { id: "aura-asteria-en", name: "Asteria (v1)", accent: "Anh - Mỹ", gender: "Nữ" },
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

export const DEFAULT_VOICE = "aura-2-thalia-en";

/** Voice IDs the Speaking player rotates between for each new session.
 *  Picked uniformly at random when the candidate taps "Bắt đầu", then
 *  locked for the whole session. Limited to Deepgram's "energetic"-tagged
 *  Aura 2 voices because anything else sounded too AI in user testing. */
export const SPEAKING_EXAMINER_VOICES = [
  "aura-2-thalia-en",
  "aura-2-phoebe-en",
  "aura-2-asteria-en",
] as const;

/**
 * Every Aura 2 voice Deepgram currently exposes. Used by the /admin/voice-test
 * page so admin can preview each one with a sample line and identify which
 * matches their reference recording. NOT used directly by the player —
 * SPEAKING_EXAMINER_VOICES is the actual pool.
 */
export interface AuraVoicePreview {
  id: string;
  name: string;
  gender: "Nữ" | "Nam";
  accent: string;
  blurb: string;
}

export const ALL_AURA2_VOICES: AuraVoicePreview[] = [
  // Female American — the most relevant group for IELTS examiner voice.
  { id: "aura-2-thalia-en",     name: "Thalia",     gender: "Nữ",  accent: "Mỹ",     blurb: "Energetic & enthusiastic" },
  { id: "aura-2-phoebe-en",     name: "Phoebe",     gender: "Nữ",  accent: "Mỹ",     blurb: "Energetic & warm" },
  { id: "aura-2-asteria-en",    name: "Asteria 2",  gender: "Nữ",  accent: "Mỹ",     blurb: "Knowledgeable & energetic" },
  { id: "aura-2-andromeda-en",  name: "Andromeda",  gender: "Nữ",  accent: "Mỹ",     blurb: "Casual & conversational" },
  { id: "aura-2-helena-en",     name: "Helena",     gender: "Nữ",  accent: "Mỹ",     blurb: "Caring & natural" },
  { id: "aura-2-aurora-en",     name: "Aurora",     gender: "Nữ",  accent: "Mỹ",     blurb: "Friendly & clear" },
  { id: "aura-2-callista-en",   name: "Callista",   gender: "Nữ",  accent: "Mỹ",     blurb: "Clear & professional" },
  { id: "aura-2-cora-en",       name: "Cora",       gender: "Nữ",  accent: "Mỹ",     blurb: "Smooth & natural" },
  { id: "aura-2-cordelia-en",   name: "Cordelia",   gender: "Nữ",  accent: "Mỹ",     blurb: "Warm & expressive" },
  { id: "aura-2-delia-en",      name: "Delia",      gender: "Nữ",  accent: "Mỹ",     blurb: "Friendly & natural" },
  { id: "aura-2-electra-en",    name: "Electra",    gender: "Nữ",  accent: "Mỹ",     blurb: "Professional & engaging" },
  { id: "aura-2-harmonia-en",   name: "Harmonia",   gender: "Nữ",  accent: "Mỹ",     blurb: "Smooth & balanced" },
  { id: "aura-2-hera-en",       name: "Hera",       gender: "Nữ",  accent: "Mỹ",     blurb: "Confident" },
  { id: "aura-2-iris-en",       name: "Iris",       gender: "Nữ",  accent: "Mỹ",     blurb: "Bright & expressive" },
  { id: "aura-2-janus-en",      name: "Janus",      gender: "Nữ",  accent: "Mỹ",     blurb: "Calm & clear" },
  { id: "aura-2-juno-en",       name: "Juno",       gender: "Nữ",  accent: "Mỹ",     blurb: "Authoritative & warm" },
  { id: "aura-2-luna-en",       name: "Luna",       gender: "Nữ",  accent: "Mỹ",     blurb: "Soft & friendly" },
  { id: "aura-2-minerva-en",    name: "Minerva",    gender: "Nữ",  accent: "Mỹ",     blurb: "Confident & wise" },
  { id: "aura-2-ophelia-en",    name: "Ophelia",    gender: "Nữ",  accent: "Mỹ",     blurb: "Gentle & expressive" },
  { id: "aura-2-selene-en",     name: "Selene",     gender: "Nữ",  accent: "Mỹ",     blurb: "Calm & professional" },
  { id: "aura-2-vesta-en",      name: "Vesta",      gender: "Nữ",  accent: "Mỹ",     blurb: "Warm & engaging" },
  // Male American.
  { id: "aura-2-apollo-en",     name: "Apollo",     gender: "Nam", accent: "Mỹ",     blurb: "Confident & casual" },
  { id: "aura-2-arcas-en",      name: "Arcas",      gender: "Nam", accent: "Mỹ",     blurb: "Smooth & comfortable" },
  { id: "aura-2-aries-en",      name: "Aries",      gender: "Nam", accent: "Mỹ",     blurb: "Warm & energetic" },
  { id: "aura-2-atlas-en",      name: "Atlas",      gender: "Nam", accent: "Mỹ",     blurb: "Enthusiastic" },
  { id: "aura-2-hermes-en",     name: "Hermes",     gender: "Nam", accent: "Mỹ",     blurb: "Expressive & engaging" },
  { id: "aura-2-jupiter-en",    name: "Jupiter",    gender: "Nam", accent: "Mỹ",     blurb: "Deep & confident" },
  { id: "aura-2-mars-en",       name: "Mars",       gender: "Nam", accent: "Mỹ",     blurb: "Bold & direct" },
  { id: "aura-2-neptune-en",    name: "Neptune",    gender: "Nam", accent: "Mỹ",     blurb: "Calm & smooth" },
  { id: "aura-2-odysseus-en",   name: "Odysseus",   gender: "Nam", accent: "Mỹ",     blurb: "Narrative & rich" },
  { id: "aura-2-orion-en",      name: "Orion",      gender: "Nam", accent: "Mỹ",     blurb: "Friendly & natural" },
  { id: "aura-2-orpheus-en",    name: "Orpheus",    gender: "Nam", accent: "Mỹ",     blurb: "Professional & clear" },
  { id: "aura-2-pluto-en",      name: "Pluto",      gender: "Nam", accent: "Mỹ",     blurb: "Smooth & engaging" },
  { id: "aura-2-saturn-en",     name: "Saturn",     gender: "Nam", accent: "Mỹ",     blurb: "Deep & serious" },
  { id: "aura-2-zeus-en",       name: "Zeus",       gender: "Nam", accent: "Mỹ",     blurb: "Deep & resonant" },
  // Non-American.
  { id: "aura-2-pandora-en",    name: "Pandora",    gender: "Nữ",  accent: "Anh",    blurb: "Bright British" },
  { id: "aura-2-athena-en",     name: "Athena 2",   gender: "Nữ",  accent: "Anh",    blurb: "Polished British" },
  { id: "aura-2-draco-en",      name: "Draco",      gender: "Nam", accent: "Anh",    blurb: "Confident British" },
  { id: "aura-2-theia-en",      name: "Theia",      gender: "Nữ",  accent: "Úc",     blurb: "Bright Australian" },
  { id: "aura-2-hyperion-en",   name: "Hyperion",   gender: "Nam", accent: "Úc",     blurb: "Warm Australian" },
  { id: "aura-2-amalthea-en",   name: "Amalthea",   gender: "Nữ",  accent: "Filipino", blurb: "Cheerful & expressive" },
];

export function isValidVoice(v: string | undefined | null): v is string {
  return !!v && TTS_VOICES.some((voice) => voice.id === v);
}
