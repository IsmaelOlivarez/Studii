"use client";
import { useState } from "react";
import styles from "./FloorPlan.module.css";
import { statusAt } from "@/lib/time/slots";
import type { Library, RoomAvailability } from "@/domain/types";
import { getFloorLayout } from "./layouts";

export function FloorPlan({
  library,
  day,
  selMin,
  selTimeLabel,
  closed = false,
  onRoomClick,
}: {
  library: Library;
  day: RoomAvailability[];
  selMin: number;
  selTimeLabel: string;
  closed?: boolean; // library closed at selMin → all rooms unavailable
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
      <div className={styles.floorhead}>
        <h3>Floor plan</h3>
        <span>{closed ? "Closed" : `at ${selTimeLabel}`}</span>
      </div>
      <div className={styles.legend}>
        <i><b style={{ background: "var(--free)" }} />Open</i>
        <i><b style={{ background: "var(--limited)" }} />Opening soon</i>
        <i><b style={{ background: "var(--full)" }} />Booked</i>
        {layout.note && <i className={styles.note}>{layout.note}</i>}
      </div>

      {layout.tiers && (
        <div className={styles.floorTabs} role="tablist">
          {layout.tiers.map((t) => {
            const open = closed
              ? 0
              : day.filter(
                  (r) => r.roomId.startsWith(t.key) && statusAt(busyOf(r.roomId), selMin) === "free",
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
          const st = closed ? "closed" : statusAt(busyOf(r.id), selMin); // "free" | "limited" | "full" | "closed"
          const { className, style } = layout.roomProps(r, i, rooms.length);
          return (
            <button
              key={r.id}
              className={`${styles.room} ${styles[st]} ${className ?? ""} ${layout.compact ? styles.compact : ""}`}
              style={style}
              onClick={() => onRoomClick(r.id)}
            >
              <span className={styles.rd} />
              <span className={styles.rn}>{r.id}</span>
              {!layout.compact && <span className={styles.rc}>{r.cap} seats</span>}
            </button>
          );
        })}
      </div>
    </>
  );
}
