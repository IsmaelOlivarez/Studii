"use client";
import { useEffect, useRef, useState } from "react";
import styles from "./RoomSheet.module.css";
import { DAY_END, DURATION_OPTIONS, MAX_DURATION, MIN_DURATION } from "@/domain/constants";
import { busyAt, openUntil, nextOpen } from "@/lib/time/slots";
import { fmtTime } from "@/lib/time/date";
import { libcalDeepLink } from "./deeplink";
import { DAY_START } from "@/domain/constants";
import type { BusyRange, Library, Room } from "@/domain/types";

// Users who tick "don't show again" skip the pre-booking notice from then on
// (per device; cleared by clearing site data).
const SKIP_NOTE_KEY = "studii.skipBookingNote";
const NOTE_SECONDS = 3; // auto-proceed countdown

function durLabel(min: number) {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const r = min % 60;
  return `${h}${r === 30 ? "½" : ""}h`;
}

export function RoomSheet({
  library,
  room,
  busy,
  selMin,
  date,
  dateLabel,
  closed = false,
  closeMin = DAY_END,
  openMin = DAY_START,
  opensMin = null,
  open,
  onClose,
}: {
  library: Library;
  room: Room | null;
  busy: BusyRange[];
  selMin: number;
  date: string;
  dateLabel: string;
  closed?: boolean; // library closed at selMin (incl. absent-grid days) → not bookable
  closeMin?: number; // library's close minute → caps the bookable window
  openMin?: number; // library's open minute → day-strip spans the real hours (24h Butler)
  opensMin?: number | null; // when it opens later that day, if applicable
  open: boolean;
  onClose: () => void;
}) {
  const [selDur, setSelDur] = useState(120);
  const [reserved, setReserved] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [dontShow, setDontShow] = useState(false);
  const [count, setCount] = useState(NOTE_SECONDS);

  useEffect(() => {
    setReserved(false);
    setSelDur(120);
    setNoteOpen(false);
  }, [room?.id]);

  const busyNow = room ? busyAt(busy, selMin) : false;
  const until = room ? openUntil(busy, selMin, closeMin) : DAY_END;
  const freeWin = until - selMin;
  const maxDur = Math.min(MAX_DURATION, freeWin);
  let dur = Math.min(selDur, Math.floor(maxDur / 30) * 30);
  if (dur < 30) dur = maxDur >= 30 ? Math.floor(maxDur / 30) * 30 : 0;
  const endMin = selMin + (dur || 0);
  // Free now, but not enough runway to fit the 30-min minimum before the room fills
  // or the library closes → unavailable, same as booked.
  const tooSoon = !!room && !busyNow && maxDur < MIN_DURATION;
  // Is the close (not an imminent booking) what cuts the window short?
  const nextBooking = room ? openUntil(busy, selMin, DAY_END) : DAY_END;
  const closeLimited = tooSoon && nextBooking - selMin >= MIN_DURATION;
  const limited = !busyNow && !tooSoon && freeWin <= 30;
  const f = fmtTime(selMin);
  const e = fmtTime(endMin);

  const statusCls = closed ? "closed" : busyNow ? "full" : tooSoon ? "full" : limited ? "limited" : "free";
  const statusTxt = closed ? "Closed" : busyNow ? "Booked" : tooSoon ? "Unavailable" : limited ? "Ends soon" : "Open";

  let msg = "";
  if (room) {
    if (closed) {
      const o = opensMin != null ? fmtTime(opensMin) : null;
      msg = o
        ? `${library.shortName} is closed — opens at <b>${o.str} ${o.mer}</b>.`
        : `${library.shortName} is closed at this time.`;
    } else if (busyNow) {
      const no = nextOpen(busy, selMin);
      msg = no !== null ? `Frees up at <b>${fmtTime(no).str} ${fmtTime(no).mer}</b>.` : "Booked for the rest of the day.";
    } else if (tooSoon) {
      if (closeLimited && closeMin < DAY_END) {
        const c = fmtTime(closeMin);
        msg = `${library.shortName} closes at <b>${c.str} ${c.mer}</b> — not enough time to book 30 min.`;
      } else if (closeLimited) {
        msg = "Too late to book a 30-min block today.";
      } else {
        msg = `Only <b>${maxDur} min</b> free before the next booking — too short to reserve.`;
      }
    } else {
      msg = until < DAY_END
        ? `Open now — stays free until <b>${fmtTime(until).str} ${fmtTime(until).mer}</b>.`
        : "Open now — <b>free all evening.</b>";
    }
  }

  // Hand off to LibCal. `newTab` opens a new tab (keeps Studii open) for explicit
  // clicks; the 3s auto-proceed navigates the SAME tab instead, because a timer-fired
  // window.open() (no user gesture) gets popup-blocked.
  const go = (newTab: boolean) => {
    if (!room) return;
    const url = libcalDeepLink(library.slug, room.id, date, selMin);
    if (newTab) window.open(url, "_blank", "noopener");
    else window.location.assign(url);
    if (!newTab) return; // page is navigating away; skip the close animation
    setNoteOpen(false);
    setReserved(true);
    setTimeout(() => {
      onClose();
      setTimeout(() => setReserved(false), 500);
    }, 1300);
  };

  // Keep the latest `go` for the countdown timer without re-arming it each render.
  const autoRef = useRef(() => {});
  useEffect(() => {
    autoRef.current = () => go(false);
  });

  useEffect(() => {
    if (!noteOpen) return;
    const iv = setInterval(() => setCount((c) => Math.max(c - 1, 0)), 1000);
    const to = setTimeout(() => autoRef.current(), NOTE_SECONDS * 1000);
    return () => {
      clearInterval(iv);
      clearTimeout(to);
    };
  }, [noteOpen]);

  const onReserve = () => {
    if (!room || closed || busyNow || maxDur < 30) return;
    let skip = false;
    try {
      skip = localStorage.getItem(SKIP_NOTE_KEY) === "1";
    } catch {}
    if (skip) {
      go(true); // straight through (still a user gesture → new tab)
      return;
    }
    setDontShow(false);
    setCount(NOTE_SECONDS);
    setNoteOpen(true);
  };

  const toggleDontShow = () => {
    setDontShow((prev) => {
      const next = !prev;
      try {
        if (next) localStorage.setItem(SKIP_NOTE_KEY, "1");
        else localStorage.removeItem(SKIP_NOTE_KEY);
      } catch {}
      return next;
    });
  };

  const blockCount = Math.max(1, Math.round((dur || 30) / 30));

  // The strip spans the library's real hours: it never shrinks below 8a–midnight, and
  // extends to a full 00:00–24:00 for a 24-hour library (Butler). Hours outside the open
  // window (before it opens / after it closes) render booked-style.
  const stripStart = Math.min(DAY_START, openMin);
  const stripEnd = Math.max(DAY_END, closeMin);
  const stripSpan = stripEnd - stripStart;
  const hrLbl = (min: number) => {
    const h = Math.round(min / 60) % 24;
    const mer = h < 12 ? "a" : "p";
    return `${h % 12 === 0 ? 12 : h % 12}${mer}`;
  };
  const stripMarks = [0, 1, 2, 3].map((k) => hrLbl(stripStart + (stripSpan * k) / 3));

  const blocks = [];
  for (let t = stripStart; t < stripEnd; t += 30) {
    const outside = t < openMin || (closeMin < stripEnd && t >= closeMin); // outside hours
    const bk = room ? busyAt(busy, t) || outside : false;
    const inPlan = !busyNow && dur > 0 && t >= selMin && t < endMin;
    const isCur = selMin >= t && selMin < t + 30;
    blocks.push(
      <div key={t} className={`${styles.blk} ${bk ? styles.bk : styles.op} ${inPlan ? styles.plan : isCur ? styles.cur : ""}`} />,
    );
  }

  return (
    <>
      <div className={`${styles.scrim} ${open ? styles.scrimOpen : ""}`} onClick={onClose} />
      <div className={`${styles.sheet} ${open ? styles.sheetOpen : ""}`}>
        <div className={styles.grip} />
        {room && (
          <>
            <div className={styles.shTop}>
              <div>
                <h2>Room {room.id}</h2>
                <div className={styles.cap}>Seats {room.cap} · {library.shortName}</div>
              </div>
              <div className={`${styles.pill} ${styles[statusCls]}`}>{statusTxt}</div>
            </div>
            <div className={styles.atline} dangerouslySetInnerHTML={{ __html: `Status at <b>${f.str} ${f.mer}</b>, ${dateLabel}` }} />
            <div className={styles.daystrip}>{blocks}</div>
            <div className={styles.striplbl}>{stripMarks.map((m, i) => <span key={i}>{m}</span>)}</div>
            <div className={styles.nextfree} dangerouslySetInnerHTML={{ __html: msg }} />

            {!closed && !busyNow && maxDur >= 30 && (
              <div className={styles.durwrap}>
                <div className={styles.durlbl}>How long? <span>max 2 hrs</span></div>
                <div className={styles.durrow}>
                  {DURATION_OPTIONS.map((opt) => {
                    const ok = opt <= maxDur;
                    return (
                      <button
                        key={opt}
                        disabled={!ok}
                        className={`${styles.durchip} ${opt === dur ? styles.durOn : ""}`}
                        onClick={() => ok && setSelDur(opt)}
                      >
                        {durLabel(opt)}
                        <small>{opt} min</small>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <button
              className={`${styles.reserve} ${reserved ? styles.done : ""}`}
              disabled={closed || busyNow || maxDur < 30 || reserved}
              onClick={onReserve}
            >
              {closed
                ? "Closed at this time"
                : busyNow
                  ? "Booked at this time"
                  : reserved
                    ? `Opening ${library.shortName} booking…`
                    : maxDur < 30
                      ? closeLimited && closeMin < DAY_END
                        ? "Closes too soon to book"
                        : "Not enough time to book"
                      : `Reserve · ${f.str}–${e.str} ${e.mer}`}
            </button>
            {!closed && (
              <div className={styles.fineprint}>
                Opens {library.shortName}&apos;s booking page with this room, date &amp; start time
                pre-selected — set your length, log in with your UNI to confirm
              </div>
            )}
          </>
        )}
      </div>

      {/* Pre-redirect notice: LibCal books in 30-min blocks, so the deep link can only
          pre-select the START. This tells the user to extend to their chosen end. */}
      <div
        className={`${styles.noteScrim} ${noteOpen ? styles.noteOpen : ""}`}
        onClick={() => setNoteOpen(false)}
      >
        <div
          className={styles.noteCard}
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.stopPropagation()}
        >
          <div className={styles.noteEyebrow}>Before you book</div>
          <h3 className={styles.noteTitle}>{library.shortName} books in 30-min blocks</h3>
          <p className={styles.noteBody}>
            We&apos;ll open <b>Room {room?.id}</b> at <b>{f.str} {f.mer}</b>. For your{" "}
            <b>{durLabel(dur || 30)}</b>, select through to <b>{e.str} {e.mer}</b> ({blockCount}{" "}
            {blockCount === 1 ? "block" : "blocks"}), then sign in with your UNI to confirm.
          </p>
          <label className={styles.noteCheck}>
            <input type="checkbox" checked={dontShow} onChange={toggleDontShow} />
            <span>Don&apos;t show this again</span>
          </label>
          <button className={styles.noteBtn} onClick={() => go(true)}>
            Take me there <span className={styles.noteArrow}>→</span>
            <em className={styles.noteCount}>opens in {count}s</em>
          </button>
        </div>
      </div>
    </>
  );
}
