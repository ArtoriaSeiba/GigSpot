import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { RehearsalTuner } from "@/components/rehearsal-tuner";

export default function TunerPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <Link href="/dashboard/rehearse" className="inline-flex min-h-10 items-center gap-2 rounded-lg text-sm text-zinc-300 hover:text-white">
        <ArrowLeft aria-hidden="true" className="size-4" /> Rehearse
      </Link>
      <header className="workspace-header">
        <div>
          <h1>Instrument Tuner</h1>
          <p>Choose an instrument, play one note at a time, and bring the meter to center.</p>
        </div>
      </header>
      <section aria-label="Microphone Tuner">
        <RehearsalTuner />
      </section>
    </div>
  );
}
