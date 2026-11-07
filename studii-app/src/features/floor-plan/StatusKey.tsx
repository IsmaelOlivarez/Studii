import styles from "./FloorPlan.module.css";

// Status is carried by a distinct GLYPH per state (not color alone), so it survives for
// colorblind users and screen readers (WCAG 1.4.1). Color stays as a reinforcing cue.
// Shared by the floor-plan tiles (FloorPlan) and the collapsible key popover (StatusKey).
export const GLYPH: Record<string, string> = { free: "✓", limited: "◷", full: "✕", closed: "–" };
export const STATUS_WORD: Record<string, string> = {
  free: "open",
  limited: "ends soon",
  full: "booked",
  closed: "closed",
};

const ROWS: { st: string; label: string; bg: string }[] = [
  { st: "free", label: "Open", bg: "var(--free)" },
  { st: "limited", label: "Ends soon", bg: "var(--limited)" },
  { st: "full", label: "Booked", bg: "var(--full)" },
  { st: "closed", label: "Closed", bg: "var(--ink-faint)" },
];

/** The glyph/color key for the floor plan — the four room states plus the layout's small
 *  note (capacity / "schematic"). Lives behind the header ⓘ toggle so the detail view
 *  stays clean; the glyphs on the tiles carry the status at a glance on their own. */
export function StatusKey({ note }: { note?: string }) {
  return (
    <div className={styles.keyPanel} role="group" aria-label="Room status key">
      {ROWS.map(({ st, label, bg }) => (
        <i key={st}>
          <b className={styles.sw} style={{ background: bg }} aria-hidden>{GLYPH[st]}</b>
          {label}
        </i>
      ))}
      {note && <i className={styles.note}>{note}</i>}
    </div>
  );
}
