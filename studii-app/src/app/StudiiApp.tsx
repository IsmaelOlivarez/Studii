"use client";
import { useCallback, useEffect, useState } from "react";
import styles from "./StudiiApp.module.css";
import { StatusBar } from "@/components/ui/StatusBar";
import { CampusMap } from "@/features/campus-map/CampusMap";
import { FloorPlan } from "@/features/floor-plan/FloorPlan";
import { TimeBar } from "@/features/availability/TimeBar";
import { DateChips } from "@/features/availability/DateChips";
import { RoomSheet } from "@/features/booking/RoomSheet";
import { butlerFixture } from "@/lib/fixtures/butler";
import { BUTLER } from "@/lib/libcal/rooms";
import { DAY_START, DAY_END } from "@/domain/constants";
import { freeCount } from "@/lib/time/slots";
import { fmtTime } from "@/lib/time/date";
import type { AvailabilitySnapshot } from "@/domain/types";

const NOON = 12 * 60; // deterministic default for SSR/first paint
const clampNow = () => {
  const d = new Date();
  const m = d.getHours() * 60 + d.getMinutes();
  return Math.min(Math.max(m, DAY_START), DAY_END - 15);
};
const parseISO = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export function StudiiApp() {
  // Clock + fixture are read only on the client (after mount) to keep the
  // prerender deterministic. Swapped for the Supabase snapshot later.
  const [snapshot, setSnapshot] = useState<AvailabilitySnapshot | null>(null);
  const [view, setView] = useState<"map" | "detail">("map");
  const [dateIdx, setDateIdx] = useState(0);
  const [selMin, setSelMin] = useState(NOON);
  const [nowMin, setNowMin] = useState(NOON);
  const [live, setLive] = useState(false);
  const [activeRoom, setActiveRoom] = useState<string | null>(null);

  useEffect(() => {
    setSnapshot(butlerFixture(5));
    const n = clampNow();
    setNowMin(n);
    setSelMin(n);
    setLive(true);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      const n = clampNow();
      setNowMin(n);
      if (live && dateIdx === 0) setSelMin(n);
    }, 30_000);
    return () => clearInterval(id);
  }, [live, dateIdx]);

  const onScrub = useCallback((min: number) => {
    setSelMin(min);
    setLive(false);
  }, []);
  const onNow = useCallback(() => {
    const n = clampNow();
    setDateIdx(0);
    setNowMin(n);
    setSelMin(n);
    setLive(true);
  }, []);

  if (!snapshot) {
    return (
      <div className={styles.device}>
        <StatusBar />
      </div>
    );
  }

  const dateKeys = Object.keys(snapshot.days);
  const day = snapshot.days[dateKeys[dateIdx]] ?? [];
  const freeNow = freeCount(day, selMin);
  const f = fmtTime(selMin);
  const selTimeLabel = `${f.str} ${f.mer}`;
  const dateLabel = dateIdx === 0 ? "today" : dateIdx === 1 ? "tomorrow"
    : parseISO(dateKeys[dateIdx]).toLocaleDateString("en", { weekday: "long" });

  const activeRoomObj = activeRoom ? BUTLER.rooms.find((r) => r.id === activeRoom) ?? null : null;
  const activeBusy = activeRoom ? day.find((r) => r.roomId === activeRoom)?.busy ?? [] : [];

  return (
    <div className={`${styles.device} ${view === "detail" ? styles.showDetail : ""}`}>
      <StatusBar />
      <div className={styles.screens}>
        <section className={`${styles.screen} ${styles.mapScreen}`}>
          <div className={styles.scroll}>
            <CampusMap freeNow={freeNow} onEnter={() => setView("detail")} />
          </div>
        </section>

        <section className={`${styles.screen} ${styles.detailScreen}`}>
          <div className={styles.dhead}>
            <button className={styles.back} onClick={() => setView("map")} aria-label="Back">
              <svg viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <div className={styles.dtitle}>
              <h2>Butler Library</h2>
              <p>Floor 4 — Group Study</p>
            </div>
          </div>
          <div className={styles.scroll}>
            <DateChips dateKeys={dateKeys} activeIdx={dateIdx} onSelect={setDateIdx} />
            <TimeBar day={day} selMin={selMin} onChange={onScrub} isToday={dateIdx === 0} nowMin={nowMin} live={live} onNow={onNow} />
            <FloorPlan rooms={BUTLER.rooms} day={day} selMin={selMin} selTimeLabel={selTimeLabel} onRoomClick={setActiveRoom} />
            <div style={{ height: 14 }} />
          </div>
        </section>

        <RoomSheet
          room={activeRoomObj}
          busy={activeBusy}
          selMin={selMin}
          date={dateKeys[dateIdx]}
          dateLabel={dateLabel}
          open={!!activeRoom}
          onClose={() => setActiveRoom(null)}
        />
      </div>
    </div>
  );
}
