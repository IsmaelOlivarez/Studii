"use client";
import { useRef } from "react";
import styles from "./TimeBar.module.css";
import { DAY_START, DAY_END } from "@/domain/constants";
import { freeCount } from "@/lib/time/slots";
import { fmtTime } from "@/lib/time/date";
import { isOpenAt, closeAfter, opensLaterToday, closedStretches } from "@/lib/time/hours";
import type { OpenHours } from "@/lib/time/hours";
import type { RoomAvailability } from "@/domain/types";

// Color by share of rooms free, so it reads the same for a 6-room or 17-room library.
const colorForCount = (c: number, total: number) => {
  const r = total ? c / total : 0;
  return r <= 0.15 ? "var(--full)" : r <= 0.4 ? "var(--limited)" : "var(--free)";
};

export function TimeBar({
  day,
  freeAt,
  total,
  totalAt,
  selMin,
  onChange,
  isToday,
  nowMin,
  live,
  onNow,
  compact = false,
  showNow = true,
  showCount = true,
  open,
  nextFree = null,
  onJump,
  axisStart = DAY_START,
  axisEnd = DAY_END,
}: {
  /** A single library's day (detail view). Ignored when `freeAt` is supplied. */
  day?: RoomAvailability[];
  /** Custom free-count at a given minute — e.g. summed across all libraries (map). */
  freeAt?: (min: number) => number;
  total: number;
  /** Per-minute denominator — e.g. rooms in libraries OPEN at that minute (map), so
   *  rooms outside their hours drop out of the N/total count. Falls back to `total`. */
  totalAt?: (min: number) => number;
  selMin: number;
  onChange: (min: number) => void;
  isToday: boolean;
  nowMin: number;
  live: boolean;
  onNow: () => void;
  /** Slim variant for the campus map (count folded inline; no big header or ticks). */
  compact?: boolean;
  /** Show the "Jump to now" button (detail view moves it into the header → false). */
  showNow?: boolean;
  /** Show the "N of M rooms open" line (detail view moves the count into the header). */
  showCount?: boolean;
  /** Open INTERVALS for this library/date (gaps between them = closed); empty array =
   *  closed all day; omit = always open. Closed stretches (before open, between gaps,
   *  after close) are greyed and read as 0 open. */
  open?: OpenHours;
  /** Soonest minute a room frees up when 0 are open at `selMin` — surfaces a one-tap
   *  "Next open" jump out of a nothing-available dead end. null = nothing more today. */
  nextFree?: number | null;
  /** Scrub to a minute (the "Next open" jump). Required for the jump to render. */
  onJump?: (min: number) => void;
  /** Visible time axis `[axisStart, axisEnd)` in minutes. Defaults to the standard
   *  8a–midnight frame; extended (e.g. to a full 00:00–24:00) for 24-hour libraries so
   *  their overnight hours are actually on-screen and scrubbable. */
  axisStart?: number;
  axisEnd?: number;
}) {
  const SPAN = axisEnd - axisStart;
  // Cap bookability at the end of the open interval covering `t` (detail view derives it
  // from `open`; the map supplies its own `freeAt`). A room that can't fit a 30-min block
  // before that close reads as unavailable, so segments just before closing go red.
  const capAt = (t: number) => (open ? closeAfter(open, t) || DAY_END : DAY_END);
  const countAt = freeAt ?? ((t: number) => freeCount(day ?? [], t, capAt(t)));
  // Denominator at a minute: rooms actually in service then (drops closed libraries
  // on the map). Defaults to the fixed total (detail view: a single library).
  const totalOf = totalAt ?? (() => total);
  // Closed at `t` when hours are supplied and no interval covers it (before open, in a
  // mid-day gap, or after close). `open` omitted → treated as always open.
  const closedAt = (t: number) => (open === undefined ? false : !isOpenAt(open, t));
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const setFromX = (clientX: number) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
    let m = Math.min(axisStart + Math.round((ratio * SPAN) / 15) * 15, axisEnd - 15);
    // Can't scrub into the past — on today the floor is the current 15-min block.
    const floor = isToday ? Math.floor(nowMin / 15) * 15 : axisStart;
    m = Math.max(m, floor);
    onChange(m);
  };

  const step = 20;
  const segs = [];
  const lastT = axisEnd - step; // widen every block but the last so they overlap (no seams)
  for (let t = axisStart; t < axisEnd; t += step) {
    const c = countAt(t);
    const tot = totalOf(t);
    // Bake the fade into an OPAQUE color (mix toward the card background) instead of using
    // `opacity`: opaque blocks can overlap by 1px to close subpixel seams without the
    // translucent double-darkening an overlap would otherwise cause.
    const fade = c === 0 ? 0.4 : 0.4 + 0.45 * (tot ? c / tot : 0);
    segs.push(
      <div
        key={t}
        className={styles.seg}
        style={{
          left: `${((t - axisStart) / SPAN) * 100}%`,
          // +1px overlap into the next block hides the <1px gaps that %-rounding leaves
          // between many blocks (visible as thin card-colored lines on the wide 24h axis).
          width: t < lastT ? `calc(${(step / SPAN) * 100}% + 1px)` : `${(step / SPAN) * 100}%`,
          background: `color-mix(in srgb, ${colorForCount(c, tot)} ${fade * 100}%, var(--card))`,
        }}
      />,
    );
  }

  // Hourly indicators across the axis; label less often when the span is wide (a full
  // 24h axis labels every 4h, the standard 16h frame every 2h) to stay legible.
  const startH = Math.ceil(axisStart / 60);
  const endH = Math.floor(axisEnd / 60);
  const labelEvery = SPAN > 16 * 60 ? 4 : 2;
  const axisTicks = [];
  for (let h = startH; h <= endH; h++) {
    const pct = ((h * 60 - axisStart) / SPAN) * 100;
    const labeled = (h - startH) % labelEvery === 0;
    const mer = h % 24 < 12 ? "a" : "p";
    const hh = h % 12 === 0 ? 12 : h % 12;
    axisTicks.push(
      <span key={h} className={styles.tick} style={{ left: `${pct}%` }}>
        {labeled && <em>{hh}{mer}</em>}
      </span>,
    );
  }

  const f = fmtTime(selMin);
  const closedSel = closedAt(selMin);
  const c = closedSel ? 0 : countAt(selMin);
  // Offer a one-tap escape from a nothing-open moment: when 0 rooms are bookable at
  // selMin and a later slot exists, jump straight to it.
  const nf = nextFree != null ? fmtTime(nextFree) : null;
  const showJump = c === 0 && nextFree != null && !!onJump && nf;
  const denom = totalOf(selMin);
  const liveNow = live && isToday;

  // If closed now but opens later this day (incl. reopening after a mid-day gap), surface
  // the next opening time.
  const opensMin = open ? opensLaterToday(open, selMin) : null;
  const of = opensMin != null ? fmtTime(opensMin) : null;
  const opensSuffix = of ? ` · opens ${of.str}${of.mer}` : "";

  // Grey out everything before now (today only), snapped down to a 15-min mark.
  const pastCutoff = Math.floor(nowMin / 15) * 15;
  const pastPct = ((pastCutoff - axisStart) / SPAN) * 100;

  return (
    <div className={`${styles.timebox} ${compact ? styles.compactBox : ""}`}>
      <div className={styles.row}>
        {compact ? (
          <div className={styles.selc}>
            <b>{f.str}</b>{f.mer} ·{" "}
            {closedSel ? (
              <span className={styles.closedTxt}>Closed{opensSuffix}</span>
            ) : (
              <><b>{c}</b>/{denom} open</>
            )}
          </div>
        ) : (
          <div className={styles.sel}>
            <b>{f.str}</b>
            <span>{f.mer}</span>
          </div>
        )}
        <div className={styles.actions}>
          {showJump && (
            <button className={styles.nextbtn} onClick={() => onJump!(nextFree!)}>
              Next open {nf!.str}{nf!.mer} <span aria-hidden>→</span>
            </button>
          )}
          {showNow && (
            <button className={`${styles.nowbtn} ${liveNow ? styles.liveOn : ""}`} onClick={onNow}>
              {liveNow ? "● Now" : "Jump to now"}
            </button>
          )}
        </div>
      </div>
      {!compact && showCount && (
        <div className={styles.freenow}>
          {closedSel ? (
            <span className={styles.closedTxt}>Closed at {f.str} {f.mer}{opensSuffix}</span>
          ) : (
            <><b>{c}</b> of {denom} rooms open at {f.str} {f.mer}</>
          )}
        </div>
      )}
      <div
        ref={trackRef}
        className={styles.track}
        onPointerDown={(e) => {
          dragging.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          setFromX(e.clientX);
        }}
        onPointerMove={(e) => dragging.current && setFromX(e.clientX)}
        onPointerUp={() => (dragging.current = false)}
        onPointerCancel={() => (dragging.current = false)}
      >
        {segs}
        {/* Grey every closed stretch within the axis — before open, the gaps BETWEEN open
            intervals (e.g. Uris's 02:45–09:00 overnight gap), and after close. */}
        {open !== undefined &&
          closedStretches(open, axisStart, axisEnd).map(([s, e]) => (
            <div
              key={s}
              className={styles.closedOv}
              style={{ left: `${((s - axisStart) / SPAN) * 100}%`, width: `${((e - s) / SPAN) * 100}%` }}
            />
          ))}
        {isToday && pastPct > 0 && (
          <div className={styles.past} style={{ width: `${pastPct}%` }} />
        )}
        {isToday && (
          <div className={styles.nowline} style={{ left: `${((nowMin - axisStart) / SPAN) * 100}%` }} />
        )}
        {/* Clamp to the axis: the shared selMin can land outside this library's frame
            (e.g. a 2:30am time carried over to a library that opens at 9a) — pin the thumb
            to the edge rather than letting it fly off-screen. */}
        <div
          className={styles.thumb}
          style={{ left: `${Math.max(0, Math.min(100, ((selMin - axisStart) / SPAN) * 100))}%` }}
        />
      </div>
      <div className={styles.axis}>{axisTicks}</div>
    </div>
  );
}
