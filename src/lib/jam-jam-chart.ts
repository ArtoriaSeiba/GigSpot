import { detectChordsFromFile, type ChordSegment } from "@/lib/chord-detector";
import { CHART_LIMIT, chordParts, chartPreview, parseSongKey, shiftSongKey } from "@/lib/song-rehearsal";

export type ImportedChordChart = {
  title: string;
  artist: string;
  key: string;
  capo: number | null;
  chart: string;
  localAudio?: true;
};

export type ChartImportStatus =
  | { status: "pending"; retryAfter: number }
  | { status: "complete"; charts: ImportedChordChart[] }
  | { status: "failed"; message: string };

function fields(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function label(value: unknown) {
  return typeof value === "string" ? value.replace(/[\r\n{}\[\]]/g, " ").trim().slice(0, 191) : "";
}

function chordLine(value: unknown) {
  const chords = Array.isArray(value) ? value : typeof value === "string" ? value.split(/\s+/) : [];
  return chords.flatMap((entry) => {
    const chord = typeof entry === "string" ? entry : fields(entry).symbol ?? fields(entry).chord ?? fields(entry).name;
    if (typeof chord !== "string") return [];
    const symbol = chord.trim();
    if (/^(?:N|N\.?C\.?)$/i.test(symbol)) return ["[N.C.]"];
    return chordParts(symbol) ? [`[${symbol}]`] : [];
  }).join(" ");
}

export function readJamJamCharts(value: unknown): ImportedChordChart[] {
  const book = fields(value);
  if (book.format !== "jam-songbook" || book.version !== 1 || !Array.isArray(book.songs)) return [];
  return book.songs.flatMap((entry) => {
    const song = fields(entry);
    const sections = Array.isArray(song.sections) ? song.sections : [];
    const chart = sections.flatMap((entry) => {
      const section = fields(entry);
      const lines = Array.isArray(section.lines) ? section.lines : [];
      const progression = lines.map((line) => chordLine(fields(line).chords)).filter(Boolean);
      if (!progression.length) return [];
      const heading = label(section.label);
      return [heading ? `{comment: ${heading}}\n${progression.join("\n")}` : progression.join("\n")];
    }).join("\n\n");
    if (!chart || chart.length > CHART_LIMIT || !/\[[A-G]/.test(chart)) return [];
    const detected = fields(song.detectedKey);
    const concertKey = parseSongKey(label(detected.tonic) + " " + label(detected.scale))?.name ?? parseSongKey(label(song.key))?.name ?? "";
    const rawCapo = fields(song.metadata).capo ?? song.capo;
    const capoNumber = typeof rawCapo === "string" && /^\d{1,2}$/.test(rawCapo) ? Number(rawCapo) : rawCapo;
    const capo = typeof capoNumber === "number" && Number.isInteger(capoNumber) && capoNumber >= 0 && capoNumber <= 24 ? capoNumber : null;
    const key = shiftSongKey(concertKey, -(capo ?? 0));
    // Jam Jam stores chords at sounding pitch, with the capo stored separately.
    const shapes = capo ? chartPreview(chart, concertKey || "C", key || shiftSongKey("C", -capo), true).text : chart;
    if (shapes.length > CHART_LIMIT) return [];
    return [{
      title: label(song.title),
      artist: label(song.artist ?? song.performer),
      key,
      capo,
      chart: shapes,
    }];
  }).slice(0, 8);
}

function formatBtcChordSymbol(rawChord: string): string {
  if (!rawChord || rawChord === "N" || rawChord === "X") return "N.C.";
  const [root, quality] = rawChord.split(":");
  if (!root) return "N.C.";

  const qualityMap: Record<string, string> = {
    maj: "",
    min: "m",
    "7": "7",
    maj7: "maj7",
    min7: "m7",
    minmaj7: "mMaj7",
    dim: "dim",
    dim7: "dim7",
    hdim7: "m7b5",
    aug: "aug",
    sus2: "sus2",
    sus4: "sus4",
    maj6: "6",
    min6: "m6",
  };

  return `${root}${qualityMap[quality] ?? ""}`;
}

export async function detectLocalJamJamCharts(file: File): Promise<ImportedChordChart[]> {
  const segments: ChordSegment[] = await detectChordsFromFile(file);

  // Filter out tiny <0.35s detection blips and map BTC labels to standard chord symbols
  const cleanedChords = segments
    .filter((seg) => seg.end - seg.start >= 0.35)
    .map((seg) => formatBtcChordSymbol(seg.chord))
    .filter((symbol, idx, arr) => idx === 0 || symbol !== arr[idx - 1]);

  if (!cleanedChords.length) return [];

  // Group into 4 chords per line, and 4 lines per section
  const lines: string[][] = [];
  for (let i = 0; i < cleanedChords.length; i += 4) {
    lines.push(cleanedChords.slice(i, i + 4));
  }

  const sections = [];
  for (let i = 0; i < lines.length; i += 4) {
    sections.push({
      label: `Section ${sections.length + 1}`,
      lines: lines.slice(i, i + 4).map((chords) => ({ chords })),
    });
  }

  const title = file.name.replace(/\.[^/.]+$/, "");

  // Pass through GigSpot's existing parser for validation and key formatting
  return readJamJamCharts({
    format: "jam-songbook",
    version: 1,
    songs: [
      {
        title,
        artist: "",
        capo: 0,
        sections,
      },
    ],
  }).map((chart) => ({ ...chart, localAudio: true }));
}
