"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { makePitchDetector } from "@/lib/tuner-pitch";

type TunerState =
  | { status: "idle" | "starting" }
  | { status: "listening"; hz: number | null }
  | { status: "error"; message: string };

type Microphone = {
  context?: AudioContext;
  stream?: MediaStream;
  timer?: ReturnType<typeof setInterval>;
};

function release(input: Microphone | null) {
  if (!input) return;
  clearInterval(input.timer);
  input.stream?.getTracks().forEach((track) => track.stop());
  if (input.context && input.context.state !== "closed") void input.context.close().catch(() => {});
}

export function useTuner() {
  const microphone = useRef<Microphone | null>(null);
  const [state, setState] = useState<TunerState>({ status: "idle" });

  const disconnect = useCallback(() => {
    const active = microphone.current;
    microphone.current = null;
    release(active);
  }, []);

  const stop = useCallback(() => {
    disconnect();
    setState({ status: "idle" });
  }, [disconnect]);

  useEffect(() => {
    function onVisibilityChange() {
      if (document.hidden && microphone.current) stop();
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      disconnect();
    };
  }, [disconnect, stop]);

  async function start() {
    if (microphone.current) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof AudioContext === "undefined") {
      setState({ status: "error", message: "Microphone tuning needs a supported browser on HTTPS or localhost." });
      return;
    }

    const current: Microphone = {};
    microphone.current = current;
    setState({ status: "starting" });
    try {
      const context = new AudioContext();
      current.context = context;
      const resume = context.resume();
      void resume.catch(() => {});
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
        video: false,
      });
      if (microphone.current !== current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      current.stream = stream;
      await resume;
      if (microphone.current !== current) return;

      for (const track of stream.getAudioTracks()) {
        track.addEventListener("ended", () => {
          if (microphone.current !== current) return;
          disconnect();
          setState({ status: "error", message: "The microphone disconnected. Reconnect it and try again." });
        }, { once: true });
      }
      const analyser = context.createAnalyser();
      analyser.fftSize = 8192;
      context.createMediaStreamSource(stream).connect(analyser);
      // Keep the graph active while preventing microphone playback.
      const muted = context.createGain();
      muted.gain.value = 0;
      analyser.connect(muted).connect(context.destination);
      const samples = new Float32Array(analyser.fftSize);
      const detect = makePitchDetector(context.sampleRate, samples.length);
      let filtered: number | null = null;
      setState({ status: "listening", hz: null });
      current.timer = setInterval(() => {
        analyser.getFloatTimeDomainData(samples);
        const hz = detect(samples);
        filtered = hz && filtered && Math.abs(Math.log2(hz / filtered)) < 0.04
          ? 0.65 * hz + 0.35 * filtered
          : hz;
        setState({ status: "listening", hz: filtered });
      }, 85);
    } catch (error) {
      if (microphone.current !== current) return;
      disconnect();
      const message = error instanceof DOMException && error.name === "NotAllowedError"
        ? "Microphone access was denied. Allow it in your browser and try again."
        : error instanceof DOMException && error.name === "NotFoundError"
          ? "No microphone found. Connect one and try again."
          : "Couldn’t start the microphone. Check that it’s available and try again.";
      setState({ status: "error", message });
    }
  }

  return { state, start, stop };
}
