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
  selMin,
  onChange,
  isToday,
  nowMin,
  live,
  onNow,
  compact = false,
}: {
  /** A single library's day (detail view). Ignored when `freeAt` is supplied. */
  day?: RoomAvailability[];
  /** Custom free-count at a given minute — e.g. summed across all libraries (map). */
  freeAt?: (min: number) => number;
  total: number;
  selMin: number;
  onChange: (min: number) => void;
  isToday: boolean;
  nowMin: number;
  live: boolean;
  onNow: () => void;
  /** Slim variant for the campus map (count folded inline; no big header or ticks). */
  compact?: boolean;
}) {
  const countAt = freeAt ?? ((t: number) => freeCount(day ?? [], t));
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const setFromX = (clientX: number) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
    const m = Math.min(DAY_START + Math.round((ratio * SPAN) / 15) * 15, DAY_END - 15);
    onChange(m);
  };

  const step = 20;
  const segs = [];
  for (let t = DAY_START; t < DAY_END; t += step) {
    const c = countAt(t);
    segs.push(
      <div
        key={t}
        className={styles.seg}
        style={{
          left: `${((t - DAY_START) / SPAN) * 100}%`,
          width: `${(step / SPAN) * 100}%`,
          background: colorForCount(c, total),
          opacity: c === 0 ? 0.4 : 0.4 + 0.45 * (total ? c / total : 0),
        }}
      />,
    );
  }

  const f = fmtTime(selMin);
  const c = countAt(selMin);
  const liveNow = live && isToday;

  // Grey out everything before now (today only), snapped down to a 15-min mark.
  const pastCutoff = Math.floor(nowMin / 15) * 15;
  const pastPct = ((pastCutoff - DAY_START) / SPAN) * 100;

  return (
    <div className={`${styles.timebox} ${compact ? styles.compactBox : ""}`}>
      <div className={styles.row}>
        {compact ? (
          <div className={styles.selc}>
            <b>{f.str}</b>{f.mer} · <b>{c}</b>/{total} open
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
          <b>{c}</b> of {total} rooms open at {f.str} {f.mer}
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
        {isToday && pastPct > 0 && (
          <div className={styles.past} style={{ width: `${pastPct}%` }} />
        )}
        {isToday && (
          <div className={styles.nowline} style={{ left: `${((nowMin - DAY_START) / SPAN) * 100}%` }} />
        )}
        <div className={styles.thumb} style={{ left: `${((selMin - DAY_START) / SPAN) * 100}%` }} />
      </div>
      {!compact && (
        <div className={styles.ticks}>
          <span>8a</span><span>12p</span><span>4p</span><span>8p</span><span>12a</span>
        </div>
      )}
    </div>
  );
}
