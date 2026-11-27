import { CHART_LIMIT, chordParts, chartPreview, parseSongKey, shiftSongKey } from "@/lib/song-rehearsal";

export type ImportedChordChart = {
  title: string;
  artist: string;
  key: string;
  capo: number | null;
  chart: string;
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
