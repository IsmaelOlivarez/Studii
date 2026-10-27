import styles from "./FloorPlan.module.css";
import { statusAt } from "@/lib/time/slots";
import type { Room, RoomAvailability } from "@/domain/types";

export function FloorPlan({
  rooms,
  day,
  selMin,
  selTimeLabel,
  onRoomClick,
}: {
  rooms: Room[];
  day: RoomAvailability[];
  selMin: number;
  selTimeLabel: string;
  onRoomClick: (id: string) => void;
}) {
  const busyOf = (id: string) => day.find((r) => r.roomId === id)?.busy ?? [];

  return (
    <>
      <div className={styles.floorhead}>
        <h3>Floor plan</h3>
        <span>at {selTimeLabel}</span>
      </div>
      <div className={styles.legend}>
        <i><b style={{ background: "var(--free)" }} />Open</i>
        <i><b style={{ background: "var(--limited)" }} />Opening soon</i>
        <i><b style={{ background: "var(--full)" }} />Booked</i>
      </div>

      <div className={styles.floor}>
        <div className={`${styles.nonb} ${styles.northc}`}>Milstein Reading Room 403</div>
        <div className={`${styles.nonb} ${styles.west}`}>PMRR 401</div>
        <div className={styles.core}><span>Stacks<br />Core</span></div>
        <div className={`${styles.nonb} ${styles.entry}`}>▽ Elevators · Entrance</div>

        {rooms.map((r) => {
          const st = statusAt(busyOf(r.id), selMin); // "free" | "limited" | "full"
          return (
            <button
              key={r.id}
              className={`${styles.room} ${styles[st]} ${styles[`r${r.id}`]}`}
              onClick={() => onRoomClick(r.id)}
            >
              <span className={styles.rd} />
              <span className={styles.rn}>{r.id}</span>
              <span className={styles.rc}>{r.cap} seats</span>
            </button>
          );
        })}
      </div>
    </>
  );
}
