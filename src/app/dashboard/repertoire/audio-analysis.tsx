"use client";

import { useEffect, useState } from "react";
import { AudioLines } from "lucide-react";
import { AUDIO_LIMIT, type AudioDraft } from "@/lib/song-rehearsal";
import { WorkspaceRequestError, workspaceErrorMessage, workspaceRequest } from "@/lib/workspace-requests";

type Analysis =
  | { status: "idle" | "uploading" }
  | { status: "running" | "paused"; job: string }
  | { status: "complete"; draft: AudioDraft }
  | { status: "error"; message: string };

type JobResult = { status: "pending" | "failed" } | { status: "complete"; draft: AudioDraft };

export function AudioAnalysis({ onApply }: { onApply: (draft: AudioDraft) => void }) {
  const [audio, setAudio] = useState<File>();
  const [analysis, setAnalysis] = useState<Analysis>({ status: "idle" });

  useEffect(() => {
    if (analysis.status !== "running") return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    let polls = 0;
    const { job } = analysis;

    async function poll() {
      try {
        const result = await workspaceRequest<JobResult>(`/api/songs/analyze?job=${encodeURIComponent(job)}`, "Could not check audio analysis.", { signal: controller.signal });
        if (controller.signal.aborted) return;
        if (result.status === "complete") setAnalysis({ status: "complete", draft: result.draft });
        else if (result.status === "failed") setAnalysis({ status: "error", message: "The analysis failed. You can choose a different recording or enter details by hand." });
        else if (++polls >= 75) setAnalysis({ status: "paused", job });
        else timer = setTimeout(() => void poll(), 4000);
      } catch (error) {
        if (controller.signal.aborted) return;
        if (error instanceof WorkspaceRequestError && error.status < 500) {
          setAnalysis({ status: "error", message: error.message });
        } else {
          setAnalysis({ status: "paused", job });
        }
      }
    }
    void poll();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [analysis]);

  async function analyze() {
    if (!audio || !audio.size || audio.size > AUDIO_LIMIT) {
      setAnalysis({ status: "error", message: "Choose an audio file up to 20 MB." });
      return;
    }
    setAnalysis({ status: "uploading" });
    const form = new FormData();
    form.set("audio", audio);
    try {
      const { job } = await workspaceRequest<{ job: string }>("/api/songs/analyze", "Could not submit audio analysis. Try again or enter the details by hand.", { method: "POST", body: form });
      setAnalysis({ status: "running", job });
    } catch (error) {
      setAnalysis({ status: "error", message: workspaceErrorMessage(error, "Could not submit audio analysis. Try again or enter the details by hand.") });
    }
  }

  const busy = analysis.status === "uploading" || analysis.status === "running" || analysis.status === "paused";
  return (
    <details className="rounded-xl border border-white/10 bg-white/3 p-3">
      <summary className="cursor-pointer rounded text-sm font-semibold">Analyze A Recording</summary>
      <div className="mt-3 space-y-3">
        <p className="text-sm text-zinc-400">Use a recording you can share. Clicking Analyze sends the file to Music AI for processing and may incur charges. Keep this editor open to collect the draft.</p>
        <label className="grid gap-1 text-sm font-medium">
          Audio File
          <input type="file" accept=".mp3,.wav,.m4a,.flac,.ogg,.aac" disabled={busy} onChange={(event) => setAudio(event.target.files?.[0])} className="workspace-input text-sm file:mr-3 file:rounded-md file:border-0 file:bg-violet-200/15 file:px-2 file:py-1 file:text-violet-100" />
        </label>
        {analysis.status === "paused" ? (
          <button type="button" className="workspace-secondary" onClick={() => setAnalysis({ status: "running", job: analysis.job })}>Check Analysis Again</button>
        ) : (
          <button type="button" className="workspace-secondary" disabled={!audio || busy} onClick={() => void analyze()}>
            <AudioLines aria-hidden="true" className="size-4" /> {analysis.status === "uploading" ? "Uploading…" : analysis.status === "running" ? "Analyzing…" : "Analyze Audio"}
          </button>
        )}
        {analysis.status === "running" && <p role="status" className="text-sm text-zinc-400">Music AI is analyzing the recording. You can keep editing the song while it runs.</p>}
        {analysis.status === "paused" && <p role="status" className="text-sm text-zinc-400">The result is taking longer to reach GigSpot. Check the same job again without re-uploading the file.</p>}
        {analysis.status === "error" && <p role="alert" className="text-sm text-red-300">{analysis.message}</p>}
        {analysis.status === "complete" && (
          <div className="space-y-2 rounded-lg border border-violet-300/20 bg-violet-400/10 p-3">
            <p role="status" className="text-sm font-semibold">Analysis Ready</p>
            <p className="text-sm text-zinc-300">
              {[analysis.draft.key && `Key ${analysis.draft.key}`, analysis.draft.bpm && `${analysis.draft.bpm} BPM`, analysis.draft.chart && "Chord Timeline"].filter(Boolean).join(" · ") || "No usable song details were returned."}
            </p>
            {analysis.draft.chartUnavailable && <p className="text-sm text-zinc-400">A usable chord timeline wasn’t returned. You can still paste or import a chart.</p>}
            {(analysis.draft.key || analysis.draft.bpm || analysis.draft.chart) && (
              <button type="button" className="workspace-secondary" onClick={() => onApply(analysis.draft)}>Review In Song Draft</button>
            )}
          </div>
        )}
      </div>
    </details>
  );
}
