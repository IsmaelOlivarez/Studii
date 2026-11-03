"use client";
import { useState } from "react";
import styles from "./FloorPlan.module.css";
import { statusAt } from "@/lib/time/slots";
import { DAY_END } from "@/domain/constants";
import type { Library, RoomAvailability } from "@/domain/types";
import { getFloorLayout } from "./layouts";

// Status is carried by a distinct GLYPH per state (not color alone), so it survives for
// colorblind users and screen readers (WCAG 1.4.1). Color stays as a reinforcing cue.
const GLYPH: Record<string, string> = { free: "✓", limited: "◷", full: "✕", closed: "–" };
const STATUS_WORD: Record<string, string> = {
  free: "open",
  limited: "ends soon",
  full: "booked",
  closed: "closed",
};

export function FloorPlan({
  library,
  day,
  selMin,
  closed = false,
  closeMin = DAY_END,
  onRoomClick,
}: {
  library: Library;
  day: RoomAvailability[];
  selMin: number;
  closed?: boolean; // library closed at selMin (incl. absent-grid days) → all unavailable
  closeMin?: number; // library's close minute → rooms unbookable within 30 min read full
  onRoomClick: (id: string) => void;
}) {
  const layout = getFloorLayout(library.slug);
  const [tierKey, setTierKey] = useState<string | undefined>(undefined);

  // The selected floor, falling back to the first tier when nothing valid is chosen
  // (including after switching to a different library whose tier keys differ).
  const activeTier = layout.tiers?.some((t) => t.key === tierKey)
    ? tierKey
    : layout.tiers?.[0]?.key;
  const rooms = activeTier
    ? library.rooms.filter((r) => r.id.startsWith(activeTier))
    : library.rooms;

  const busyOf = (id: string) => day.find((r) => r.roomId === id)?.busy ?? [];

  return (
    <>
      <div className={styles.legend}>
        <i><b className={styles.sw} style={{ background: "var(--free)" }} aria-hidden>✓</b>Open</i>
        <i><b className={styles.sw} style={{ background: "var(--limited)" }} aria-hidden>◷</b>Ends soon</i>
        <i><b className={styles.sw} style={{ background: "var(--full)" }} aria-hidden>✕</b>Booked</i>
        <i><b className={styles.sw} style={{ background: "var(--ink-faint)" }} aria-hidden>–</b>Closed</i>
        {layout.note && <i className={styles.note}>{layout.note}</i>}
      </div>

      {layout.tiers && (
        <div className={styles.floorTabs} role="tablist">
          {layout.tiers.map((t) => {
            const open = closed
              ? 0
              : day.filter(
                  (r) => r.roomId.startsWith(t.key) && statusAt(busyOf(r.roomId), selMin, closeMin) === "free",
                ).length;
            return (
              <button
                key={t.key}
                role="tab"
                aria-selected={t.key === activeTier}
                className={`${styles.floorTab} ${t.key === activeTier ? styles.floorTabOn : ""}`}
                onClick={() => setTierKey(t.key)}
              >
                {t.label}
                <em>{closed ? "closed" : `${open} open`}</em>
              </button>
            );
          })}
        </div>
      )}

      <div className={`${styles.floor} ${layout.floorClass}`}>
        {layout.shell}

        {rooms.map((r, i) => {
          const st = closed ? "closed" : statusAt(busyOf(r.id), selMin, closeMin); // "free" | "limited" | "full" | "closed"
          const { className, style } = layout.roomProps(r, i, rooms.length);
          return (
            <button
              key={r.id}
              className={`${styles.room} ${styles[st]} ${className ?? ""} ${layout.compact ? styles.compact : ""}`}
              style={style}
              onClick={() => onRoomClick(r.id)}
              aria-label={`Room ${r.id} — ${STATUS_WORD[st]}`}
            >
              <span className={styles.rd} aria-hidden>{GLYPH[st]}</span>
              <span className={styles.rn}>{r.id}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}
