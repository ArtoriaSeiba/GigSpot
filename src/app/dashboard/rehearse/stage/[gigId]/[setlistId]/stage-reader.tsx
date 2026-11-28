"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Minus, Pause, Play, Plus } from "lucide-react";
import { ChartText } from "@/components/song-rehearsal-details";
import { chartPreview, shiftSongKey, type SongRehearsal } from "@/lib/song-rehearsal";
import { workspaceErrorMessage, workspaceRequest } from "@/lib/workspace-requests";
import { scrollSpeeds, useStageAutoscroll } from "./use-stage-autoscroll";

type Song = SongRehearsal & { artist: string | null };
type Setlist = { id: string; name: string; songs: { id: string; song: Song }[] };
type GigResponse = { gig: { title: string; setlists: Setlist[] } };
type ReaderState =
  | { status: "loading" | "missing" }
  | { status: "error"; message: string }
  | { status: "ready"; setlist: Setlist; gigTitle: string };

function playingKey(song: Song) {
  if (song.key?.trim()) return { label: "Band Key", value: song.key };
  const soundingKey = song.chordChart?.trim() && shiftSongKey(song.chartKey, song.capo ?? 0);
  if (soundingKey) return { label: "Playing Key", value: soundingKey };
  return song.originalKey?.trim() ? { label: "Original Key", value: song.originalKey } : null;
}

export function StageReader({ gigId, setlistId, fromGig }: {
  gigId: string;
  setlistId: string;
  fromGig: boolean;
}) {
  const [state, setState] = useState<ReaderState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [index, setIndex] = useState(0);
  const [textSize, setTextSize] = useState(20);
  const chartArea = useRef<HTMLDivElement>(null);
  const chartContent = useRef<HTMLDivElement>(null);
  const autoscroll = useStageAutoscroll(chartArea, chartContent, index, state.status === "ready");
  const gigHref = `/dashboard/gigs/${encodeURIComponent(gigId)}`;
  const exit = (
    <Link href={fromGig ? gigHref : "/dashboard/rehearse/stage"} className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-2 text-sm font-medium text-zinc-300 hover:text-white">
      <ArrowLeft aria-hidden="true" className="size-4" /> {fromGig ? "Gig Setlist" : "Choose Setlist"}
    </Link>
  );

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const { gig } = await workspaceRequest<GigResponse>(
          `/api/gigs/${encodeURIComponent(gigId)}`,
          "Could not load this gig setlist.",
          { signal: controller.signal },
        );
        if (controller.signal.aborted) return;
        const setlist = gig.setlists.find((item) => item.id === setlistId);
        setState(setlist ? { status: "ready", setlist, gigTitle: gig.title } : { status: "missing" });
      } catch (error) {
        if (!controller.signal.aborted) {
          setState({ status: "error", message: workspaceErrorMessage(error, "Could not load this gig setlist. Please try again.") });
        }
      }
    }
    void load();
    return () => controller.abort();
  }, [gigId, setlistId, attempt]);

  if (state.status !== "ready" || state.setlist.songs.length === 0) {
    return (
      <div className="space-y-4">
        {exit}
        <section className="workspace-panel space-y-3">
          <h1 className="text-xl font-semibold">Stage View</h1>
          {state.status === "loading" && <p role="status" className="text-sm text-zinc-300">Loading Setlist…</p>}
          {state.status === "missing" && <p role="alert">This setlist is no longer available for the gig.</p>}
          {state.status === "ready" && <p>This setlist has no songs yet. <Link href={gigHref} className="text-violet-200 underline">Open The Gig Setlist</Link></p>}
          {state.status === "error" && (
            <>
              <p role="alert">{state.message}</p>
              <button type="button" className="workspace-secondary" onClick={() => {
                setState({ status: "loading" });
                setAttempt((value) => value + 1);
              }}>Try Again</button>
            </>
          )}
        </section>
      </div>
    );
  }

  const { setlist, gigTitle } = state;
  const { songs } = setlist;
  const { song } = songs[index];
  const next = songs[index + 1]?.song;
  const key = playingKey(song);
  const nextKey = next ? playingKey(next) : null;
  const tempo = song.tempo ?? song.originalTempo;
  const capo = song.capo ?? 0;
  const requestedShapeKey = capo > 0 ? shiftSongKey(key?.value, -capo) : key?.value;
  const preview = song.chordChart ? chartPreview(song.chordChart, song.chartKey, requestedShapeKey) : null;
  const writtenKey = preview?.status === "ready" ? requestedShapeKey : song.chartKey;
  const chartSoundingKey = shiftSongKey(song.chartKey, capo);

  function showSong(destination: number) {
    if (destination < 0 || destination >= songs.length || destination === index) return;
    autoscroll.pause();
    setIndex(destination);
    chartArea.current?.scrollTo({ top: 0, left: 0 });
  }

  return (
    <div data-stage-reader className="mx-auto grid h-dvh min-h-[32rem] max-w-6xl grid-rows-[auto_minmax(0,1fr)_auto] bg-(--gig-surface-deep) sm:border-x sm:border-(--gig-stroke)">
      <header className="workspace-hero min-w-0 border-b px-4 pb-3 sm:px-7 sm:pb-5">
        <div className="flex min-w-0 items-center justify-between gap-2 border-b border-white/8 py-1 sm:py-2">
          {exit}
          <p className="min-w-0 truncate text-right text-sm text-zinc-300">{gigTitle} <span className="hidden sm:inline">· {setlist.name}</span></p>
        </div>
        <div className="grid min-w-0 gap-2 pt-3 sm:grid-cols-[minmax(0,1fr)_minmax(10rem,16rem)] sm:items-end sm:gap-4">
          <div className="min-w-0" aria-live="polite" aria-atomic="true">
            <p className="text-xs font-semibold tabular-nums text-violet-200">Song {index + 1} Of {songs.length}</p>
            <h1 className="mt-1 line-clamp-2 wrap-break-word text-2xl font-bold leading-tight tracking-tight sm:text-4xl">{song.title}</h1>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-zinc-300">
              {song.artist && <span className="min-w-0 wrap-break-word">{song.artist}</span>}
              {key && <span className="min-w-0 wrap-break-word font-semibold text-violet-100">{key.label} {key.value}</span>}
              {tempo != null && <span className="tabular-nums">{song.tempo == null ? "Original " : ""}{tempo} BPM</span>}
            </div>
          </div>
          <label className="flex min-w-0 items-center gap-2 text-xs font-semibold text-zinc-300 sm:grid">
            <span className="shrink-0">Jump To Song</span>
            <select className="workspace-input min-h-10 min-w-0 truncate py-1.5" value={index} onChange={(event) => showSong(Number(event.target.value))}>
              {songs.map((item, position) => <option key={item.id} value={position}>{position + 1}. {item.song.title}</option>)}
            </select>
          </label>
        </div>
      </header>

      <div className="flex min-h-0 min-w-0 flex-col">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-(--gig-stroke) bg-(--gig-surface) px-4 py-1.5 sm:px-7">
          <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <h2 id="stage-chart-title" className="text-sm font-semibold">Chord Chart</h2>
            {preview?.text && capo > 0 && <p className="text-xs font-medium text-violet-200">{writtenKey && `${writtenKey} Shapes · `}Capo {capo}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-1 text-xs text-zinc-300" role="group" aria-label="Chart Text Size">
            <button type="button" aria-label="Decrease Text Size" disabled={textSize === 16} onClick={() => setTextSize((value) => value - 2)} className="workspace-icon-button">
              <Minus aria-hidden="true" className="size-4" />
            </button>
            <span aria-hidden="true" className="min-w-6 text-center font-semibold tabular-nums">{textSize}</span>
            <button type="button" aria-label="Increase Text Size" disabled={textSize === 36} onClick={() => setTextSize((value) => value + 2)} className="workspace-icon-button">
              <Plus aria-hidden="true" className="size-4" />
            </button>
          </div>
          <div className="flex w-full min-w-0 items-center gap-2 pb-1 sm:w-auto sm:pb-0" role="group" aria-label="Autoscroll Controls">
            <button
              type="button"
              className="workspace-secondary min-w-0 flex-1 px-3 sm:min-w-44 sm:flex-none"
              disabled={autoscroll.position === "fits"}
              onClick={autoscroll.toggle}
              title={autoscroll.position === "fits" ? "The chart fits on screen" : undefined}
            >
              {autoscroll.playing ? <Pause aria-hidden="true" className="size-4 shrink-0" /> : <Play aria-hidden="true" className="size-4 shrink-0" />}
              {autoscroll.playing ? "Pause Autoscroll" : autoscroll.position === "end" ? "Restart Autoscroll" : "Autoscroll"}
            </button>
            <select aria-label="Autoscroll Speed" className="workspace-input w-auto shrink-0 disabled:opacity-50" disabled={autoscroll.position === "fits"} value={autoscroll.speed} onChange={(event) => autoscroll.setSpeed(Number(event.target.value))}>
              {scrollSpeeds.map(({ label, pixelsPerSecond }) => <option key={label} value={pixelsPerSecond}>{label}</option>)}
            </select>
          </div>
        </div>
        <div ref={chartArea} role="region" aria-labelledby="stage-chart-title" tabIndex={0}
          className="min-h-0 flex-1 overflow-auto scroll-auto px-4 py-4 sm:px-7"
          onWheel={autoscroll.pause}
          onTouchStart={autoscroll.pause}
          onKeyDown={(event) => {
            if (["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " "].includes(event.key)) autoscroll.pause();
          }}
        >
          <div ref={chartContent} className="flow-root space-y-4">
            {preview?.text ? (
              <>
                {preview.status !== "ready" && (
                  <p className="text-sm text-amber-200">Showing the chart as written{chartSoundingKey ? ` (sounds in ${chartSoundingKey})` : ""}.</p>
                )}
                <pre className="font-mono leading-relaxed whitespace-pre-wrap wrap-break-word text-zinc-100" style={{ fontSize: `${textSize / 16}rem` }}>
                  <ChartText text={preview.text} />
                </pre>
              </>
            ) : <p className="text-sm text-zinc-400">No chord chart has been added for this song.</p>}
            {song.rehearsalNotes?.trim() && (
              <section className="rounded-xl border border-white/10 bg-white/4 p-3 sm:p-4">
                <h3 className="mb-2 text-sm font-semibold text-violet-200">Rehearsal Notes</h3>
                <p className="leading-relaxed whitespace-pre-wrap wrap-break-word text-zinc-200" style={{ fontSize: `${textSize / 16}rem` }}>{song.rehearsalNotes}</p>
              </section>
            )}
          </div>
        </div>
      </div>

      <footer className="border-t border-(--gig-stroke) bg-(--gig-surface) px-4 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-7">
        <div className="flex min-w-0 items-baseline gap-2 text-sm">
          <span className="shrink-0 text-zinc-400">{next ? "Up Next" : "End Of Setlist"}</span>
          {next && <span className="min-w-0 truncate text-violet-100">{next.title}{nextKey && ` · ${nextKey.label} ${nextKey.value}`}</span>}
        </div>
        <nav className="mt-2 grid grid-cols-2 gap-2" aria-label="Setlist Navigation">
          <button type="button" className="workspace-secondary min-h-12 w-full sm:justify-self-start" disabled={index === 0} onClick={() => showSong(index - 1)}>
            <ArrowLeft aria-hidden="true" className="size-4" /> Previous
          </button>
          <button type="button" className="workspace-primary min-h-12 w-full sm:justify-self-end" disabled={!next} onClick={() => showSong(index + 1)}>
            Next <ArrowRight aria-hidden="true" className="size-4" />
          </button>
        </nav>
      </footer>
    </div>
  );
}
