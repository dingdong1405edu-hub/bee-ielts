"use client";
import { useEffect, useState } from "react";
import { Volume2 } from "lucide-react";
import { TTS_VOICES, DEFAULT_VOICE } from "@/lib/tts-voices";

// New storage key — old `bee-tts-voice` is ignored so existing users get the
// new Aurora default instead of an out-of-date Asteria saved choice.
const STORAGE_KEY = "bee-tts-voice-v2";

/** Voice choice persisted in localStorage. Returns [voice, setVoice]. */
export function useTtsVoice(): [string, (v: string) => void] {
  const [voice, setVoiceState] = useState(DEFAULT_VOICE);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && TTS_VOICES.some((v) => v.id === saved)) setVoiceState(saved);
  }, []);

  const setVoice = (v: string) => {
    setVoiceState(v);
    try {
      localStorage.setItem(STORAGE_KEY, v);
    } catch {
      /* ignore */
    }
  };

  return [voice, setVoice];
}

/** Dropdown to pick the Deepgram voice (character + accent) used to read prompts. */
export function VoicePicker({
  voice,
  onChange,
  className,
}: {
  voice: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <label
      className={`inline-flex items-center gap-1.5 rounded-xl border bg-card px-2.5 py-1.5 text-xs font-semibold ${className ?? ""}`}
    >
      <Volume2 className="h-3.5 w-3.5 text-primary shrink-0" />
      <span className="text-muted-foreground hidden sm:inline">Giọng đọc:</span>
      <select
        value={voice}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent outline-none cursor-pointer"
      >
        {[...new Set(TTS_VOICES.map((v) => v.accent))].map((accent) => (
          <optgroup key={accent} label={accent}>
            {TTS_VOICES.filter((v) => v.accent === accent).map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} ({v.gender})
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  );
}
