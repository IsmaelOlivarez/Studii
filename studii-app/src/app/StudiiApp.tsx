"use client";
import { useCallback, useEffect, useState } from "react";
import styles from "./StudiiApp.module.css";
import { CampusMap } from "@/features/campus-map/CampusMap";
import { FloorPlan } from "@/features/floor-plan/FloorPlan";
import { StatusKey } from "@/features/floor-plan/StatusKey";
import { getFloorLayout } from "@/features/floor-plan/layouts";
import { TimeBar } from "@/features/availability/TimeBar";
import { DateChips } from "@/features/availability/DateChips";
import { wantMinutes, type DurationPref } from "@/features/availability/DurationToggle";
import { RoomSheet } from "@/features/booking/RoomSheet";
import { BUTLER, LIBRARIES } from "@/lib/libcal/rooms";
import { DAY_START, DAY_END } from "@/domain/constants";
import { freeCount, nextFreeMinute } from "@/lib/time/slots";
import { fmtTime, minutesNow, ymd } from "@/lib/time/date";
import { isOpenAt, opensLaterToday, closeAfter, spanOf, mergeHours, typicalWindow, displayHours } from "@/lib/time/hours";
import type { OpenHours } from "@/lib/time/hours";
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

// The visible time axis never shrinks below the familiar 8a–midnight frame; it only
// EXTENDS to cover hours that run earlier or later (e.g. 24h Butler → full 00:00–24:00).
const axisBounds = (hours: OpenHours): [number, number] => {
  const sp = spanOf(hours);
  return [Math.min(DAY_START, sp?.[0] ?? DAY_START), Math.max(DAY_END, sp?.[1] ?? DAY_END)];
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
  // The glyph/color key is tucked behind a header ⓘ toggle (the tiles carry status on
  // their own), so the detail view opens clean. Reset it whenever the view changes.
  const [showKey, setShowKey] = useState(false);
  // Desired booking length, preselected on the map (default "all" = no preference). Drives
  // what counts as a "free" room everywhere — map rings/cards, detail header, floor tiles,
  // and the "next open" jumps all resolve availability against `want` minutes.
  const [durPref, setDurPref] = useState<DurationPref>("all");
  const want = wantMinutes(durPref);
  // Carry the map preselection into the booking sheet's length picker. "all" = no stated
  // preference, so the sheet keeps its own default (max); a chosen 30/90/120 seeds it.
  const preferDur = durPref === "all" ? null : durPref;

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
  // Switching days re-validates the selected time against the new day. A future day can be
  // scrubbed into the past/overnight (e.g. 2:30am), which isn't reachable on today — so when
  // flipping back to today, snap a past selMin up to the current time instead of leaving it
  // on an unreachable minute until the next scrub.
  const onSelectDate = useCallback((i: number) => {
    setDateIdx(i);
    if (i === 0) {
      const floor = Math.floor(clampNow() / 15) * 15;
      setSelMin((m) => Math.max(m, floor));
    }
  }, []);

  // Render as soon as ANY library's snapshot has landed — a single slow or failing
  // library must never hold the whole campus hostage (it used to: the gate required
  // EVERY snapshot, so one persistent 503 left the user on a blank frame forever).
  // Libraries still in flight render as muted "updating" rings; the 30s poll fills them
  // in. Only the truly empty-handed first moment shows the loader below.
  //
  // Canonical date window = the UNION of the loaded libraries' returned dates (sorted,
  // first 5). Each chip means the SAME real date for every library. LibCal omits whole
  // days for some libraries (see normalize.ts), so a library can lack a date another has
  // — that's "no data" for it on that day, NOT free. A not-yet-loaded library simply
  // contributes nothing to the window until its snapshot arrives.
  const dateKeys = [
    ...new Set(LIBRARIES.flatMap((l) => Object.keys(snapshots[l.slug]?.days ?? {}))),
  ]
    .sort()
    .slice(0, 5);

  // Nothing has loaded yet (no snapshot at all) → an on-brand loader instead of a blank
  // device frame, so first paint always shows the app is doing something.
  if (dateKeys.length === 0) {
    return (
      <div className={styles.device}>
        <div className={styles.loading}>
          <div className={styles.loadingMark}>Stud<i>ii</i></div>
          <div className={styles.loadingTxt}>Loading campus…</div>
        </div>
      </div>
    );
  }

  // The active library's snapshot may still be loading (its endpoint is flaky, or you
  // opened it before its first poll landed). Guard every read off it so the detail view
  // degrades to a small "loading" placeholder rather than crashing on `undefined`.
  const snapshot = snapshots[activeLibrary.slug];
  const activeLoaded = !!snapshot;
  const dayKey = dateKeys[dateIdx] ?? dateKeys[0];
  // A day the library's grid never returned is absent → treated as CLOSED (its open
  // window is null). `.rooms` drives availability; `.open` drives hours.
  const day = snapshot?.days[dayKey]?.rooms ?? [];
  const f = fmtTime(selMin);
  const selTimeLabel = `${f.str} ${f.mer}`;
  // Date labels keyed to the REAL date, not chip position, so "Today" can never mislabel a
  // shifted window. Every other day (incl. tomorrow) reads as its weekday name (Friday, …).
  const dateLabel =
    dayKey === ymd(0) ? "today"
    : parseISO(dayKey).toLocaleDateString("en", { weekday: "long" });
  const isToday = dayKey === ymd(0);

  // Map view: every library's availability on the selected date, at the selected time
  // (shared with detail). Each library's OPEN INTERVALS come from its grid for this day
  // (empty = closed/absent → 0 free + a Closed state), REPAIRED for today: LibCal omits
  // past slots so today's first interval starts at ~now, which falsely greys the day as
  // "closed until now" (glaring for 24h Butler). displayHours restores the real opening
  // from the library's typical hours. Future days (and the closed gaps within them) pass
  // through unchanged.
  const libHours = LIBRARIES.map((lib) => {
    const snap = snapshots[lib.slug];
    if (!snap) return [] as OpenHours; // still loading → no hours (so it reads as not-open)
    const raw = snap.days[dayKey]?.open ?? [];
    const typical = typicalWindow(Object.values(snap.days).map((d) => d.open ?? []));
    return displayHours(raw, isToday, nowMin, typical);
  });
  const libDays = LIBRARIES.map((lib) => snapshots[lib.slug]?.days[dayKey]?.rooms ?? []);
  // Booking cap for a library at a given minute = the end of the OPEN INTERVAL covering it
  // (so a room can't be booked across a closed gap or past close). Computed per-minute
  // because the segments sample many times, not just selMin.
  const capAt = (i: number, t: number) => closeAfter(libHours[i], t) || DAY_END;
  const libStats = LIBRARIES.map((library, i) => {
    // No snapshot yet → "pending": distinct from closed (we don't KNOW it's closed), so
    // it shows a muted "updating" ring rather than a false ✕, and drops out of the campus
    // tallies (libHours[i] is empty → not-open) the same way a closed library does.
    const pending = !snapshots[library.slug];
    const closed = !pending && !isOpenAt(libHours[i], selMin);
    const opensMin = pending ? null : opensLaterToday(libHours[i], selMin);
    const fo = opensMin != null ? fmtTime(opensMin) : null;
    const free = pending || closed ? 0 : freeCount(libDays[i], selMin, capAt(i, selMin), want);
    // When nothing is bookable right now, answer "so when CAN I?" — the soonest minute a
    // room frees up for the desired length (or the library reopens with one). null = none today.
    const nf = !pending && free === 0 ? nextFreeMinute(libDays[i], selMin, libHours[i], want) : null;
    const nff = nf != null ? fmtTime(nf) : null;
    return {
      library,
      free,
      total: library.rooms.length,
      closed,
      pending,
      opensLabel: fo ? `${fo.str}${fo.mer}` : null,
      nextFree: nf,
      nextFreeLabel: nff ? `${nff.str}${nff.mer}` : null,
    };
  });
  const campusTotal = LIBRARIES.reduce((s, l) => s + l.rooms.length, 0);
  // Only libraries open at that minute contribute to the campus N/total — a closed library
  // (incl. one sitting in a mid-day gap, or absent-grid) drops out of both num and denom.
  const campusFreeAt = (t: number) =>
    LIBRARIES.reduce((s, _lib, i) => s + (isOpenAt(libHours[i], t) ? freeCount(libDays[i], t, capAt(i, t), want) : 0), 0);
  const campusOpenTotal = (t: number) =>
    LIBRARIES.reduce((s, lib, i) => s + (isOpenAt(libHours[i], t) ? lib.rooms.length : 0), 0);
  const whenLabel = live && isToday ? "now" : `at ${selTimeLabel}`;
  // Campus-wide "next open": the earliest minute ANY library has a bookable room, so the
  // map's time bar can jump straight out of a nothing-open dead end. null when the whole
  // campus is done for the day.
  const campusNextFree =
    libStats.map((s) => s.nextFree).filter((m): m is number => m != null).sort((a, b) => a - b)[0] ?? null;
  // Scrub to a specific minute (used by the "Next open" jumps); drops live mode.
  const jumpTo = (min: number) => onScrub(min);
  // Map axis spans the UNION of both libraries' hours (so Butler's 24h stretches it to a
  // full 00:00–24:00); the union also drives the map's closed-time greying (grey only where
  // BOTH are closed).
  const campusHours = mergeHours(libHours);
  const [mapAxisStart, mapAxisEnd] = axisBounds(campusHours);

  // Detail view: the active library's OPEN INTERVALS for this day (empty = closed all day),
  // repaired for today the same way as the map (see libHours).
  const detailHours = displayHours(
    snapshot?.days[dayKey]?.open ?? [],
    isToday,
    nowMin,
    typicalWindow(Object.values(snapshot?.days ?? {}).map((d) => d.open ?? [])),
  );
  const detailClosed = !isOpenAt(detailHours, selMin);
  const detailOpensMin = opensLaterToday(detailHours, selMin);
  // Booking cap = end of the interval covering selMin (can't book across a closed gap).
  const detailCloseMin = closeAfter(detailHours, selMin) || DAY_END;
  // Live open-count for the active library at selMin — shown in the detail header
  // (so the count isn't duplicated down in the time bar). Updates as you scrub.
  const detailFree = detailClosed ? 0 : freeCount(day, selMin, detailCloseMin, want);
  const detailOpensLabel = detailOpensMin != null ? fmtTime(detailOpensMin) : null;
  // Soonest bookable minute in the active library when nothing is open now → powers the
  // "Next open" jump on the detail time bar.
  const detailNextFree = detailFree === 0 ? nextFreeMinute(day, selMin, detailHours, want) : null;
  // Detail axis spans the active library's real hours — full 00:00–24:00 for 24h Butler,
  // the standard frame (with closed edges/gaps greyed) otherwise.
  const [detailAxisStart, detailAxisEnd] = axisBounds(detailHours);

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
                setShowKey(false);
                setView("detail");
              }}
              whenLabel={whenLabel}
              duration={{ value: durPref, onChange: setDurPref }}
              time={{
                dateKeys,
                dateIdx,
                onSelectDate,
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
                open: campusHours,
                axisStart: mapAxisStart,
                axisEnd: mapAxisEnd,
              }}
            />
          </div>
        </section>

        <section className={`${styles.screen} ${styles.detailScreen}`}>
          <div className={styles.dhead}>
            <button className={styles.back} onClick={() => { setShowKey(false); setView("map"); }} aria-label="Back">
              <svg viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <div className={styles.dtitle}>
              <div className={styles.dtitleRow}>
                <h2>{activeLibrary.name}</h2>
                <button
                  className={`${styles.keyBtn} ${showKey ? styles.keyBtnOn : ""}`}
                  onClick={() => setShowKey((v) => !v)}
                  aria-label="Room status key"
                  aria-expanded={showKey}
                >
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" /><path d="M12 11v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><circle cx="12" cy="7.5" r="1.2" fill="currentColor" /></svg>
                </button>
              </div>
              {!activeLoaded ? (
                <p className={styles.dcount}>Updating…</p>
              ) : detailClosed ? (
                <p className={styles.dclosed}>
                  {detailOpensLabel ? `Closed · opens ${detailOpensLabel.str}${detailOpensLabel.mer}` : "Closed"}
                </p>
              ) : (
                <p className={`${styles.dcount} ${detailFree === 0 ? styles.dcountNone : ""}`}><b>{detailFree}</b> of {activeLibrary.rooms.length} open</p>
              )}
              {showKey && (
                <>
                  {/* tap-away catcher so the key closes on any outside tap */}
                  <button className={styles.keyScrim} aria-hidden tabIndex={-1} onClick={() => setShowKey(false)} />
                  <div className={styles.keyPop}>
                    <StatusKey note={getFloorLayout(activeLibrary.slug).note} />
                  </div>
                </>
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
            {activeLoaded ? (
              <>
                <FloorPlan library={activeLibrary} day={day} selMin={selMin} closed={detailClosed} closeMin={detailCloseMin} want={want} onRoomClick={setActiveRoom} />
                <DateChips dateKeys={dateKeys} activeIdx={dateIdx} onSelect={onSelectDate} />
                <TimeBar day={day} total={activeLibrary.rooms.length} open={detailHours} selMin={selMin} onChange={onScrub} isToday={isToday} nowMin={nowMin} live={live} onNow={onNow} showNow={false} showCount={false} nextFree={detailNextFree} onJump={jumpTo} axisStart={detailAxisStart} axisEnd={detailAxisEnd} want={want} />
                <div style={{ height: 14 }} />
              </>
            ) : (
              <div className={styles.dloading}>Loading this library…</div>
            )}
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
          openHours={detailHours}
          opensMin={detailOpensMin}
          preferDur={preferDur}
          open={!!activeRoom}
          onClose={() => setActiveRoom(null)}
        />
      </div>
    </div>
  );
}
