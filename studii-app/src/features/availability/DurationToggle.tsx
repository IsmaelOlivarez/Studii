import styles from "./DurationToggle.module.css";
import { MIN_DURATION } from "@/domain/constants";

// The user's desired booking length, chosen BEFORE opening a library. "all" = no
// preference (counts any bookable room); the numbers narrow the count to rooms with a
// free block that long from the selected minute. Held in shared state so the map rings,
// the cards, and the detail floor plan all recompute off the same choice.
export type DurationPref = "all" | 30 | 90 | 120;

// Resolve the preference to the minutes a room must stay free. "all" collapses to the
// 30-min LibCal minimum (a room that can't fit 30 isn't bookable at all), so ALL and 30m
// read the same — the toggle only diverges at 1½h / 2h.
export const wantMinutes = (p: DurationPref): number => (p === "all" ? MIN_DURATION : p);

const OPTS: { val: DurationPref; label: string }[] = [
  { val: "all", label: "All" },
  { val: 30, label: "30m" },
  { val: 90, label: "1½h" },
  { val: 120, label: "2h" },
];

export function DurationToggle({
  value,
  onChange,
  compact = false,
}: {
  value: DurationPref;
  onChange: (p: DurationPref) => void;
  compact?: boolean;
}) {
  return (
    <div className={`${styles.wrap} ${compact ? styles.compact : ""}`} role="group" aria-label="Desired booking length">
      <span className={styles.lead}>Time<br />Len</span>
      <div className={styles.seg}>
        {OPTS.map(({ val, label }) => (
          <button
            key={String(val)}
            className={`${styles.opt} ${val === value ? styles.on : ""}`}
            onClick={() => onChange(val)}
            aria-pressed={val === value}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
