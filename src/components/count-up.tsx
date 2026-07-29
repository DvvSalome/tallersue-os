"use client";

import { useEffect, useRef } from "react";

const DURATION_MS = 700;
const EASE_OUT = (t: number) => 1 - Math.pow(1 - t, 3);

export function CountUp({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    let frame: number;
    const start = performance.now();

    function tick(now: number) {
      const t = Math.min(1, (now - start) / DURATION_MS);
      node!.textContent = String(Math.round(value * EASE_OUT(t)));
      if (t < 1) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return <span ref={ref} className={className} />;
}
