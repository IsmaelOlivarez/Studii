"use client";
import { useEffect, useState } from "react";
import styles from "./RoomSheet.module.css";
import { DAY_END, DURATION_OPTIONS, MAX_DURATION } from "@/domain/constants";
import { busyAt, openUntil, nextOpen } from "@/lib/time/slots";
import { fmtTime } from "@/lib/time/date";
import { libcalDeepLink } from "./deeplink";
import { DAY_START } from "@/domain/constants";
import type { BusyRange, Room } from "@/domain/types";

function durLabel(min: number) {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const r = min % 60;
  return `${h}${r === 30 ? "½" : ""}h`;
}

export function RoomSheet({
  room,
  busy,
  selMin,
  date,
  dateLabel,
  open,
  onClose,
}: {
  room: Room | null;
  busy: BusyRange[];
  selMin: number;
  date: string;
  dateLabel: string;
  open: boolean;
  onClose: () => void;
}) {
  const [selDur, setSelDur] = useState(120);
  const [reserved, setReserved] = useState(false);

  useEffect(() => {
    setReserved(false);
    setSelDur(120);
  }, [room?.id]);

  const busyNow = room ? busyAt(busy, selMin) : false;
  const until = room ? openUntil(busy, selMin) : DAY_END;
  const freeWin = until - selMin;
  const maxDur = Math.min(MAX_DURATION, freeWin);
  let dur = Math.min(selDur, Math.floor(maxDur / 30) * 30);
  if (dur < 30) dur = maxDur >= 30 ? Math.floor(maxDur / 30) * 30 : 0;
  const endMin = selMin + (dur || 0);
  const limited = !busyNow && freeWin <= 30;
  const f = fmtTime(selMin);
  const e = fmtTime(endMin);

  const statusCls = busyNow ? "full" : limited ? "limited" : "free";
  const statusTxt = busyNow ? "Booked" : limited ? "Opens soon" : "Open";

  let msg = "";
  if (room) {
    if (busyNow) {
      const no = nextOpen(busy, selMin);
      msg = no !== null ? `Frees up at <b>${fmtTime(no).str} ${fmtTime(no).mer}</b>.` : "Booked for the rest of the day.";
    } else {
      msg = until < DAY_END
        ? `Open now — stays free until <b>${fmtTime(until).str} ${fmtTime(until).mer}</b>.`
        : "Open now — <b>free all evening.</b>";
    }
  }

  const onReserve = () => {
    if (!room || busyNow || maxDur < 30) return;
    window.open(libcalDeepLink("butler", room.id, date), "_blank", "noopener");
    setReserved(true);
    setTimeout(() => {
      onClose();
      setTimeout(() => setReserved(false), 500);
    }, 1300);
  };

  const blocks = [];
  for (let t = DAY_START; t < DAY_END; t += 30) {
    const bk = room ? busyAt(busy, t) : false;
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
                <div className={styles.cap}>Seats {room.cap} · Butler Fl 4</div>
              </div>
              <div className={`${styles.pill} ${styles[statusCls]}`}>{statusTxt}</div>
            </div>
            <div className={styles.atline} dangerouslySetInnerHTML={{ __html: `Status at <b>${f.str} ${f.mer}</b>, ${dateLabel}` }} />
            <div className={styles.daystrip}>{blocks}</div>
            <div className={styles.striplbl}><span>8a</span><span>2p</span><span>8p</span><span>12a</span></div>
            <div className={styles.nextfree} dangerouslySetInnerHTML={{ __html: msg }} />

            {!busyNow && maxDur >= 30 && (
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
              disabled={busyNow || maxDur < 30 || reserved}
              onClick={onReserve}
            >
              {busyNow
                ? "Booked at this time"
                : reserved
                  ? "Opening Butler booking…"
                  : maxDur < 30
                    ? `Books in ${maxDur} min — too soon`
                    : `Reserve · ${f.str}–${e.str} ${e.mer}`}
            </button>
            <div className={styles.fineprint}>
              Opens Butler&apos;s booking page for this room &amp; date — log in with your UNI to confirm
            </div>
          </>
        )}
      </div>
    </>
  );
}
