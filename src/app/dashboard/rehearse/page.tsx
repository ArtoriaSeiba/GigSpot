import Link from "next/link";
import { ArrowRight, AudioLines, ListMusic, Music2, PlayCircle } from "lucide-react";

export default function RehearsePage() {
  return (
    <div className="space-y-6">
      <header className="workspace-header">
        <div>
          <h1>Rehearse</h1>
          <p>Run through your setlist, tune your instrument, or practice chord changes.</p>
        </div>
      </header>

      <section className="workspace-panel workspace-hero workspace-hero-art flex min-h-64 flex-col items-start justify-center gap-4" aria-labelledby="demo-title">
        <div className="space-y-2 sm:max-w-[55%]">
          <h2 id="demo-title" className="text-3xl font-bold tracking-tight sm:text-4xl">AR Fretboard Demo</h2>
          <p className="max-w-md text-sm leading-relaxed text-zinc-200">
            Try the Am, F, C, G progression. The demo uses your camera and an ArUco marker. You can print the marker from the demo screen.
          </p>
        </div>
        <Link href="/dashboard/rehearse/demo" className="workspace-primary">
          <PlayCircle aria-hidden="true" className="size-4" /> Open AR Demo
        </Link>
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/dashboard/rehearse/stage" className="workspace-panel flex min-h-16 items-center gap-3 border-violet-400/30 bg-linear-to-br from-[#241c38] to-[#171624] text-sm font-semibold transition-colors hover:border-violet-400/60">
          <ListMusic aria-hidden="true" className="size-5 shrink-0 text-violet-200" />
          Open Stage View
          <ArrowRight aria-hidden="true" className="ml-auto size-4 shrink-0 text-violet-200" />
        </Link>
        <Link href="/dashboard/repertoire" className="workspace-panel flex items-center gap-3 text-sm font-semibold hover:border-violet-400/45">
          <Music2 aria-hidden="true" className="size-5 shrink-0 text-violet-200" /> Open Repertoire
        </Link>
      </div>

      <section aria-labelledby="tuner-title" className="workspace-panel relative isolate overflow-hidden border-violet-400/30 bg-linear-to-br from-[#211b34] via-[#171624] to-[#101923]">
        <div aria-hidden="true" className="pointer-events-none absolute -top-36 right-0 -z-10 size-80 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4 sm:gap-5">
            <span className="grid size-14 shrink-0 place-items-center rounded-2xl border border-violet-300/25 bg-violet-400/15 text-violet-200 shadow-lg shadow-violet-950/40 sm:size-16">
              <AudioLines aria-hidden="true" className="size-7" />
            </span>
            <div>
              <h2 id="tuner-title" className="text-xl font-bold tracking-tight sm:text-2xl">Instrument Tuner</h2>
              <p className="mt-1 text-sm text-zinc-300">Tune guitar, bass, ukulele, and more with your microphone.</p>
            </div>
          </div>
          <Link href="/dashboard/rehearse/tuner" className="workspace-primary min-h-12 shrink-0 justify-center px-6">
            Open Tuner <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
