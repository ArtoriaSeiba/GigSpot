"use client";

import { useEffect, useRef, useState } from "react";
import { Link2 } from "lucide-react";
import { chartPreview, shiftSongKey } from "@/lib/song-rehearsal";
import type { ChartImportStatus, ImportedChordChart } from "@/lib/jam-jam-chart";
import { WorkspaceRequestError, workspaceErrorMessage, workspaceRequest } from "@/lib/workspace-requests";

const endpoint = "/api/songs/chart-import";

type ImportState =
  | { phase: "idle" | "starting" }
  | { phase: "polling"; job: string; delay: number }
  | { phase: "paused"; job: string; message: string }
  | { phase: "error"; message: string }
  | { phase: "ready"; charts: ImportedChordChart[] };

export function ChartLinkImport({ enabled, hasChart, onApply }: {
  enabled: boolean;
  hasChart: boolean;
  onApply: (chart: ImportedChordChart) => void;
}) {
  const [url, setUrl] = useState("");
  const [state, setState] = useState<ImportState>({ phase: "idle" });
  const [selected, setSelected] = useState(0);
  const submitRequest = useRef<AbortController>(null);
  const requestId = useRef("");
  const pollUntil = useRef(0);

  useEffect(() => () => submitRequest.current?.abort(), []);

  useEffect(() => {
    if (state.phase !== "polling") return;
    const { job, delay } = state;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      const fallback = "Couldn’t check the import. Check again without resubmitting the link.";
      try {
        const result = await workspaceRequest<ChartImportStatus>(`${endpoint}?job=${encodeURIComponent(job)}`, fallback, { signal: controller.signal });
        if (controller.signal.aborted) return;
        if (result.status === "complete") {
          setSelected(0);
          setState({ phase: "ready", charts: result.charts });
        } else if (result.status === "failed") {
          requestId.current = "";
          setState({ phase: "error", message: result.message });
        } else {
          setState(pollUntil.current > Date.now() + result.retryAfter * 1000
            ? { phase: "polling", job, delay: result.retryAfter }
            : { phase: "paused", job, message: "The chart is still processing. Check again when you’re ready." });
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        const message = workspaceErrorMessage(error, fallback);
        if (error instanceof WorkspaceRequestError && (error.status === 404 || error.status === 422)) {
          requestId.current = "";
          setState({ phase: "error", message });
        } else {
          setState({ phase: "paused", job, message });
        }
      }
    }, delay * 1000);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [state]);

  async function startImport() {
    if (!enabled || !url.trim() || submitRequest.current || (state.phase !== "idle" && state.phase !== "error")) return;
    const controller = new AbortController();
    submitRequest.current = controller;
    requestId.current ||= crypto.randomUUID();
    setState({ phase: "starting" });
    const fallback = "Couldn’t start the Jam Jam import. Try again or paste the chart text.";
    try {
      const { job } = await workspaceRequest<{ job: string }>(endpoint, fallback, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), requestId: requestId.current }),
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      pollUntil.current = Date.now() + 90000;
      setState({ phase: "polling", job, delay: 2 });
    } catch (error) {
      if (!controller.signal.aborted) setState({ phase: "error", message: workspaceErrorMessage(error, fallback) });
    } finally {
      submitRequest.current = null;
    }
  }

  const busy = state.phase === "starting" || state.phase === "polling";
  const chart = state.phase === "ready" ? state.charts[selected] : undefined;

  return (
    <details className="rounded-xl border border-white/10 bg-white/3 p-3">
      <summary className="cursor-pointer text-sm font-semibold">Import From A Link</summary>
      <div className="mt-3 space-y-3">
        {!enabled ? (
          <p className="text-sm text-zinc-400">To use chart links, connect a Jam Jam API key. You can still paste the chart text. <a href="https://jam-jam.org/developers/" target="_blank" rel="noreferrer" className="text-violet-200 underline">Jam Jam Setup</a></p>
        ) : (
          <>
            <label className="grid min-w-0 gap-1.5 text-sm font-medium">
              Chord Chart Link
              <input type="text" inputMode="url" autoComplete="off" value={url} maxLength={2048} disabled={busy} className="workspace-input"
                placeholder="https://…" onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void startImport();
                  }
                }} onChange={(event) => {
                  setUrl(event.target.value);
                  requestId.current = "";
                  setState({ phase: "idle" });
                }} />
            </label>
            <p className="text-xs text-zinc-400">Jam Jam fetches the chart from this link. Use a public chart you’re allowed to share.</p>
            {state.phase !== "paused" && !chart && (
              <button type="button" className="workspace-secondary" disabled={busy || !url.trim()} onClick={() => void startImport()}>
                <Link2 aria-hidden="true" className="size-4" /> {busy ? "Importing…" : "Preview Chords"}
              </button>
            )}
            {busy && <p role="status" className="text-sm text-zinc-400">Waiting for Jam Jam to read the chart.</p>}
            {state.phase === "error" && <p role="alert" className="text-sm text-red-300">{state.message}</p>}
            {state.phase === "paused" && (
              <>
                <p role="status" className="text-sm text-zinc-400">{state.message}</p>
                <button type="button" className="workspace-secondary" onClick={() => {
                  pollUntil.current = Date.now() + 90000;
                  setState({ phase: "polling", job: state.job, delay: 0 });
                }}>Check Import Again</button>
              </>
            )}
            {chart && state.phase === "ready" && (
              <div className="space-y-3 rounded-xl border border-white/10 p-3">
                {state.charts.length > 1 && <label className="grid gap-1.5 text-sm font-medium">
                  Choose A Chart
                  <select className="workspace-input" value={selected} onChange={(event) => setSelected(Number(event.target.value))}>
                    {state.charts.map((item, index) => <option key={index} value={index}>{item.title || `Chart ${index + 1}`}{item.artist ? ` · ${item.artist}` : ""}</option>)}
                  </select>
                </label>}
                <p className="font-medium">{chart.title || "Imported Chords"}{chart.artist ? ` · ${chart.artist}` : ""}</p>
                <p className="text-sm text-zinc-400">
                  {chart.key ? `Shape Key ${chart.key}` : "Shape Key Unknown"}
                  {chart.capo ? ` · Capo ${chart.capo}${chart.key ? ` · Sounds In ${shiftSongKey(chart.key, chart.capo)}` : ""}` : chart.capo === 0 ? " · No Capo" : ""}
                </p>
                <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-black/20 p-3 text-sm text-violet-100">{chartPreview(chart.chart, chart.key, chart.key).text}</pre>
                <button type="button" className="workspace-secondary" onClick={() => {
                  onApply(chart);
                  setState({ phase: "idle" });
                  setUrl("");
                  requestId.current = "";
                }}>{hasChart ? "Replace Draft Chart" : "Use These Chords"}</button>
              </div>
            )}
          </>
        )}
      </div>
    </details>
  );
}
