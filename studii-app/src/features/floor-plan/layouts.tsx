// Per-library floor-plan geometry. The floor plan is bespoke art per building, so
// each library gets its own layout: the non-bookable "shell" drawn behind the rooms,
// and how each bookable room tile is positioned.
//
//   - Butler: rectilinear plan traced from the real Floor-4 PDF. Room tiles are
//     hand-placed via per-room CSS classes (.r403A …).
//   - Uris: a stylized HALF-CIRCLE schematic echoing the real curved, two-level
//     reading room. The bookable rooms ring a central reading-room core on two
//     semicircular tiers — Ground (G 01–17) on the inner arc, Mezzanine (M 01–17)
//     on the outer arc above it. Positions are computed (polar), not hand-placed,
//     so they scale with the room list. Labeled as a schematic.

import type { ReactNode } from "react";
import type { Room } from "@/domain/types";
import styles from "./FloorPlan.module.css";

export interface FloorLayout {
  /** Extra class on the .floor container (shape/aspect per building). */
  floorClass: string;
  /** Non-bookable background elements (core, labels, corridors). */
  shell: ReactNode;
  /**
   * Placement for one room tile. `index`/`total` are scoped to the rooms currently
   * drawn — i.e. per floor when `tiers` is set, so each tier lays out independently.
   */
  roomProps: (room: Room, index: number, total: number) => {
    className?: string;
    style?: React.CSSProperties;
  };
  /** Dense plans hide the per-tile "N seats" line to stay legible. */
  compact?: boolean;
  /** Small muted note shown in the legend row (e.g. uniform capacity). */
  note?: string;
  /**
   * Multi-floor buildings: a tab per floor. The plan shows one floor at a time —
   * a room belongs to a tier when its id starts with that tier's `key`.
   */
  tiers?: { key: string; label: string }[];
}

const butler: FloorLayout = {
  floorClass: "",
  shell: (
    <>
      <div className={`${styles.nonb} ${styles.northc}`}>Milstein Reading Room 403</div>
      <div className={`${styles.nonb} ${styles.west}`}>PMRR 401</div>
      <div className={styles.core}><span>Stacks<br />Core</span></div>
      <div className={`${styles.nonb} ${styles.entry}`}>▽ Elevators · Entrance</div>
    </>
  ),
  roomProps: (room) => ({ className: styles[`r${room.id}`] }),
};

// Uris arc geometry (percentages of the floor container).
const URIS_ARC = { cx: 50, cy: 90, rx: 44, ry: 80, w: 11, h: 11 } as const;

// Spacing tiles by equal ANGLE on a tall ellipse bunches them at the apex (where the
// curve runs horizontally) and leaves gaps on the sides. Distributing by equal
// ARC-LENGTH instead makes the gaps uniform all the way around. We integrate the
// ellipse's arc length once per (n,rx,ry) and invert it to the angle for each tile.
const arcAngleCache = new Map<string, number[]>();
function equalArcAngles(n: number, rx: number, ry: number): number[] {
  const key = `${n}|${rx}|${ry}`;
  const hit = arcAngleCache.get(key);
  if (hit) return hit;
  const STEPS = 1000;
  const theta = Array.from({ length: STEPS + 1 }, (_, k) => (Math.PI * k) / STEPS); // 0 → π
  const cum = [0];
  for (let k = 1; k <= STEPS; k++) {
    const mid = (theta[k - 1] + theta[k]) / 2;
    const dl = Math.hypot(rx * Math.sin(mid), ry * Math.cos(mid)) * (theta[k] - theta[k - 1]);
    cum.push(cum[k - 1] + dl);
  }
  const totalLen = cum[STEPS];
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const target = (totalLen * i) / (n - 1);
    let k = 1;
    while (k < STEPS && cum[k] < target) k++;
    const f = (target - cum[k - 1]) / (cum[k] - cum[k - 1] || 1);
    out.push(theta[k - 1] + (theta[k] - theta[k - 1]) * f);
  }
  arcAngleCache.set(key, out);
  return out;
}

const uris: FloorLayout = {
  floorClass: styles.floorUris,
  compact: true,
  note: "schematic · all seat 6",
  tiers: [
    { key: "G", label: "Ground" },
    { key: "M", label: "Mezzanine" },
  ],
  shell: (
    <div className={styles.coreUris}>
      <span>Reading<br />Room</span>
    </div>
  ),
  roomProps: (_room, index, total) => {
    // The floor's rooms wrap the reading room on a single arc, evenly spaced by
    // arc length, numbers running left → right.
    const { cx, cy, rx, ry, w, h } = URIS_ARC;
    const angles = equalArcAngles(total, rx, ry); // θ 0 (right) → π (left)
    const theta = angles[total - 1 - index]; // index 0 (G01) at the left
    const left = cx + rx * Math.cos(theta) - w / 2;
    const top = cy - ry * Math.sin(theta) - h / 2;
    return { style: { left: `${left}%`, top: `${top}%`, width: `${w}%`, height: `${h}%` } };
  },
};

const LAYOUTS: Record<string, FloorLayout> = { butler, uris };

export const getFloorLayout = (slug: string): FloorLayout => LAYOUTS[slug] ?? butler;
