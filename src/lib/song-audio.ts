import { bpmValue, CHART_LIMIT, chordParts, parseSongKey, type AudioDraft } from "@/lib/song-rehearsal";

export async function musicRequest<T>(path: string, apiKey: string, body?: object): Promise<T> {
  const response = await fetch(`https://api.music.ai/v1/${path}`, {
    method: body ? "POST" : "GET",
    headers: { Authorization: apiKey, ...(body && { "Content-Type": "application/json" }) },
    ...(body && { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`Music AI request failed (${response.status})`);
  return response.json() as Promise<T>;
}

export function musicStorageUrl(value: string) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.port || url.username || url.password ||
    !["storage.googleapis.com", "cdn.music.ai"].includes(url.hostname)) {
    throw new Error("Unsupported Music AI storage host");
  }
  return url;
}

async function loadChordMap(value: unknown): Promise<unknown> {
  if (typeof value !== "string") return value;
  if (!value.startsWith("https://")) return JSON.parse(value);

  const response = await fetch(musicStorageUrl(value), { redirect: "error", signal: AbortSignal.timeout(15000) });
  if (!response.ok || !response.body) throw new Error("Could not read the chord map");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let content = "";
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    size += chunk.value.byteLength;
    if (size > 2 * 1024 * 1024) {
      await reader.cancel();
      throw new Error("Chord map is too large");
    }
    content += decoder.decode(chunk.value, { stream: true });
  }
  return JSON.parse(content + decoder.decode());
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function detectedChord(value: unknown) {
  if (typeof value !== "string") return null;
  const chord = value.trim()
    .replace(/:maj(?=$|\/)/, "")
    .replace(/:min/, "m")
    .replace(":", "");
  return chordParts(chord) ? chord : null;
}

export function chordMapToChart(map: unknown) {
  const mapFields = record(map);
  const entries = Array.isArray(map) ? map : mapFields.annotations ?? mapFields.chords ?? mapFields.chordMap;
  if (!Array.isArray(entries)) return "";

  const lines: string[] = [];
  let previous = "";
  let length = 0;
  for (const entry of entries) {
    const item = record(entry);
    const classes = record(item.chords ?? item.chord ?? item.classes);
    const chord = [item.chord, item.label, item.simplePop, item.simple_pop, item.complexPop, classes.simplePop,
      classes.simple_pop, classes.complexPop, classes["Simple Pop"], entry].map(detectedChord).find(Boolean);
    if (!chord) {
      previous = "";
      continue;
    }
    if (chord === previous) continue;
    previous = chord;
    const time = item.start ?? item.startTime ?? item.start_time;
    const seconds = typeof time === "number" || typeof time === "string" ? Math.floor(Number(time)) : NaN;
    const timestamp = Number.isFinite(seconds) && seconds >= 0
      ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}  `
      : "";
    const line = `${timestamp}[${chord}]`;
    length += line.length + 1;
    if (length > CHART_LIMIT) break;
    lines.push(line);
  }
  return lines.join("\n");
}

export async function musicDraft(output: unknown): Promise<AudioDraft> {
  const result = record(output);
  const map = result.chordMap ?? result.chords;
  const chart = map == null ? "" : await loadChordMap(map).then(chordMapToChart).catch(() => "");
  return {
    key: typeof result.key === "string" ? parseSongKey(result.key)?.name ?? "" : "",
    bpm: bpmValue(result.bpm),
    chart,
    chartUnavailable: !chart,
  };
}
