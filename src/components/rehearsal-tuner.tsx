"use client";

import { useId, useState } from "react";
import { AudioLines, ChevronDown, Guitar, Maximize2, Mic, Music2, Square } from "lucide-react";
import { WorkspaceDialog } from "@/components/workspace-dialog";
import { useTuner } from "@/components/use-tuner";
import { centsFromNote, nearestNote, noteFrequency, noteName } from "@/lib/tuner-pitch";
import { tunerInstruments } from "@/lib/tuner-presets";

const referencePitches = [432, 438, 439, 440, 441, 442, 443, 444];
const meterTicks = Array.from({ length: 21 }, (_, index) => index - 10);

function PitchMeter({ cents, tuned, compact }: { cents: number | null; tuned: boolean; compact: boolean }) {
  return (
    <div aria-hidden="true">
      <div className={`relative flex items-end justify-between rounded-lg border border-white/10 bg-black/20 px-2 pb-2 ${compact ? "h-7" : "h-12 sm:h-14"}`}>
        <div className="relative flex h-full w-full items-end justify-between">
          <span className="absolute inset-y-0 left-[47%] w-[6%] rounded-b bg-emerald-400/15" />
          {meterTicks.map((tick) => (
            <span key={tick} className={`w-px ${tick === 0 ? "h-3/4 bg-emerald-300/80" : tick % 5 === 0 ? "h-1/2 bg-violet-200/45" : "h-1/4 bg-violet-200/20"}`} />
          ))}
          {cents !== null && (
            <span
              className={`absolute inset-y-0 w-1 -translate-x-1/2 rounded-full transition-[left,background-color] duration-100 motion-reduce:transition-none ${tuned ? "bg-emerald-300 shadow-[0_0_14px_#6ee7b7]" : "bg-violet-100 shadow-[0_0_14px_#c4b5fd]"}`}
              style={{ left: `${50 + Math.max(-50, Math.min(50, cents))}%` }}
            />
          )}
        </div>
      </div>
      <div className="mt-2 flex justify-between text-xs tabular-nums text-zinc-400">
        <span>−50¢</span><span>0¢</span><span>+50¢</span>
      </div>
    </div>
  );
}

export function RehearsalTuner({ compact = false }: { compact?: boolean }) {
  const { state, start, stop } = useTuner();
  const [expanded, setExpanded] = useState(false);
  const [full, setFull] = useState(false);
  const [instrumentIndex, setInstrumentIndex] = useState(0);
  const [presetIndex, setPresetIndex] = useState(0);
  const [targetIndex, setTargetIndex] = useState<number | null>(null);
  const [reference, setReference] = useState(440);
  const panelId = useId();
  const instrument = tunerInstruments[instrumentIndex];
  const preset = instrument.presets[presetIndex];
  const notes = preset?.notes ?? [];
  const hz = state.status === "listening" ? state.hz : null;
  const midi = hz === null ? null : nearestNote(hz, reference);
  const autoTarget = hz === null ? undefined : notes.reduce<number | undefined>((best, note) => (
    best === undefined || Math.abs(centsFromNote(hz, note, reference)) < Math.abs(centsFromNote(hz, best, reference))
      ? note : best
  ), undefined);
  const autoMatch = hz !== null && autoTarget !== undefined && Math.abs(centsFromNote(hz, autoTarget, reference)) <= 150
    ? autoTarget : undefined;
  const guide = targetIndex !== null ? notes[targetIndex] : preset ? autoMatch : midi;
  const cents = hz !== null && guide != null ? centsFromNote(hz, guide, reference) : null;
  const tuned = cents !== null && Math.abs(cents) <= 3;
  const active = state.status === "starting" || state.status === "listening";
  const actionLabel = state.status === "starting" ? "Cancel" : active ? "Stop Tuner" : "Start Tuner";
  const status = cents === null
    ? hz !== null ? "Outside Preset" : state.status === "listening" ? "Waiting for a Note" : "Ready to Tune"
    : tuned ? "In Tune" : cents < 0 ? "Flat" : "Sharp";
  const hint = cents !== null
    ? tuned ? "Pitch is centered" : cents < 0 ? "Raise the pitch" : "Lower the pitch"
    : hz !== null ? "Choose a string or use Chromatic" : "Play one note at a time";

  function renderReadout(isCompact: boolean) {
    return (
      <div className={`space-y-4 rounded-2xl border ${tuned ? "border-emerald-400/35" : "border-violet-400/20"} ${isCompact ? "bg-[#14131e] p-3" : "bg-linear-to-b from-[#25203a] via-[#181627] to-[#101019] p-4 shadow-[inset_0_1px_0_#c4b5fd20] sm:p-6"}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-zinc-300">Detected Note</p>
            <p className={`font-bold leading-none tracking-tight tabular-nums ${isCompact ? "mt-1 text-3xl" : "mt-2 text-5xl sm:text-7xl"} ${tuned ? "text-emerald-100" : "text-violet-50"}`}>
              {midi === null ? "—" : noteName(midi)}
            </p>
            <p className="mt-2 text-xs tabular-nums text-zinc-300">{hz === null ? "— Hz" : `${hz.toFixed(1)} Hz`}</p>
          </div>
          <div className="min-w-0 text-right">
            <p className={`inline-flex max-w-full items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold ${tuned ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200" : "border-violet-300/20 bg-violet-300/10 text-violet-100"}`}>
              <span className={`size-1.5 shrink-0 rounded-full ${tuned ? "bg-emerald-300 shadow-[0_0_9px_#6ee7b7]" : "bg-violet-300"}`} />
              {status}
            </p>
            <p className="mt-1.5 text-xs text-zinc-300">{hint}</p>
            <p className={`mt-1.5 font-semibold tabular-nums ${isCompact ? "text-sm" : "text-xl"}`}>
              {cents === null ? "—" : `${cents > 0 ? "+" : ""}${cents}¢`}
            </p>
          </div>
        </div>
        <PitchMeter cents={cents} tuned={tuned} compact={isCompact} />
        {(preset || guide != null) && (
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-white/10 pt-3 text-xs text-zinc-300">
            <p className="flex flex-wrap items-baseline gap-2">
              <span>Target</span>
              <span className="font-semibold text-violet-100">{guide == null ? "—" : noteName(guide)}</span>
              {guide != null && <span className="tabular-nums">{noteFrequency(guide, reference).toFixed(1)} Hz</span>}
            </p>
            {!isCompact && <p className="text-violet-200">{instrument.name}{preset ? ` · ${instrument.detail} · ${preset.name}` : ""}</p>}
          </div>
        )}
      </div>
    );
  }

  function renderMicrophone(isCompact: boolean) {
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <button type="button" className={`workspace-primary justify-center ${isCompact ? "" : "w-full sm:min-w-40 sm:w-auto"}`} onClick={active ? stop : () => void start()}>
            {active ? <Square aria-hidden="true" className="size-4" /> : <Mic aria-hidden="true" className="size-4" />} {actionLabel}
          </button>
          {isCompact && <button type="button" className="workspace-secondary" onClick={() => setFull(true)}>
            <Maximize2 aria-hidden="true" className="size-4" /> Open Full Tuner
          </button>}
          <p role="status" className="flex items-center gap-2 text-xs font-medium text-zinc-300">
            <span className={`size-2 rounded-full ${state.status === "listening" ? "bg-emerald-300 shadow-[0_0_10px_#6ee7b7]" : "bg-zinc-500"}`} />
            {state.status === "starting" ? "Waiting for microphone permission…" : state.status === "listening" ? "Microphone On" : "Microphone Off"}
          </p>
        </div>
        {state.status === "error" && <p role="alert" className="text-sm text-red-300">{state.message}</p>}
      </div>
    );
  }

  function renderFullTuner() {
    return (
      <div className="@container">
        <div className="grid min-w-0 items-start gap-4 @min-[56rem]:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <section className="workspace-panel min-w-0 space-y-5" aria-label="Live Pitch">
            {renderReadout(false)}
            {renderMicrophone(false)}
            {preset && (
              <div className="space-y-2.5 border-t border-white/10 pt-4">
                <div className="flex flex-wrap items-baseline justify-between gap-1">
                  <h3 className="text-sm font-semibold">Target String</h3>
                  <p className="text-xs text-zinc-400">Use Auto or select a string</p>
                </div>
                <div className="grid grid-cols-3 gap-2 @min-[32rem]:grid-cols-4">
                  <button type="button" aria-pressed={targetIndex === null} className="workspace-secondary min-h-14 min-w-0 justify-center px-1.5 aria-pressed:border-violet-300/60 aria-pressed:bg-violet-300/20" onClick={() => setTargetIndex(null)}>Auto</button>
                  {notes.map((note, index) => (
                    <button key={index} type="button"
                      aria-label={`String ${notes.length - index}, ${noteName(note)}`}
                      aria-pressed={targetIndex === index}
                      className={`workspace-secondary min-h-14 min-w-0 flex-col justify-center gap-0.5 px-1.5 aria-pressed:border-violet-300/60 aria-pressed:bg-violet-300/20 ${targetIndex === null && autoMatch === note ? "border-emerald-300/45" : ""}`}
                      onClick={() => setTargetIndex(index)}
                    >
                      <span className="text-base leading-none">{noteName(note)}</span>
                      <span className="text-[11px] font-normal text-zinc-300">String {notes.length - index}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>
          <section className="workspace-panel min-w-0 space-y-5" aria-label="Tuner Settings">
            <div className="space-y-2.5">
              <h3 className="text-sm font-semibold">Instrument</h3>
              <div className="grid grid-cols-2 gap-2">
                {tunerInstruments.map(({ id, name, detail }, index) => {
                  const Icon = id === "chromatic" ? AudioLines : id === "violin" || id === "ukulele" ? Music2 : Guitar;
                  return (
                    <button key={id} type="button" aria-pressed={instrumentIndex === index}
                      aria-label={`${name}, ${detail}`}
                      className="flex min-h-14 min-w-0 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-2.5 py-2 text-left transition-colors hover:border-violet-300/45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-200 aria-pressed:border-violet-300/60 aria-pressed:bg-violet-400/15 sm:px-3"
                      onClick={() => {
                        if (index === instrumentIndex) return;
                        setInstrumentIndex(index);
                        setPresetIndex(0);
                        setTargetIndex(null);
                      }}
                    >
                      <Icon aria-hidden="true" className="hidden size-4 shrink-0 text-violet-200 min-[360px]:block" />
                      <span className="min-w-0">
                        <span className="block break-words text-sm font-semibold leading-tight">{name}</span>
                        <span className="block text-xs text-zinc-400">{detail}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            {preset && (
              <div className="space-y-2.5">
                <h3 className="text-sm font-semibold">Tuning Preset</h3>
                <div className="flex flex-wrap gap-2">
                  {instrument.presets.map(({ name }, index) => (
                    <button key={name} type="button" aria-pressed={presetIndex === index}
                      className="rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2.5 text-xs font-semibold transition-colors hover:border-violet-300/45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-200 aria-pressed:border-violet-300/60 aria-pressed:bg-violet-400/15 aria-pressed:text-violet-100"
                      onClick={() => {
                        if (index === presetIndex) return;
                        setPresetIndex(index);
                        setTargetIndex(null);
                      }}
                    >{name}</button>
                  ))}
                </div>
              </div>
            )}
            <label className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-4 text-sm font-semibold">
              A4 Reference
              <select className="workspace-input min-h-10 w-auto min-w-24 shrink-0 py-2" value={reference} onChange={(event) => setReference(Number(event.target.value))}>
                {referencePitches.map((value) => <option key={value} value={value}>{value} Hz</option>)}
              </select>
            </label>
          </section>
        </div>
      </div>
    );
  }

  if (!compact) return renderFullTuner();

  return (
    <div className="space-y-2">
      <button type="button" className="workspace-secondary" aria-expanded={expanded} aria-controls={panelId} onClick={() => {
        if (expanded) stop();
        setExpanded(!expanded);
      }}>
        <AudioLines aria-hidden="true" className="size-4" /> Tune <ChevronDown aria-hidden="true" className={`size-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>
      <div id={panelId} hidden={!expanded || full}>
        {expanded && !full && <div className="space-y-3">{renderReadout(true)}{renderMicrophone(true)}</div>}
      </div>
      {full && <WorkspaceDialog title="Instrument Tuner" busy={false} onDismiss={() => {
        stop();
        setFull(false);
      }} wide>
        {renderFullTuner()}
      </WorkspaceDialog>}
    </div>
  );
}
