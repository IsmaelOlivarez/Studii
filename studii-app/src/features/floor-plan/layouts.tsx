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

// Science & Engineering (NoCo / Northwest Corner Building): the smallest plan — just
// two group rooms (605, 606) on Floor 6. A clean two-tile layout, side by side along the
// building's glass wall, over an open study commons. Hand-placed (only two rooms, so no
// need to compute). Both seat 8 → noted in the legend rather than per-tile.
const scienceEng: FloorLayout = {
  floorClass: "",
  note: "floor 6 · both seat 8",
  shell: (
    <>
      <div className={`${styles.nonb} ${styles.sciGlass}`}>Broadway Glass Wall</div>
      <div className={`${styles.nonb} ${styles.sciCommons}`}>Open Study Commons</div>
      <div className={`${styles.nonb} ${styles.entry}`}>▽ Elevators · Floor 6</div>
    </>
  ),
  roomProps: (_room, index) => ({
    style: {
      left: index === 0 ? "9%" : "54%",
      top: "17%",
      width: "37%",
      height: "40%",
    },
  }),
};

// Lehman Social Sciences Library (International Affairs Building, Floor 3) — like NoCo,
// just two group rooms (327.1, 327.2), so a clean two-tile layout: the two rooms side by
// side off the reading room, over the social-sciences stacks. Both seat 8 → noted in the
// legend, not per-tile.
const lehman: FloorLayout = {
  floorClass: "",
  note: "floor 3 · both seat 8",
  shell: (
    <>
      <div className={`${styles.nonb}`} style={{ left: "9%", top: "12px", width: "82%", height: "9%" }}>Reading Room</div>
      <div className={`${styles.nonb} ${styles.sciCommons}`}>Social Sciences Stacks</div>
      <div className={`${styles.nonb} ${styles.entry}`}>▽ Elevators · Floor 3</div>
    </>
  ),
  roomProps: (_room, index) => ({
    style: {
      left: index === 0 ? "9%" : "54%",
      top: "26%",
      width: "37%",
      height: "32%",
    },
  }),
};

// Barnard Library (Milstein Center) — nine group rooms spread over THREE floors, so,
// like Uris, it uses `tiers`: one tab per floor, keyed off the room id's leading digit
// (1xx/2xx/3xx). Each floor shows a different count (2 / 2 / 5), so the tiles aren't
// hand-placed — they flow into a centered grid (≤3 per row) that adapts to the floor's
// room count. The shell is a glassy Broadway-side header over the floor's study commons.
const MLC_GRID = { marginX: 9, gapX: 5, cols: 3, top: 27, bottom: 60, gapY: 6 } as const;
const milstein: FloorLayout = {
  floorClass: "",
  note: "milstein center · floors 1–3",
  tiers: [
    { key: "1", label: "Floor 1" },
    { key: "2", label: "Floor 2" },
    { key: "3", label: "Floor 3" },
  ],
  shell: (
    <>
      <div className={`${styles.nonb} ${styles.sciGlass}`}>Milstein · Teaching &amp; Learning</div>
      <div className={`${styles.nonb} ${styles.sciCommons}`}>Study Commons</div>
      <div className={`${styles.nonb} ${styles.entry}`}>▽ Elevators · Milstein Center</div>
    </>
  ),
  roomProps: (_room, index, total) => {
    const { marginX, gapX, cols, top, bottom, gapY } = MLC_GRID;
    const perRow = Math.min(cols, total); // columns actually used this floor
    const rows = Math.ceil(total / perRow);
    const row = Math.floor(index / perRow);
    const col = index % perRow;
    const inThisRow = Math.min(perRow, total - row * perRow); // last row may be short → center it
    const tileW = (100 - 2 * marginX - gapX * (perRow - 1)) / perRow;
    const rowW = inThisRow * tileW + (inThisRow - 1) * gapX;
    const left = (100 - rowW) / 2 + col * (tileW + gapX);
    const tileH = (bottom - top - gapY * (rows - 1)) / rows;
    const topPct = top + row * (tileH + gapY);
    return {
      style: { left: `${left}%`, top: `${topPct}%`, width: `${tileW}%`, height: `${tileH}%` },
    };
  },
};

const LAYOUTS: Record<string, FloorLayout> = { butler, uris, "science-eng": scienceEng, lehman, milstein };

export const getFloorLayout = (slug: string): FloorLayout => LAYOUTS[slug] ?? butler;
