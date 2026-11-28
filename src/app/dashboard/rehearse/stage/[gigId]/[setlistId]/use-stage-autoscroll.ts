import { useEffect, useState, type RefObject } from "react";

export const scrollSpeeds = [
  { label: "Slow", pixelsPerSecond: 12 },
  { label: "Medium", pixelsPerSecond: 24 },
  { label: "Fast", pixelsPerSecond: 42 },
  { label: "Very Fast", pixelsPerSecond: 64 },
];

export function useStageAutoscroll(
  region: RefObject<HTMLDivElement | null>,
  content: RefObject<HTMLDivElement | null>,
  songIndex: number,
  ready: boolean,
) {
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState<"fits" | "scrollable" | "end">("fits");
  const [speed, setSpeed] = useState(scrollSpeeds[1].pixelsPerSecond);

  useEffect(() => {
    const area = region.current;
    const chart = content.current;
    if (!area || !chart) return;

    function measure() {
      if (!area) return;
      const limit = area.scrollHeight - area.clientHeight;
      setPosition(limit <= 1 ? "fits" : limit - area.scrollTop <= 1 ? "end" : "scrollable");
    }

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(area);
    observer.observe(chart);
    area.addEventListener("scroll", measure, { passive: true });
    return () => {
      observer.disconnect();
      area.removeEventListener("scroll", measure);
    };
  }, [region, content, songIndex, ready]);

  useEffect(() => {
    const area = region.current;
    if (!playing || !area) return;
    let frame = 0;
    let last: number | null = null;
    let carry = 0;

    function step(now: number) {
      if (!area) return;
      const remaining = area.scrollHeight - area.clientHeight - area.scrollTop;
      if (document.hidden || remaining <= 1) {
        setPlaying(false);
        return;
      }
      if (last !== null) {
        carry += Math.min(now - last, 50) * speed / 1000;
        const pixels = Math.floor(carry);
        if (pixels > 0) {
          area.scrollTop += Math.min(pixels, remaining);
          carry -= pixels;
        }
      }
      last = now;
      frame = requestAnimationFrame(step);
    }

    function onVisibilityChange() {
      if (document.hidden) setPlaying(false);
    }

    frame = requestAnimationFrame(step);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [region, playing, speed]);

  function toggle() {
    if (playing) {
      setPlaying(false);
      return;
    }
    if (position === "fits") return;
    if (position === "end") region.current?.scrollTo({ top: 0 });
    setPlaying(true);
  }

  return { playing, position, speed, setSpeed, toggle, pause: () => setPlaying(false) };
}
