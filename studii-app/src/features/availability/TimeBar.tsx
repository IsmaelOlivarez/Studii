"use client";
import { useRef } from "react";
import styles from "./TimeBar.module.css";
import { DAY_START, DAY_END } from "@/domain/constants";
import { freeCount } from "@/lib/time/slots";
import { fmtTime } from "@/lib/time/date";
import type { RoomAvailability } from "@/domain/types";

const SPAN = DAY_END - DAY_START;
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
  open,
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
  /** Open window `[start,end)` for this library/date; `null` = closed all day;
   *  omit = always open. Closed stretches are greyed and read as 0 open. */
  open?: [number, number] | null;
}) {
  // Cap bookability at close (detail view derives it from `open`; the map supplies its
  // own per-library `freeAt`). A room that can't fit a 30-min block before close reads
  // as unavailable, so segments just before closing go red like booked ones.
  const cap = open?.[1] ?? DAY_END;
  const countAt = freeAt ?? ((t: number) => freeCount(day ?? [], t, cap));
  // Denominator at a minute: rooms actually in service then (drops closed libraries
  // on the map). Defaults to the fixed total (detail view: a single library).
  const totalOf = totalAt ?? (() => total);
  const closedAt = (t: number) => {
    if (open === undefined) return false;
    if (open === null) return true;
    return t < open[0] || t >= open[1];
  };
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const setFromX = (clientX: number) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
    let m = Math.min(DAY_START + Math.round((ratio * SPAN) / 15) * 15, DAY_END - 15);
    // Can't scrub into the past — on today the floor is the current 15-min block.
    const floor = isToday ? Math.floor(nowMin / 15) * 15 : DAY_START;
    m = Math.max(m, floor);
    onChange(m);
  };

  const step = 20;
  const segs = [];
  for (let t = DAY_START; t < DAY_END; t += step) {
    const c = countAt(t);
    const tot = totalOf(t);
    segs.push(
      <div
        key={t}
        className={styles.seg}
        style={{
          left: `${((t - DAY_START) / SPAN) * 100}%`,
          width: `${(step / SPAN) * 100}%`,
          background: colorForCount(c, tot),
          opacity: c === 0 ? 0.4 : 0.4 + 0.45 * (tot ? c / tot : 0),
        }}
      />,
    );
  }

  // Hourly indicators (8a → 12a), labeled every 2 hours to stay legible.
  const axisTicks = [];
  for (let h = 8; h <= 24; h++) {
    const pct = ((h * 60 - DAY_START) / SPAN) * 100;
    const labeled = (h - 8) % 2 === 0;
    const mer = h < 12 || h === 24 ? "a" : "p";
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
  const denom = totalOf(selMin);
  const liveNow = live && isToday;

  // If closed now but opens later this day, surface the opening time.
  const opensMin = open && selMin < open[0] ? open[0] : null;
  const of = opensMin != null ? fmtTime(opensMin) : null;
  const opensSuffix = of ? ` · opens ${of.str}${of.mer}` : "";

  // Grey out everything before now (today only), snapped down to a 15-min mark.
  const pastCutoff = Math.floor(nowMin / 15) * 15;
  const pastPct = ((pastCutoff - DAY_START) / SPAN) * 100;

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
        <button className={`${styles.nowbtn} ${liveNow ? styles.liveOn : ""}`} onClick={onNow}>
          {liveNow ? "● Now" : "Jump to now"}
        </button>
      </div>
      {!compact && (
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
        {/* Closed stretches greyed out (building closed → rooms unavailable). */}
        {open === null && <div className={styles.closedOv} style={{ left: 0, width: "100%" }} />}
        {open && open[0] > DAY_START && (
          <div className={styles.closedOv} style={{ left: 0, width: `${((open[0] - DAY_START) / SPAN) * 100}%` }} />
        )}
        {open && open[1] < DAY_END && (
          <div
            className={styles.closedOv}
            style={{ left: `${((open[1] - DAY_START) / SPAN) * 100}%`, width: `${((DAY_END - open[1]) / SPAN) * 100}%` }}
          />
        )}
        {isToday && pastPct > 0 && (
          <div className={styles.past} style={{ width: `${pastPct}%` }} />
        )}
        {isToday && (
          <div className={styles.nowline} style={{ left: `${((nowMin - DAY_START) / SPAN) * 100}%` }} />
        )}
        <div className={styles.thumb} style={{ left: `${((selMin - DAY_START) / SPAN) * 100}%` }} />
      </div>
      <div className={styles.axis}>{axisTicks}</div>
    </div>
  );
}
