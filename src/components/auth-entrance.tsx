"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function AuthEntrance({ className, children }: { className: string; children: ReactNode }) {
  const container = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = container.current;
    if (!element) return;

    let frame = requestAnimationFrame(() => {
      // Give the newly loaded route a paint before starting the entrance.
      frame = requestAnimationFrame(() => {
        element.dataset.authEntrance = "ready";
      });
    });

    return () => cancelAnimationFrame(frame);
  }, []);

  return <main ref={container} className={className}>{children}</main>;
}
