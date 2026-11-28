import { chartPreview, formatRecordingDuration, shiftSongKey, type SongRehearsal } from "@/lib/song-rehearsal";

export function ChartPreview({ chart, from, to }: { chart: string; from?: string | null; to?: string | null }) {
  const { status, text } = chartPreview(chart, from, to);
  const message = {
    source: "Showing the written chart. Set its chord shape key to enable transposition.",
    target: "Showing the written chart. Set a valid band key to transpose it.",
    mode: "Showing the written chart. Transposition needs matching major or minor modes.",
    ready: "",
  }[status];
  return (
    <div className="space-y-2">
      {message && <p className="text-sm text-amber-200">{message}</p>}
      {text ? (
        <pre className="max-h-72 overflow-auto rounded-xl border border-white/10 bg-black/20 p-3 font-mono text-sm leading-relaxed whitespace-pre-wrap wrap-break-word text-zinc-200">
          <ChartText text={text} />
        </pre>
      ) : <p className="text-sm text-zinc-400">The chart has no playable text.</p>}
    </div>
  );
}

export function ChartText({ text }: { text: string }) {
  return text.split(/(\[[^\]\n]+\])/).map((part, index) => part.startsWith("[") && part.endsWith("]")
    ? <strong key={index} className="font-semibold text-violet-200">{part}</strong>
    : part);
}

export function SongRehearsalDetails({ song }: { song: SongRehearsal }) {
  const recording = [song.recordingAlbum, song.recordingYear, formatRecordingDuration(song.recordingDuration)].filter(Boolean).join(" · ");
  const soundingKey = shiftSongKey(song.chartKey, song.capo ?? 0);
  const settings = [
    ["Band Key", song.key],
    ["Band Tempo", song.tempo && `${song.tempo} BPM`],
    ["Original Key", song.originalKey],
    ["Original Tempo", song.originalTempo && `${song.originalTempo} BPM`],
    ["Tuning", song.tuning],
    ["Chart Capo", song.capo != null ? song.capo === 0 ? "None" : `Fret ${song.capo}` : null],
  ].filter(([, value]) => value);
  return (
    <div className="min-w-0 space-y-4">
      {recording && (
        <dl className="rounded-xl border border-white/10 bg-white/3 px-3 py-2">
          <dt className="text-xs text-zinc-400">Recording</dt>
          <dd className="wrap-break-word text-sm font-semibold">{recording}</dd>
        </dl>
      )}
      {settings.length > 0 && (
        <dl className="grid grid-cols-2 gap-2">
          {settings.map(([label, value]) => (
            <div key={label} className="min-w-0 rounded-xl border border-white/10 bg-white/3 px-3 py-2">
              <dt className="text-xs text-zinc-400">{label}</dt>
              <dd className="wrap-break-word text-sm font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {song.chordChart && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Chord Chart</h3>
          {Boolean(song.capo) && (
            <details className="space-y-2">
              <summary className="cursor-pointer text-sm text-violet-200">Show Guitar Shapes With Capo {song.capo}</summary>
              {song.chartKey && <p className="text-xs text-zinc-400">{song.chartKey} shapes sound in {soundingKey} with this capo.</p>}
              <ChartPreview chart={song.chordChart} from={song.chartKey} to={song.chartKey} />
            </details>
          )}
          {Boolean(song.capo) && <p className="text-xs text-zinc-400">Band Preview (Concert Pitch)</p>}
          <ChartPreview chart={song.chordChart} from={song.chartKey} to={song.key || soundingKey} />
        </section>
      )}
      {song.rehearsalNotes && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Band Notes</h3>
          <p className="max-h-52 overflow-auto text-sm whitespace-pre-wrap wrap-break-word text-zinc-300">{song.rehearsalNotes}</p>
        </section>
      )}
      {!song.chordChart && !song.rehearsalNotes && <p className="text-sm text-zinc-400">Your band hasn’t added a chord chart or rehearsal notes for this song yet.</p>}
    </div>
  );
}
