"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ChevronDown, Disc3, Search } from "lucide-react";
import { ChartPreview } from "@/components/song-rehearsal-details";
import { CHART_LIMIT, NOTES_LIMIT, formatRecordingDuration, shiftSongKey, type AudioDraft, type RecordingMatch, type SongRehearsal } from "@/lib/song-rehearsal";
import { workspaceErrorMessage, workspaceRequest } from "@/lib/workspace-requests";
import { AudioAnalysis } from "./audio-analysis";
import { ChartLinkImport } from "./chart-link-import";
import type { ImportedChordChart } from "@/lib/jam-jam-chart";

export type RepertoireSong = SongRehearsal & { id: string; artist: string | null };

type RecordingServices = { keyTempo: boolean; freqBlog?: boolean; getSongBpm?: boolean; jamJam?: boolean; audio: boolean };

const fields = ["title", "artist", "originalKey", "originalTempo", "key", "tempo", "chartKey", "chordChart", "rehearsalNotes", "tuning", "capo", "recordingAlbum", "recordingYear", "recordingDuration"] as const;
type Field = typeof fields[number];
export type SongDraft = Record<Field, string>;

function initialDraft(song: RepertoireSong | null): SongDraft {
  const draft = Object.fromEntries(fields.map((field) => [field, String(song?.[field] ?? "")])) as SongDraft;
  if (draft.key === draft.originalKey) draft.key = "";
  if (draft.tempo === draft.originalTempo) draft.tempo = "";
  return draft;
}

export function SongEditor({ song, busy, error, onSave, onCancel }: {
  song: RepertoireSong | null;
  busy: boolean;
  error: string;
  onSave: (draft: SongDraft) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(() => initialDraft(song));
  const [services, setServices] = useState<RecordingServices>();
  const [mode, setMode] = useState<"search" | "manual" | "selected">(song ? "manual" : "search");
  const [titleQuery, setTitleQuery] = useState(song?.title ?? "");
  const [artistQuery, setArtistQuery] = useState("");
  const [search, setSearch] = useState<{ matches?: RecordingMatch[]; message?: string; busy?: boolean; failed?: boolean }>({});
  const [searchAttempt, setSearchAttempt] = useState(0);
  const [enrichment, setEnrichment] = useState<{ busy: boolean; message: string; retry?: RecordingMatch }>({ busy: false, message: "" });
  const [chartStatus, setChartStatus] = useState("");
  const [useRecordingKeyForChart, setUseRecordingKeyForChart] = useState(!song?.chordChart);
  const [audioApplied, setAudioApplied] = useState("");
  const detailsRequest = useRef<AbortController>(null);

  useEffect(() => {
    const controller = new AbortController();
    void workspaceRequest<RecordingServices>("/api/songs/lookup", "Could not check recording services.", { signal: controller.signal })
      .then(setServices)
      .catch(() => { if (!controller.signal.aborted) setServices({ keyTempo: false, audio: false }); });
    return () => {
      controller.abort();
      detailsRequest.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (mode !== "search" || titleQuery.trim().length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearch({ busy: true });
      const query = new URLSearchParams({ title: titleQuery, artist: artistQuery });
      try {
        const { matches } = await workspaceRequest<{ matches: RecordingMatch[] }>(
          `/api/songs/lookup?${query}`, "Recording search is unavailable. You can still add the song manually.", { signal: controller.signal },
        );
        if (!controller.signal.aborted) setSearch({ matches, message: !matches.length ? "No recordings found. Try another title or artist." : undefined });
      } catch (error) {
        if (!controller.signal.aborted) setSearch({ failed: true, message: workspaceErrorMessage(error, "Recording search is unavailable. You can still add the song manually.") });
      }
    }, 600);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [mode, titleQuery, artistQuery, searchAttempt]);

  const capo = Number(draft.capo) || 0;
  const chartKey = draft.chartKey.trim() || (useRecordingKeyForChart && !capo ? draft.originalKey.trim() : "");
  const soundingKey = shiftSongKey(chartKey, capo);
  const bandKey = draft.key.trim() || draft.originalKey.trim() || (draft.chordChart.trim() ? soundingKey : "");
  const shapesFromOriginal = shiftSongKey(draft.originalKey, -capo);
  const recordingInfo = [draft.recordingAlbum, draft.recordingYear, formatRecordingDuration(Number(draft.recordingDuration))].filter(Boolean).join(" · ");

  function update(field: Field, value: string) {
    setDraft((current) => ({
      ...current, [field]: value,
      ...((field === "title" || field === "artist") && current[field].trim().toLowerCase() !== value.trim().toLowerCase()
        && { recordingAlbum: "", recordingYear: "", recordingDuration: "" }),
    }));
    if (field === "chordChart") setChartStatus("");
  }

  async function applyRecording(recording: RecordingMatch) {
    detailsRequest.current?.abort();
    setMode("selected");
    setDraft((current) => ({
      ...current,
      title: recording.title,
      artist: recording.artist,
      recordingAlbum: recording.album,
      recordingYear: recording.year,
      recordingDuration: recording.duration?.toString() ?? "",
      originalKey: recording.originalKey,
      originalTempo: recording.originalTempo?.toString() ?? "",
    }));
    if (recording.source === "getsongbpm") {
      setEnrichment({ busy: false, message: recording.originalKey && recording.originalTempo ? "" : "Some recording details are unavailable." });
      return;
    }
    if (services?.keyTempo === false) {
      setEnrichment({ busy: false, message: "Automatic key and BPM lookup is unavailable. You can enter these under Arrangement, Chart & Notes." });
      return;
    }
    await enrichRecording(recording);
  }

  async function enrichRecording(recording: RecordingMatch) {
    detailsRequest.current?.abort();
    const controller = new AbortController();
    detailsRequest.current = controller;
    setEnrichment({ busy: true, message: "Looking up key and BPM…" });
    const query = new URLSearchParams({
      title: recording.title, artist: recording.artist, album: recording.album,
      itunesId: recording.id, duration: recording.duration?.toString() ?? "", details: "1",
    });
    try {
      const details = await workspaceRequest<Pick<RecordingMatch, "originalKey" | "originalTempo"> & { pending?: boolean }>(
        `/api/songs/lookup?${query}`, "Could not look up key and BPM. You can still save this recording.", { signal: controller.signal },
      );
      if (controller.signal.aborted) return;
      setDraft((current) => ({
        ...current,
        originalKey: current.originalKey || details.originalKey,
        originalTempo: current.originalTempo || details.originalTempo?.toString() || "",
      }));
      setEnrichment({
        busy: false,
        message: details.pending ? "Analysis is still running. Check again in a moment or save the song now."
          : details.originalKey && details.originalTempo ? "" : "Some key or BPM details are unavailable for this recording.",
        retry: details.pending ? recording : undefined,
      });
    } catch {
      if (!controller.signal.aborted) setEnrichment({ busy: false, message: "Could not look up key and BPM. You can still save this recording.", retry: recording });
    }
  }

  function enterManually() {
    detailsRequest.current?.abort();
    if (mode === "search") {
      setDraft((current) => {
        const title = titleQuery.trim() || current.title;
        const artist = artistQuery.trim() || (title === current.title ? current.artist : "");
        return {
          ...current, title, artist,
          ...((title !== current.title || artist !== current.artist) && {
            recordingAlbum: "", recordingYear: "", recordingDuration: "", originalKey: "", originalTempo: "",
          }),
        };
      });
    }
    setEnrichment({ busy: false, message: "" });
    setMode("manual");
  }

  function changeRecording() {
    detailsRequest.current?.abort();
    setEnrichment({ busy: false, message: "" });
    setSearch({});
    setTitleQuery(draft.title);
    setArtistQuery("");
    setMode("search");
  }

  function applyAudio(result: AudioDraft) {
    if (result.chart) {
      setUseRecordingKeyForChart(false);
      setChartStatus("");
    }
    setDraft((current) => ({
      ...current,
      originalKey: result.key || current.originalKey,
      originalTempo: result.bpm?.toString() || current.originalTempo,
      chordChart: result.chart || current.chordChart,
      chartKey: result.chart ? result.key : current.chartKey,
      capo: result.chart ? "" : current.capo,
    }));
    setAudioApplied("Analysis added to the form. Check the recording details and chart before saving.");
  }

  function applyLinkedChart(result: ImportedChordChart) {
    setUseRecordingKeyForChart(false);
    setDraft((current) => ({
      ...current,
      title: current.title || result.title || titleQuery.trim(),
      artist: current.artist || result.artist || artistQuery.trim(),
      chordChart: result.chart,
      chartKey: result.key,
      capo: result.capo?.toString() ?? "",
    }));
    if (mode === "search") setMode("manual");
    setChartStatus("Jam Jam chords added to the draft. Save the song to keep them.");
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || enrichment.busy || mode === "search") return;
    onSave({
      ...draft,
      key: bandKey,
      tempo: draft.tempo || draft.originalTempo,
      chartKey: draft.chordChart.trim() ? chartKey : "",
    });
  }

  function textField(label: string, name: Field, maxLength: number, placeholder?: string, required = false) {
    return (
      <label className="grid min-w-0 gap-1.5 text-sm font-medium">
        {label}
        <input name={name} maxLength={maxLength} placeholder={placeholder} required={required} value={draft[name]} onChange={(event) => update(name, event.target.value)} className="workspace-input" />
      </label>
    );
  }

  function numberField(label: string, name: Field, min: number, max: number, placeholder?: string) {
    return (
      <label className="grid min-w-0 gap-1.5 text-sm font-medium">
        {label}
        <input name={name} type="number" inputMode="numeric" min={min} max={max} step="1" placeholder={placeholder} value={draft[name]} onChange={(event) => update(name, event.target.value)} className="workspace-input" />
      </label>
    );
  }

  return (
    <form onSubmit={submit} onInvalidCapture={(event) => {
      if (event.target instanceof HTMLElement) event.target.closest("details")?.setAttribute("open", "");
    }} className="space-y-4">
      <fieldset disabled={busy} className="min-w-0 space-y-4">
        <section className="space-y-3 rounded-2xl border border-white/10 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold">{mode === "selected" ? "Selected Recording" : mode === "manual" ? "Song Details" : "Find A Recording"}</h3>
            <button type="button" className="rounded px-1 py-1 text-sm font-medium text-violet-200 hover:underline" onClick={mode === "search" ? enterManually : changeRecording}>
              {mode === "search" ? "Add Manually" : mode === "manual" ? "Search Catalog" : "Change Recording"}
            </button>
          </div>
          {mode === "search" && (
            <>
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
                <label className="grid min-w-0 gap-1.5 text-sm font-medium">
                  Song Title
                  <span className="relative block">
                    <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3.5 size-4 text-zinc-400" />
                    <input type="search" value={titleQuery} maxLength={191} placeholder="e.g. Sampai Syurga" className="workspace-input pl-9" onChange={(event) => {
                      setSearch({});
                      setTitleQuery(event.target.value);
                    }} />
                  </span>
                </label>
                <label className="grid min-w-0 gap-1.5 text-sm font-medium">
                  Artist (Optional)
                  <input type="search" value={artistQuery} maxLength={191} placeholder="Filter by artist" className="workspace-input" onChange={(event) => {
                    setSearch({});
                    setArtistQuery(event.target.value);
                  }} />
                </label>
              </div>
              <p role="status" className="text-sm text-zinc-400">{search.busy ? "Searching recordings…" : search.message || (search.matches?.length ? "Choose the artist and version you play." : "Type a song title to see matching recordings.")}</p>
              {search.failed && <button type="button" className="workspace-secondary" onClick={() => {
                setSearch({ busy: true });
                setSearchAttempt((attempt) => attempt + 1);
              }}>Try Again</button>}
              {Boolean(search.matches?.length) && (
                <ul className="max-h-60 divide-y divide-white/10 overflow-auto rounded-xl border border-white/10">
                  {search.matches?.map((match) => (
                    <li key={match.id}>
                      <button type="button" className="flex min-h-14 w-full min-w-0 items-center gap-3 px-3 py-2 text-left hover:bg-violet-400/10 focus-visible:bg-violet-400/10" onClick={() => void applyRecording(match)}>
                        <Disc3 aria-hidden="true" className="size-5 shrink-0 text-violet-200" />
                        <span className="min-w-0 space-y-1">
                          <span className="block wrap-break-word text-sm font-semibold">{match.title} <span className="font-normal text-zinc-300">· {match.artist}</span></span>
                          <span className="block wrap-break-word text-xs text-zinc-400">{[match.album, match.year, formatRecordingDuration(match.duration)].filter(Boolean).join(" · ")}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {search.matches?.some((match) => match.source === "itunes") && <p className="text-xs text-zinc-400">Recording search by iTunes</p>}
            </>
          )}
          {mode === "manual" && (
            <div className="grid gap-3 sm:grid-cols-2">
              {textField("Song Title", "title", 191, undefined, true)}
              {textField("Artist (Optional)", "artist", 191)}
            </div>
          )}
          {mode === "selected" && (
            <>
              <div className="flex items-start gap-3 rounded-xl border border-violet-300/15 bg-violet-400/8 p-3">
                <Disc3 aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-violet-200" />
                <div className="min-w-0 space-y-1">
                  <p className="wrap-break-word font-semibold">{draft.title}</p>
                  <p className="wrap-break-word text-sm text-zinc-300">{draft.artist}</p>
                  {recordingInfo && <p className="wrap-break-word text-xs text-zinc-400">{recordingInfo}</p>}
                  {!enrichment.busy && (
                    <p className="wrap-break-word text-sm text-violet-100">Original Key {draft.originalKey || "Unknown"} · {draft.originalTempo ? `${draft.originalTempo} BPM` : "BPM Unknown"}</p>
                  )}
                </div>
              </div>
              {enrichment.message && <p role="status" className="text-sm text-zinc-400">{enrichment.message}</p>}
              {enrichment.retry && <button type="button" className="workspace-secondary" onClick={() => {
                if (enrichment.retry) void enrichRecording(enrichment.retry);
              }}>Check Key &amp; BPM Again</button>}
            </>
          )}
          {services?.keyTempo && (
            <p className="flex flex-wrap gap-3 text-xs text-zinc-400">
              <span>Key &amp; BPM Sources</span>
              {services.freqBlog && <a href="https://freqblog.com/" target="_blank" rel="noreferrer" className="text-violet-200 underline underline-offset-2">FreqBlog</a>}
              {services.getSongBpm && <a href="https://getsongbpm.com/" target="_blank" rel="noreferrer" className="text-violet-200 underline underline-offset-2">GetSongBPM</a>}
            </p>
          )}
        </section>

        <details className="group rounded-2xl border border-white/10 p-4">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded font-semibold">
            Arrangement, Chart & Notes <ChevronDown aria-hidden="true" className="size-4 shrink-0 transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-4 space-y-4 border-t border-white/10 pt-4">
          {services?.audio && mode !== "search" && <AudioAnalysis onApply={applyAudio} />}
          {audioApplied && <p role="status" className="text-sm text-violet-200">{audioApplied}</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            {textField("Original Key", "originalKey", 50, "e.g. F#m")}
            {numberField("Original Tempo (BPM)", "originalTempo", 1, 500)}
          </div>
          <p className="text-sm text-zinc-400">Leave band key and tempo blank to use the original values. Changing the key shifts the chord preview. Tempo is independent.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {textField("Band Key", "key", 50, draft.originalKey || soundingKey || "e.g. Gm")}
            {numberField("Band Tempo (BPM)", "tempo", 1, 500, draft.originalTempo)}
            {textField("Tuning", "tuning", 100, "e.g. Drop D")}
          </div>
          <label className="grid gap-1.5 text-sm font-medium">
            Rehearsal Notes
            <textarea name="rehearsalNotes" rows={3} maxLength={NOTES_LIMIT} value={draft.rehearsalNotes} onChange={(event) => update("rehearsalNotes", event.target.value)} placeholder="e.g. Count in for two bars. Bass enters in the second verse." className="workspace-input min-h-24 resize-y" />
          </label>
          </div>

        <section className="mt-4 space-y-3 border-t border-white/10 pt-4">
          <h3 className="font-semibold">Chord Chart</h3>
          <ChartLinkImport enabled={services?.jamJam === true} hasChart={Boolean(draft.chordChart.trim())} onApply={applyLinkedChart} />
          <p className="text-sm text-zinc-400">Import from a link or paste a chart. Use square brackets for chords in lyrics, or write chords on their own line.</p>
          {chartStatus && <p role="status" className="text-sm text-violet-200">{chartStatus}</p>}
          <div className="grid max-w-lg grid-cols-2 gap-3">
            {textField("Chord Shape Key", "chartKey", 50, chartKey || "e.g. C")}
            {numberField("Chart Capo Fret", "capo", 0, 24, "0")}
          </div>
          <p className="text-xs text-zinc-400">Enter the key of the chord shapes in Chart Text. C shapes with capo 5 sound in F. {soundingKey && <strong className="text-zinc-200">This chart sounds in {soundingKey}.</strong>}</p>
          {shapesFromOriginal && !chartKey && (
            <button type="button" className="workspace-secondary" onClick={() => update("chartKey", shapesFromOriginal)}>
              Use {shapesFromOriginal} Shapes For Original Key
            </button>
          )}
          <label className="grid gap-1.5 text-sm font-medium">
            Chart Text
            <textarea name="chordChart" rows={5} maxLength={CHART_LIMIT} value={draft.chordChart} onChange={(event) => update("chordChart", event.target.value)} placeholder="Verse: C  G/B  Am  F" spellCheck={false} className="workspace-input min-h-28 resize-y font-mono" />
          </label>
          {draft.chordChart.trim() && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Band Preview (Concert Pitch)</h4>
              <ChartPreview chart={draft.chordChart} from={chartKey} to={bandKey} />
            </div>
          )}
        </section>
        </details>
      </fieldset>
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      <div className="flex flex-wrap justify-end gap-2 border-t border-white/10 pt-4">
        <button type="button" className="workspace-secondary" disabled={busy} onClick={onCancel}>Cancel</button>
        <button type="submit" className="workspace-primary" disabled={busy || enrichment.busy || mode === "search"}>{busy ? "Saving…" : "Save Song"}</button>
      </div>
    </form>
  );
}
