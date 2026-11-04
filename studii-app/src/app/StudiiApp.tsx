"use client";
import { useCallback, useEffect, useState } from "react";
import styles from "./StudiiApp.module.css";
import { CampusMap } from "@/features/campus-map/CampusMap";
import { FloorPlan } from "@/features/floor-plan/FloorPlan";
import { TimeBar } from "@/features/availability/TimeBar";
import { DateChips } from "@/features/availability/DateChips";
import { RoomSheet } from "@/features/booking/RoomSheet";
import { BUTLER, LIBRARIES } from "@/lib/libcal/rooms";
import { DAY_START, DAY_END } from "@/domain/constants";
import { freeCount, nextFreeMinute } from "@/lib/time/slots";
import { fmtTime, minutesNow, ymd } from "@/lib/time/date";
import { isOpenAt, opensLaterToday } from "@/lib/time/hours";
import type { AvailabilitySnapshot, Library } from "@/domain/types";

const NOON = 12 * 60; // deterministic default for SSR/first paint
const clampNow = () => {
  // "Now" in the library's timezone — so a viewer outside Eastern still scrubs to the
  // correct local-to-the-library minute (and matches the day the data is keyed by).
  const m = minutesNow();
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
    return <div className={styles.device} />;
  }

  const snapshot = snapshots[activeLibrary.slug];
  // Canonical date window = the UNION of every library's returned dates (sorted, first
  // 5). This way each chip means the SAME real date for every library. LibCal omits
  // whole days for some libraries (see normalize.ts), so a library can lack a date that
  // another has — that's "no data" for it on that day, NOT free. Deriving the window
  // from one library would silently shift it when you switch libraries.
  const dateKeys = [
    ...new Set(LIBRARIES.flatMap((l) => Object.keys(snapshots[l.slug].days))),
  ]
    .sort()
    .slice(0, 5);
  const dayKey = dateKeys[dateIdx] ?? dateKeys[0];
  // A day the library's grid never returned is absent → treated as CLOSED (its open
  // window is null). `.rooms` drives availability; `.open` drives hours.
  const day = snapshot.days[dayKey]?.rooms ?? [];
  const f = fmtTime(selMin);
  const selTimeLabel = `${f.str} ${f.mer}`;
  // Date labels keyed to the REAL date, not chip position, so "Today"/"Tomorrow" can
  // never mislabel a shifted window.
  const dateLabel =
    dayKey === ymd(0) ? "today" : dayKey === ymd(1) ? "tomorrow"
    : parseISO(dayKey).toLocaleDateString("en", { weekday: "long" });
  const isToday = dayKey === ymd(0);

  // Map view: every library's availability on the selected date, at the selected time
  // (shared with detail). Each library's open window comes from its grid for this day
  // (null = closed/absent → 0 free + a Closed state).
  const libWins = LIBRARIES.map((lib) => snapshots[lib.slug].days[dayKey]?.open ?? null);
  const libDays = LIBRARIES.map((lib) => snapshots[lib.slug].days[dayKey]?.rooms ?? []);
  // Close minute per library for the day → bounds bookability (a room that can't fit a
  // 30-min block before close reads unavailable). DAY_END when open past the window.
  const libCloseMin = libWins.map((w) => w?.[1] ?? DAY_END);
  const libStats = LIBRARIES.map((library, i) => {
    const closed = !isOpenAt(libWins[i], selMin);
    const opensMin = opensLaterToday(libWins[i], selMin);
    const fo = opensMin != null ? fmtTime(opensMin) : null;
    const free = closed ? 0 : freeCount(libDays[i], selMin, libCloseMin[i]);
    // When nothing is bookable right now, answer "so when CAN I?" — the soonest minute a
    // room frees up (or the library reopens with a room free). null = nothing more today.
    const nf = free === 0 ? nextFreeMinute(libDays[i], selMin, libWins[i]) : null;
    const nff = nf != null ? fmtTime(nf) : null;
    return {
      library,
      free,
      total: library.rooms.length,
      closed,
      opensLabel: fo ? `${fo.str}${fo.mer}` : null,
      nextFree: nf,
      nextFreeLabel: nff ? `${nff.str}${nff.mer}` : null,
    };
  });
  const campusTotal = LIBRARIES.reduce((s, l) => s + l.rooms.length, 0);
  // Only libraries open at that minute contribute to the campus N/total — a closed
  // (or absent-grid) library drops out of both numerator and denominator.
  const campusFreeAt = (t: number) =>
    LIBRARIES.reduce((s, _lib, i) => s + (isOpenAt(libWins[i], t) ? freeCount(libDays[i], t, libCloseMin[i]) : 0), 0);
  const campusOpenTotal = (t: number) =>
    LIBRARIES.reduce((s, lib, i) => s + (isOpenAt(libWins[i], t) ? lib.rooms.length : 0), 0);
  const whenLabel = live && isToday ? "now" : `at ${selTimeLabel}`;
  // Campus-wide "next open": the earliest minute ANY library has a bookable room, so the
  // map's time bar can jump straight out of a nothing-open dead end. null when the whole
  // campus is done for the day.
  const campusNextFree =
    libStats.map((s) => s.nextFree).filter((m): m is number => m != null).sort((a, b) => a - b)[0] ?? null;
  // Scrub to a specific minute (used by the "Next open" jumps); drops live mode.
  const jumpTo = (min: number) => onScrub(min);

  // Detail view: the active library's window for this day (null = closed all day).
  const detailWin = snapshot.days[dayKey]?.open ?? null;
  const detailClosed = !isOpenAt(detailWin, selMin);
  const detailOpensMin = opensLaterToday(detailWin, selMin);
  const detailCloseMin = detailWin?.[1] ?? DAY_END;
  // Live open-count for the active library at selMin — shown in the detail header
  // (so the count isn't duplicated down in the time bar). Updates as you scrub.
  const detailFree = detailClosed ? 0 : freeCount(day, selMin, detailCloseMin);
  const detailOpensLabel = detailOpensMin != null ? fmtTime(detailOpensMin) : null;
  // Soonest bookable minute in the active library when nothing is open now → powers the
  // "Next open" jump on the detail time bar.
  const detailNextFree = detailFree === 0 ? nextFreeMinute(day, selMin, detailWin) : null;

  const activeRoomObj = activeRoom ? activeLibrary.rooms.find((r) => r.id === activeRoom) ?? null : null;
  const activeBusy = activeRoom ? day.find((r) => r.roomId === activeRoom)?.busy ?? [] : [];

  return (
    <div className={`${styles.device} ${view === "detail" ? styles.showDetail : ""}`}>
      <div className={styles.screens}>
        <section className={`${styles.screen} ${styles.mapScreen}`}>
          <div className={styles.scroll}>
            <CampusMap
              libs={libStats}
              onEnter={(library) => {
                setActiveLibrary(library);
                setView("detail");
              }}
              whenLabel={whenLabel}
              time={{
                dateKeys,
                dateIdx,
                onSelectDate: setDateIdx,
                selMin,
                onScrub,
                nowMin,
                live,
                onNow,
                freeAt: campusFreeAt,
                total: campusTotal,
                totalAt: campusOpenTotal,
                nextFree: campusNextFree,
                onJump: jumpTo,
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
              {detailClosed ? (
                <p className={styles.dclosed}>
                  {detailOpensLabel ? `Closed · opens ${detailOpensLabel.str}${detailOpensLabel.mer}` : "Closed"}
                </p>
              ) : (
                <p className={`${styles.dcount} ${detailFree === 0 ? styles.dcountNone : ""}`}><b>{detailFree}</b> of {activeLibrary.rooms.length} open</p>
              )}
            </div>
            <button
              className={`${styles.hnow} ${live && isToday ? styles.hnowOn : ""}`}
              onClick={onNow}
            >
              {live && isToday ? "● Now" : "Now"}
            </button>
          </div>
          <div className={styles.scroll}>
            <FloorPlan library={activeLibrary} day={day} selMin={selMin} closed={detailClosed} closeMin={detailCloseMin} onRoomClick={setActiveRoom} />
            <DateChips dateKeys={dateKeys} activeIdx={dateIdx} onSelect={setDateIdx} />
            <TimeBar day={day} total={activeLibrary.rooms.length} open={detailWin} selMin={selMin} onChange={onScrub} isToday={isToday} nowMin={nowMin} live={live} onNow={onNow} showNow={false} showCount={false} nextFree={detailNextFree} onJump={jumpTo} />
            <div style={{ height: 14 }} />
          </div>
        </section>

        <RoomSheet
          library={activeLibrary}
          room={activeRoomObj}
          busy={activeBusy}
          selMin={selMin}
          date={dayKey}
          dateLabel={dateLabel}
          closed={detailClosed}
          closeMin={detailCloseMin}
          opensMin={detailOpensMin}
          open={!!activeRoom}
          onClose={() => setActiveRoom(null)}
        />
      </div>
    </div>
  );
}
