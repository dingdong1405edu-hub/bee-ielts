/**
 * Browser-side YouTube caption fetcher. Runs in the admin's browser tab —
 * their home IP is residential, so YouTube's bot detection (which is killing
 * every server-side path on Railway) is irrelevant here. The browser fetches
 * captions via public CORS proxies, parses them, then submits the parsed
 * cues to a thin server endpoint that just runs Claude enrichment + DB write.
 *
 * Flow:
 *   1. Try fetching transcript via CORS proxy → public transcript APIs
 *      (tactiq.io / youtubetranscript.com / kome.ai). These don't have CORS
 *      headers, but routing through a proxy adds them.
 *   2. Parse the response (VTT / XML / JSON) into cues.
 *   3. Return cues to admin UI, which POSTs them to the server.
 *
 * Why we need MULTIPLE proxies: any single proxy gets rate-limited or goes
 * down; we rotate.
 */

export interface BrowserCue {
  text: string;
  offsetSec: number;
  durationSec: number;
}

// Free CORS proxies that historically work for transcript fetching. Tried
// in order — first success wins.
const CORS_PROXIES = [
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
];

async function fetchWithTimeout(url: string, ms: number, init?: RequestInit): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Try a transcript-service URL via every CORS proxy until one succeeds. */
async function viaProxies(targetUrl: string, init?: RequestInit): Promise<Response | null> {
  for (const proxify of CORS_PROXIES) {
    try {
      const r = await fetchWithTimeout(proxify(targetUrl), 15000, init);
      if (r.ok) return r;
    } catch {
      // Try next proxy.
    }
  }
  return null;
}

/** Path A — youtubetranscript.com via CORS proxy. Returns srv3 XML. */
async function tryYoutubeTranscriptDotCom(videoId: string): Promise<BrowserCue[] | null> {
  try {
    const r = await viaProxies(
      `https://youtubetranscript.com/?server_vid2=${videoId}`,
    );
    if (!r) return null;
    const xml = await r.text();
    if (xml.includes("<error>")) return null;
    return parseSrv3OrClassicXml(xml);
  } catch {
    return null;
  }
}

/** Path B — tactiq.io public transcript endpoint via CORS proxy. */
async function tryTactiq(videoId: string): Promise<BrowserCue[] | null> {
  try {
    const r = await viaProxies("https://tactiq-apps-prod.tactiq.io/transcript", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
        langCode: "en",
      }),
    });
    if (!r) return null;
    const data = (await r.json()) as {
      captions?: Array<{ text: string; start: string | number; dur?: string | number }>;
    };
    const rows = data.captions ?? [];
    if (rows.length === 0) return null;
    return rows
      .filter((row) => row.text)
      .map((row) => ({
        text: row.text,
        offsetSec: Number(row.start) || 0,
        durationSec: Math.max(0.3, Number(row.dur ?? 2.5)),
      }));
  } catch {
    return null;
  }
}

/** Path C — direct YouTube timedtext via CORS proxy. The signed URL needs
 *  to come from a player response first, so we hit youtubei /player. */
async function tryDirectTimedText(videoId: string): Promise<BrowserCue[] | null> {
  try {
    // First, get the player response (which contains caption track URLs)
    const playerResp = await viaProxies(
      "https://www.youtube.com/youtubei/v1/player?prettyPrint=false",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context: {
            client: {
              clientName: "ANDROID",
              clientVersion: "20.10.38",
              androidSdkVersion: 34,
              hl: "en",
              gl: "US",
            },
          },
          videoId,
          contentCheckOk: true,
          racyCheckOk: true,
        }),
      },
    );
    if (!playerResp) return null;
    const player = (await playerResp.json()) as {
      captions?: {
        playerCaptionsTracklistRenderer?: {
          captionTracks?: Array<{ baseUrl: string; languageCode?: string }>;
        };
      };
    };
    const tracks =
      player.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];
    const en =
      tracks.find((t) => t.languageCode === "en") ||
      tracks.find((t) => t.languageCode?.startsWith("en"));
    if (!en?.baseUrl) return null;
    const capResp = await viaProxies(en.baseUrl);
    if (!capResp) return null;
    const xml = await capResp.text();
    return parseSrv3OrClassicXml(xml);
  } catch {
    return null;
  }
}

/** Try all browser-side caption paths in order. Returns first non-empty
 *  result. Throws ONLY if every path fails. */
export async function fetchYouTubeCaptionsViaBrowser(
  videoId: string,
): Promise<{ cues: BrowserCue[]; method: string }> {
  const tries: Array<{ name: string; fn: () => Promise<BrowserCue[] | null> }> = [
    { name: "tactiq.io", fn: () => tryTactiq(videoId) },
    { name: "youtubetranscript.com", fn: () => tryYoutubeTranscriptDotCom(videoId) },
    { name: "youtube-timedtext", fn: () => tryDirectTimedText(videoId) },
  ];
  const failures: string[] = [];
  for (const t of tries) {
    try {
      const cues = await t.fn();
      if (cues && cues.length > 0) {
        return { cues, method: t.name };
      }
      failures.push(`${t.name}: 0 cue`);
    } catch (e) {
      failures.push(`${t.name}: ${e instanceof Error ? e.message : e}`);
    }
  }
  throw new Error(
    `Browser-side captions thất bại: ${failures.join(" | ")}. ` +
      "Mở 'Chế độ nâng cao' để paste VTT/SRT thủ công.",
  );
}

/** Parse YouTube srv3 XML <p t="ms" d="ms">text</p> AND classic
 *  <text start="s" dur="s">text</text>. Identical logic to the server-side
 *  parser, duplicated here so the browser bundle stays small (no shared
 *  server util pulled in). */
function parseSrv3OrClassicXml(xml: string): BrowserCue[] {
  const decode = (s: string) =>
    s
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&#x([0-9a-fA-F]+);/g, (_m, h) => String.fromCodePoint(parseInt(h, 16)))
      .replace(/&#(\d+);/g, (_m, n) => String.fromCodePoint(parseInt(n, 10)));
  const cues: BrowserCue[] = [];
  const pRe = /<p\s+t="(\d+)"\s+d="(\d+)"[^>]*>([\s\S]*?)<\/p>/g;
  let m: RegExpExecArray | null;
  while ((m = pRe.exec(xml)) !== null) {
    const text = decode(m[3]).trim();
    if (!text) continue;
    cues.push({
      text,
      offsetSec: parseInt(m[1], 10) / 1000,
      durationSec: Math.max(0.3, parseInt(m[2], 10) / 1000),
    });
  }
  if (cues.length > 0) return cues;
  const tRe = /<text\s+start="([\d.]+)"\s+dur="([\d.]+)"[^>]*>([\s\S]*?)<\/text>/g;
  while ((m = tRe.exec(xml)) !== null) {
    const text = decode(m[3]).trim();
    if (!text) continue;
    cues.push({
      text,
      offsetSec: parseFloat(m[1]),
      durationSec: Math.max(0.3, parseFloat(m[2])),
    });
  }
  return cues;
}
