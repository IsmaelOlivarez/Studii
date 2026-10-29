"use client";
import { useCallback, useEffect, useState } from "react";
import styles from "./StudiiApp.module.css";
import { StatusBar } from "@/components/ui/StatusBar";
import { CampusMap } from "@/features/campus-map/CampusMap";
import { FloorPlan } from "@/features/floor-plan/FloorPlan";
import { TimeBar } from "@/features/availability/TimeBar";
import { DateChips } from "@/features/availability/DateChips";
import { RoomSheet } from "@/features/booking/RoomSheet";
import { BUTLER, LIBRARIES } from "@/lib/libcal/rooms";
import { DAY_START, DAY_END } from "@/domain/constants";
import { freeCount } from "@/lib/time/slots";
import { fmtTime } from "@/lib/time/date";
import type { AvailabilitySnapshot, Library } from "@/domain/types";

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

async function fetchSnapshot(slug: string): Promise<AvailabilitySnapshot | null> {
  try {
    const res = await fetch(`/api/availability?lib=${slug}`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as AvailabilitySnapshot;
  } catch {
    return null;
  }
}

export function StudiiApp() {
  // Live availability is fetched from /api/availability only on the client (after
  // mount) to keep the prerender deterministic. The route serves a cached,
  // normalized snapshot (stale-while-revalidate + coalesced upstream polling).
  //
  // The campus map shows every library's live ring at once, so we hold a snapshot
  // PER library (keyed by slug). The server-side cache coalesces, so fetching all
  // of them is still at most one LibCal refresh per library per TTL.
  const [snapshots, setSnapshots] = useState<Record<string, AvailabilitySnapshot>>({});
  const [view, setView] = useState<"map" | "detail">("map");
  const [dateIdx, setDateIdx] = useState(0);
  const [selMin, setSelMin] = useState(NOON);
  const [nowMin, setNowMin] = useState(NOON);
  const [live, setLive] = useState(false);
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  // The library the user has opened from the map. Drives the whole detail view
  // (header, floor plan, room sheet, which snapshot it reads).
  const [activeLibrary, setActiveLibrary] = useState<Library>(BUTLER);

  const refreshAll = useCallback(() => {
    for (const lib of LIBRARIES) {
      fetchSnapshot(lib.slug).then(
        (s) => s && setSnapshots((prev) => ({ ...prev, [lib.slug]: s })),
      );
    }
  }, []);

  useEffect(() => {
    refreshAll();
    const n = clampNow();
    setNowMin(n);
    setSelMin(n);
    setLive(true);
  }, [refreshAll]);

  useEffect(() => {
    const id = setInterval(() => {
      const n = clampNow();
      setNowMin(n);
      if (live && dateIdx === 0) setSelMin(n);
      // Re-pull the cached snapshots; the server coalesces so this is cheap and
      // never hits LibCal more than once per TTL regardless of how many clients.
      refreshAll();
    }, 30_000);
    return () => clearInterval(id);
  }, [live, dateIdx, refreshAll]);

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

  // Wait for every library's snapshot so the map's rings all render live at once.
  const ready = LIBRARIES.every((l) => snapshots[l.slug]);
  if (!ready) {
    return (
      <div className={styles.device}>
        <StatusBar />
      </div>
    );
  }

  // Per-library "free right now" for the campus map's rings + summary cards.
  const libStats = LIBRARIES.map((library) => {
    const snap = snapshots[library.slug];
    const today = snap.days[Object.keys(snap.days)[0]] ?? [];
    return { library, free: freeCount(today, nowMin), total: library.rooms.length };
  });

  const snapshot = snapshots[activeLibrary.slug];
  // The grid call fetches a full week in one request; the UI shows the first 5 days.
  const dateKeys = Object.keys(snapshot.days).slice(0, 5);
  const day = snapshot.days[dateKeys[dateIdx]] ?? [];
  const f = fmtTime(selMin);
  const selTimeLabel = `${f.str} ${f.mer}`;
  const dateLabel = dateIdx === 0 ? "today" : dateIdx === 1 ? "tomorrow"
    : parseISO(dateKeys[dateIdx]).toLocaleDateString("en", { weekday: "long" });

  const activeRoomObj = activeRoom ? activeLibrary.rooms.find((r) => r.id === activeRoom) ?? null : null;
  const activeBusy = activeRoom ? day.find((r) => r.roomId === activeRoom)?.busy ?? [] : [];

  return (
    <div className={`${styles.device} ${view === "detail" ? styles.showDetail : ""}`}>
      <StatusBar />
      <div className={styles.screens}>
        <section className={`${styles.screen} ${styles.mapScreen}`}>
          <div className={styles.scroll}>
            <CampusMap
              libs={libStats}
              onEnter={(library) => {
                setActiveLibrary(library);
                setView("detail");
              }}
            />
          </div>
        </section>

        <section className={`${styles.screen} ${styles.detailScreen}`}>
          <div className={styles.dhead}>
            <button className={styles.back} onClick={() => setView("map")} aria-label="Back">
              <svg viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <div className={styles.dtitle}>
              <h2>{activeLibrary.name}</h2>
              <p>{activeLibrary.floorLabel}</p>
            </div>
          </div>
          <div className={styles.scroll}>
            <DateChips dateKeys={dateKeys} activeIdx={dateIdx} onSelect={setDateIdx} />
            <TimeBar day={day} total={activeLibrary.rooms.length} selMin={selMin} onChange={onScrub} isToday={dateIdx === 0} nowMin={nowMin} live={live} onNow={onNow} />
            <FloorPlan library={activeLibrary} day={day} selMin={selMin} selTimeLabel={selTimeLabel} onRoomClick={setActiveRoom} />
            <div style={{ height: 14 }} />
          </div>
        </section>

        <RoomSheet
          library={activeLibrary}
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
