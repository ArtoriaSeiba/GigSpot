import { chroma, distance, transpose, simplify, enharmonic } from "@tonaljs/note";

export const CHART_LIMIT = 16000;
export const NOTES_LIMIT = 4000;
export const AUDIO_LIMIT = 20 * 1024 * 1024;

export type SongRehearsal = {
  title: string;
  key: string | null;
  tempo: number | null;
  originalKey?: string | null;
  originalTempo?: number | null;
  chartKey?: string | null;
  chordChart?: string | null;
  rehearsalNotes?: string | null;
  tuning?: string | null;
  capo?: number | null;
  recordingAlbum?: string | null;
  recordingYear?: number | null;
  recordingDuration?: number | null;
};

export type RecordingMatch = {
  id: string;
  title: string;
  artist: string;
  album: string;
  year: string;
  originalKey: string;
  originalTempo: number | null;
  source: "itunes" | "getsongbpm";
  duration: number | null;
};

export function formatRecordingDuration(seconds?: number | null) {
  return seconds ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}` : "";
}

export type AudioDraft = {
  key: string;
  bpm: number | null;
  chart: string;
  chartUnavailable?: boolean;
};

export function bpmValue(value: unknown) {
  const number = typeof value === "number" || typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(number) && number >= 1 && number <= 500 ? Math.round(number) : null;
}

function asciiAccidentals(value: string) {
  return value.replaceAll("♭", "b").replaceAll("♯", "#");
}

export function parseSongKey(value?: string | null) {
  const match = asciiAccidentals(value?.trim() ?? "").match(/^([A-Ga-g])([#b]{0,2})\s*(minor|min|major|maj|m|M)?$/i);
  if (!match) return null;
  const [, letter, accidental, quality] = match;
  const root = letter.toUpperCase() + accidental.toLowerCase();
  const minor = quality !== "M" && /^(m|min|minor)$/i.test(quality ?? "");
  return { root, minor, name: root + (minor ? "m" : "") };
}

const chordPattern = /^([A-G][#b]{0,2})((?:(?:maj|min|dim|aug|sus|add|omit|alt|no|m|M|[#b()+°øΔ−+\-\d,])|\/(?![A-G]))*)(?:\/([A-G][#b]{0,2}))?$/;

export function chordParts(value: string) {
  return asciiAccidentals(value).match(chordPattern);
}

export function readChartMetadata(chart: string) {
  const fields: Record<string, string> = {};
  for (const line of chart.split(/\r?\n/)) {
    const directive = line.match(/^\s*\{(title|t|artist|key|tempo|bpm|capo|tuning):\s*([^}]+)\}\s*$/i);
    if (directive) fields[directive[1].toLowerCase()] = directive[2].trim();
  }
  return {
    title: fields.title || fields.t || "",
    artist: fields.artist || "",
    key: parseSongKey(fields.key)?.name ?? "",
    tempo: bpmValue(fields.tempo || fields.bpm),
    capo: /^\d+$/.test(fields.capo ?? "") && Number(fields.capo) <= 24 ? fields.capo : "",
    tuning: fields.tuning || "",
  };
}

export function chartPreview(chart: string, chartKey?: string | null, bandKey?: string | null) {
  const source = parseSongKey(chartKey);
  const target = parseSongKey(bandKey);
  const status = !source ? "source" : !target ? "target" : source.minor !== target.minor ? "mode" : "ready";
  const interval = source && target && status === "ready" ? distance(source.root, target.root) : "";
  const preferFlats = Boolean(target && (/b/.test(target.root) || (target.minor ? ["D", "G", "C", "F"].includes(target.root) : target.root === "F")));

  function shiftNote(note: string) {
    const shifted = transpose(note, interval);
    if (chroma(shifted) === chroma(target!.root)) return target!.root;
    const simple = simplify(shifted);
    if (preferFlats && simple.includes("#")) return enharmonic(simple);
    if (target!.root.includes("#") && simple.includes("b")) return enharmonic(simple);
    return simple;
  }

  function shiftChord(chord: string) {
    if (!interval || interval === "1P") return chord;
    const parts = chordParts(chord);
    if (!parts) return chord;
    const [, root, suffix, bass] = parts;
    return shiftNote(root) + suffix + (bass ? "/" + shiftNote(bass) : "");
  }

  const lines = chart.split(/\r?\n/).flatMap((line) => {
    const directive = line.match(/^\s*\{([^}:]+)(?::\s*(.*?))?\}\s*$/);
    if (directive) {
      const [, name, label] = directive;
      const headings: Record<string, string> = { soc: "Chorus", start_of_chorus: "Chorus", sov: "Verse", start_of_verse: "Verse", sob: "Bridge", start_of_bridge: "Bridge", c: "", comment: "", ci: "", comment_italic: "", cb: "", comment_box: "" };
      return Object.hasOwn(headings, name.toLowerCase()) ? [label || headings[name.toLowerCase()]] : [];
    }
    if (/^\s*#\s/.test(line)) return [];
    if (/\[[^\]]+\]/.test(line)) {
      return [line.replace(/\[([^\]]+)\]/g, (_, symbol: string) => chordParts(symbol) ? `[${shiftChord(symbol)}]` : `[${symbol}]`)];
    }
    const section = line.match(/^([^:]+:\s+)(.*)$/);
    const body = section ? section[2] : line;
    const tokens = body.split(/([\s|:]+)/);
    const symbols = tokens.filter((token) => token && !/^[\s|:]+$/.test(token));
    if (symbols.some(chordParts) && symbols.every((token) => chordParts(token) || /^(?:N\.?C\.?|%|\/|x\d+|-+)$/i.test(token))) {
      return [(section?.[1] ?? "") + tokens.map(shiftChord).join("")];
    }
    return [line];
  });
  return { status, text: lines.join("\n").trim() };
}
