import Link from "next/link";
import { Calendar, Music2, PlayCircle } from "lucide-react";

export default function RehearsePage() {
  return (
    <div className="space-y-6">
      <header className="workspace-header">
        <div>
          <h1>Rehearse</h1>
          <p>Practice chord changes with the guitar fretboard overlay.</p>
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
        <Link href="/dashboard/repertoire" className="workspace-panel flex items-center gap-3 text-sm font-semibold hover:border-violet-400/45">
          <Music2 aria-hidden="true" className="size-5 text-violet-200" /> Choose A Song From The Repertoire
        </Link>
        <Link href="/dashboard/gigs" className="workspace-panel flex items-center gap-3 text-sm font-semibold hover:border-violet-400/45">
          <Calendar aria-hidden="true" className="size-5 text-violet-200" /> Find A Gig Setlist
        </Link>
      </div>
    </div>
  );
}
