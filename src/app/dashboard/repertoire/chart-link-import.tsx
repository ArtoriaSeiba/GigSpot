"use client";

import { useEffect, useRef, useState } from "react";
import { Link2, Music } from "lucide-react";
import { chartPreview, parseSongKey, shiftSongKey } from "@/lib/song-rehearsal";
import {
  detectLocalJamJamCharts,
  type ChartImportStatus,
  type ImportedChordChart,
} from "@/lib/jam-jam-chart";
import { WorkspaceRequestError, workspaceErrorMessage, workspaceRequest } from "@/lib/workspace-requests";

const endpoint = "/api/songs/chart-import";

type ImportState =
  | { phase: "idle" | "starting" | "analyzing" }
  | { phase: "polling"; job: string; delay: number }
  | { phase: "paused"; job: string; message: string }
  | { phase: "error"; message: string }
  | { phase: "ready"; charts: ImportedChordChart[] };

function stripLyricsToChordsOnly(chartText: string): string {
  const output: string[] = [];

  for (const rawLine of chartText.split("\n")) {
    const line = rawLine.trim();
    if (!line) {
      if (output.length > 0 && output[output.length - 1] !== "") {
        output.push("");
      }
      continue;
    }

    if (/^\{comment:.*\}$/i.test(line)) {
      output.push(line);
      continue;
    }

    const tokens = line.match(/\[[^\[\]]+\]/g);
    if (tokens && tokens.length > 0) {
      output.push(tokens.join(" "));
    }
  }

  return output.join("\n").trim();
}

export function ChartLinkImport({ originalKey, hasChart, onApply }: {
  originalKey: string;
  hasChart: boolean;
  onApply: (chart: ImportedChordChart) => void;
}) {
  const [url, setUrl] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [chordsOnly, setChordsOnly] = useState(true);
  const [state, setState] = useState<ImportState>({ phase: "idle" });
  const [selected, setSelected] = useState(0);
  const [audioKey, setAudioKey] = useState("");
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

  async function startLocalAudioImport() {
    if (!audioFile || state.phase === "starting" || state.phase === "polling" || state.phase === "analyzing") return;
    setState({ phase: "analyzing" });
    await new Promise((resolve) => setTimeout(resolve, 30));

    try {
      const charts = await detectLocalJamJamCharts(audioFile);
      if (!charts.length) {
        setState({
          phase: "error",
          message: "No chords were detected in this audio file. Try a clearer recording.",
        });
        return;
      }
      setSelected(0);
      setAudioKey("");
      setState({ phase: "ready", charts });
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : "Couldn’t detect chords from this audio file.";
      setState({ phase: "error", message });
    }
  }

  async function startImport() {
    if (!url.trim() || submitRequest.current || (state.phase !== "idle" && state.phase !== "error")) return;
    const controller = new AbortController();
    submitRequest.current = controller;
    requestId.current ||= crypto.randomUUID();
    setState({ phase: "starting" });
    const fallback = "Couldn’t start the chart import. Try again or paste the chart text.";
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

  const busy = state.phase === "starting" || state.phase === "polling" || state.phase === "analyzing";
  const chart = state.phase === "ready" ? state.charts[selected] : undefined;
  const confirmedKey = parseSongKey(audioKey)?.name ?? "";
  const suggestedKey = parseSongKey(originalKey)?.name;
  const finalChartText = chart
    ? (chordsOnly ? stripLyricsToChordsOnly(chart.chart) || chart.chart : chart.chart)
    : "";

  return (
    <details className="rounded-xl border border-white/10 bg-white/3 p-3">
      <summary className="cursor-pointer text-sm font-semibold">Import Chords</summary>
      <div className="mt-3 space-y-4">
        {process.env.NODE_ENV === "development" && <div className="space-y-2.5">
          <label className="grid min-w-0 gap-1.5 text-sm font-medium">
            Detect Chords From Audio File
            <input
              type="file"
              accept="audio/*"
              disabled={busy}
              className="workspace-input file:mr-3 file:rounded-lg file:border-0 file:bg-violet-500/20 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-violet-100"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                setAudioFile(file);
                setState({ phase: "idle" });
              }}
            />
          </label>
          <p className="text-xs text-zinc-400">
            Runs Jam Jam’s ONNX model directly in your browser—no API key or conversion limit.
          </p>
          {!chart && (
            <button
              type="button"
              className="workspace-secondary"
              disabled={busy || !audioFile}
              onClick={() => void startLocalAudioImport()}
            >
              <Music aria-hidden="true" className="size-4" />
              {state.phase === "analyzing" ? "Detecting Chords…" : "Detect Chords From Audio"}
            </button>
          )}
          {state.phase === "analyzing" && (
            <p role="status" className="text-sm text-zinc-400">
              Analyzing audio locally with ONNX…
            </p>
          )}
        </div>}

        {/* 2. Unlimited Direct Link Import */}
        <div className="space-y-3 border-t border-white/10 pt-3">
              <label className="grid min-w-0 gap-1.5 text-sm font-medium">
                Chord Chart Link
                <input
                  type="text"
                  inputMode="url"
                  autoComplete="off"
                  value={url}
                  maxLength={2048}
                  disabled={busy}
                  className="workspace-input"
                  placeholder="https://…"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void startImport();
                    }
                  }}
                  onChange={(event) => {
                    setUrl(event.target.value);
                    requestId.current = "";
                    setState({ phase: "idle" });
                  }}
                />
              </label>
              <p className="text-xs text-zinc-400">Supports Ultimate Guitar and Malaykord.</p>
              {state.phase !== "paused" && !chart && (
                <button type="button" className="workspace-secondary" disabled={busy || !url.trim()} onClick={() => void startImport()}>
                  <Link2 aria-hidden="true" className="size-4" /> {state.phase === "starting" || state.phase === "polling" ? "Importing…" : "Preview Link Chords"}
                </button>
              )}
              {(state.phase === "starting" || state.phase === "polling") && (
                <p role="status" className="text-sm text-zinc-400">Fetching chords from link…</p>
              )}
              {state.phase === "paused" && (
                <>
                  <p role="status" className="text-sm text-zinc-400">{state.message}</p>
                  <button
                    type="button"
                    className="workspace-secondary"
                    onClick={() => {
                      pollUntil.current = Date.now() + 90000;
                      setState({ phase: "polling", job: state.job, delay: 0 });
                    }}
                  >
                    Check Import Again
                  </button>
                </>
              )}
        </div>

        {/* Error Display */}
        {state.phase === "error" && <p role="alert" className="text-sm text-red-300">{state.message}</p>}

        {/* Preview & Apply Detected Chords */}
        {chart && state.phase === "ready" && (
          <div className="space-y-3 rounded-xl border border-white/10 p-3">
            {state.charts.length > 1 && (
              <label className="grid gap-1.5 text-sm font-medium">
                Choose A Chart
                <select className="workspace-input" value={selected} onChange={(event) => setSelected(Number(event.target.value))}>
                  {state.charts.map((item, index) => (
                    <option key={index} value={index}>
                      {item.title || `Chart ${index + 1}`}
                      {item.artist ? ` · ${item.artist}` : ""}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium">
                  {chart.title || "Imported Chords"}
                  {chart.artist ? ` · ${chart.artist}` : ""}
                </p>
                <p className="text-sm text-zinc-400">
                  {chart.key ? `Shape Key ${chart.key}` : "Shape Key Unknown"}
                  {chart.capo
                    ? ` · Capo ${chart.capo}${chart.key ? ` · Sounds In ${shiftSongKey(chart.key, chart.capo)}` : ""}`
                    : chart.capo === 0
                      ? " · No Capo"
                      : ""}
                </p>
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-zinc-300">
                <input
                  type="checkbox"
                  checked={chordsOnly}
                  onChange={(event) => setChordsOnly(event.target.checked)}
                  className="size-4 rounded border-white/20 accent-violet-500"
                />
                Chords only (remove lyrics)
              </label>
            </div>
            {chart.localAudio && (
              <div className="space-y-2">
                <p className="text-sm text-zinc-400">The detected chords are at sounding pitch. Confirm the key if you know it, or leave it blank.</p>
                <label className="grid max-w-xs gap-1.5 text-sm font-medium">
                  Chart Key (Optional)
                  <input value={audioKey} onChange={(event) => setAudioKey(event.target.value)} className="workspace-input" maxLength={50} placeholder="e.g. C or Am" />
                </label>
                {suggestedKey && <button type="button" className="workspace-secondary" onClick={() => setAudioKey(suggestedKey)}>Use Recording Key {suggestedKey}</button>}
              </div>
            )}
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-black/20 p-3 text-sm text-violet-100">
              {chartPreview(finalChartText, chart.key, chart.key).text}
            </pre>
            <button
              type="button"
              className="workspace-secondary"
              disabled={Boolean(chart.localAudio && audioKey.trim() && !confirmedKey)}
              onClick={() => {
                onApply({ ...chart, key: chart.localAudio ? confirmedKey : chart.key, chart: finalChartText });
                setState({ phase: "idle" });
                setUrl("");
                setAudioFile(null);
                requestId.current = "";
              }}
            >
              {hasChart ? "Replace Draft Chart" : "Use These Chords"}
            </button>
          </div>
        )}
      </div>
    </details>
  );
}
