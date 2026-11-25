"use client";

import { useEffect, useState } from "react";

function format(timeZone: string) {
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone }).format(
    new Date(),
  );
}

/** Local time in the profile's timezone. Server renders `--:--`; the clock starts on the client. */
export function LocalTime({ timeZone = "Asia/Jakarta", className }: { timeZone?: string; className?: string }) {
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    const update = () => setTime(format(timeZone));
    update();
    const id = window.setInterval(update, 15_000);
    return () => window.clearInterval(id);
  }, [timeZone]);

  return (
    <time className={className} suppressHydrationWarning aria-label={time ? `Local time ${time}` : undefined}>
      {time ?? "--:--"}
    </time>
  );
}
