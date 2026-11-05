import { Fragment } from "react";
import styles from "./CampusMap.module.css";
import { DateChips } from "@/features/availability/DateChips";
import { TimeBar } from "@/features/availability/TimeBar";
import type { OpenHours } from "@/lib/time/hours";
import type { Library } from "@/domain/types";

/** One library's headline for the map: how many of its rooms are free at the time. */
export interface LibStat {
  library: Library;
  free: number;
  total: number;
  closed: boolean; // library is closed at the selected time (incl. absent-grid days)
  opensLabel: string | null; // e.g. "9:00am" if it opens later that day, else null
  nextFree: number | null; // soonest minute a room frees up when 0 open now (else null)
  nextFreeLabel: string | null; // formatted nextFree, e.g. "6:00pm"
}

/** Shared date/time controls for the map (drive every library's ring at once). */
export interface MapTimeControls {
  dateKeys: string[];
  dateIdx: number;
  onSelectDate: (i: number) => void;
  selMin: number;
  onScrub: (min: number) => void;
  nowMin: number;
  live: boolean;
  onNow: () => void;
  freeAt: (min: number) => number; // total free across all libraries at a minute
  total: number; // total rooms across all libraries
  totalAt: (min: number) => number; // rooms in libraries OPEN at a minute (closed drop out)
  nextFree: number | null; // earliest minute ANY library has a bookable room (0 open now)
  onJump: (min: number) => void; // scrub to a minute (used by the "Next open" jump)
  open: OpenHours; // union of both libraries' open intervals → greys only all-closed time
  axisStart: number; // visible axis bounds (extended to a full day when any lib is 24h)
  axisEnd: number;
}

// Status is RELATIVE to the building's room count so it reads the same whether a
// library has 6 rooms (Butler) or 17 (Uris).
function statusOf(free: number, total: number): { cls: string; color: string; word: string } {
  const r = total ? free / total : 0;
  const cls = free === 0 || r <= 0.15 ? "full" : r <= 0.4 ? "limited" : "free";
  const word =
    free === 0 ? "Fully booked" : r <= 0.15 ? "Nearly full" : r <= 0.4 ? "Filling up" : "Plenty open";
  return { cls, color: `var(--${cls})`, word };
}

// Hand-placed positions for each clickable library on the bespoke Morningside map.
// Butler is the hero at the bottom; Uris sits on the north spine (its real-ish
// location) with a dome motif echoing its round reading room; NoCo (Science & Eng /
// Northwest Corner Building) is the hero in the top-left corner — its real spot on
// campus — with a glass-tower motif echoing the modern NWC building.
const PLACEMENT: Record<
  string,
  { hero: React.CSSProperties; ring: React.CSSProperties; motif: "pillars" | "dome" | "tower"; tall?: boolean }
> = {
  butler: {
    hero: { left: "28%", top: "85%", width: "44%", height: "14%" },
    ring: { left: "50%", top: "85.5%" },
    motif: "pillars",
  },
  uris: {
    hero: { left: "34%", top: "24%", width: "32%", height: "13%" },
    ring: { left: "50%", top: "24.5%" },
    motif: "dome",
  },
  // NoCo is the Northwest Corner Building — a tall, narrow tower at the far top-left
  // corner of campus. So the hero is a thin VERTICAL slab (not a wide card), with its
  // short name running up the tower and the count ring capping the top as a live beacon.
  "science-eng": {
    hero: { left: "2.5%", top: "3.5%", width: "11.5%", height: "33%" },
    ring: { left: "8.25%", top: "7%" },
    motif: "tower",
    tall: true,
  },
};

// Decorative campus buildings at their REAL Morningside positions, traced from Columbia's
// own campus map (top = W 120th St, bottom = W 114th; College Walk / 116th splits the
// block ~63% down — the north half is 4 blocks to the south's 2). These are quiet scenery
// (labels are transparent; see .cb) so the central mall — Low → College Walk → South Field
// → Butler — and the three live library heroes carry the meaning. v = vertical footprint,
// lt = lighter stone (used for the slab-like edge/plaza buildings).
type Scenery = { l: number; t: number; w: number; h: number; v?: boolean; lt?: boolean; name: string };
const SCENERY: Scenery[] = [
  // ── NORTH, west edge (Broadway side), N→S — the NoCo tower owns the top-left corner,
  //    so this Broadway column resumes BELOW it (down to College Walk). ──
  { l: 1.5, t: 38, w: 9, h: 6, name: "Chandler" },
  { l: 1.5, t: 45, w: 10, h: 7, name: "Havemeyer" },
  { l: 1.5, t: 53, w: 7, h: 9, v: true, lt: true, name: "Mathematics" },
  { l: 9.5, t: 53, w: 6, h: 9, v: true, lt: true, name: "Lewisohn" },
  { l: 18, t: 58, w: 14, h: 5, name: "Dodge" },
  // ── NORTH, top row along 120th St ──
  { l: 15, t: 2, w: 15, h: 7, name: "Pupin" },
  { l: 15, t: 10.5, w: 20, h: 8, lt: true, name: "Dodge Fitness" },
  { l: 40, t: 2, w: 16, h: 8, name: "Schapiro" },
  { l: 60, t: 2, w: 15, h: 7, name: "Mudd" },
  { l: 82, t: 8, w: 11.5, h: 8, name: "Computer Science" },
  // ── NORTH, center (University Hall over Uris; Low octagon drawn separately) ──
  { l: 41, t: 16, w: 18, h: 7, lt: true, name: "University Hall" },
  { l: 32, t: 28, w: 7, h: 10, v: true, name: "Computer Center" },
  { l: 29, t: 48, w: 10, h: 7, name: "Earl" },
  // ── NORTH, east side ──
  { l: 68, t: 11, w: 7, h: 12, v: true, name: "Fairchild" },
  { l: 87, t: 19, w: 6, h: 11, v: true, lt: true, name: "Schermerhorn Ext" },
  { l: 75, t: 31, w: 16, h: 8, name: "Schermerhorn" },
  { l: 68, t: 43, w: 9, h: 8, name: "Avery" },
  { l: 88, t: 42, w: 6, h: 11, v: true, name: "Fayerweather" },
  { l: 76, t: 53, w: 10, h: 8, name: "St Paul's Chapel" },
  { l: 90, t: 52, w: 6, h: 11, v: true, lt: true, name: "Philosophy" },
  { l: 70, t: 59, w: 8, h: 5, name: "Buell" },
  { l: 79, t: 60, w: 15, h: 5, name: "Kent" },
  // ── SOUTH, west column ──
  { l: 12, t: 68, w: 16, h: 8, name: "Pulitzer" },
  { l: 12, t: 78, w: 7, h: 13, v: true, lt: true, name: "Furnald" },
  { l: 1.5, t: 86, w: 18, h: 6, name: "Lerner Hall" },
  { l: 1.5, t: 93, w: 18, h: 6, name: "Carman" },
  // ── SOUTH, east column ──
  { l: 73, t: 67.5, w: 16, h: 7, name: "Hamilton" },
  { l: 89, t: 75, w: 6, h: 11, v: true, lt: true, name: "Hartley" },
  { l: 89, t: 87, w: 6, h: 11, v: true, lt: true, name: "Wallach" },
  { l: 72, t: 88, w: 18, h: 10, name: "John Jay" },
];

export function CampusMap({
  libs,
  onEnter,
  whenLabel,
  time,
}: {
  libs: LibStat[];
  onEnter: (library: Library) => void;
  whenLabel: string;
  time: MapTimeControls;
}) {
  const B = styles; // shorthand

  return (
    <>
      <div className={`${B.brand} anim d1`}>
        <h1>Stud<i>ii</i></h1>
        <div className={B.loc}>Morningside</div>
      </div>

      {/* Shared date + time controls — scrub to see every library at that moment. */}
      <div className={`${B.maptime} anim d2`}>
        <DateChips dateKeys={time.dateKeys} activeIdx={time.dateIdx} onSelect={time.onSelectDate} compact />
        <TimeBar
          compact
          freeAt={time.freeAt}
          total={time.total}
          totalAt={time.totalAt}
          selMin={time.selMin}
          onChange={time.onScrub}
          isToday={time.dateIdx === 0}
          nowMin={time.nowMin}
          live={time.live}
          onNow={time.onNow}
          nextFree={time.nextFree}
          onJump={time.onJump}
          open={time.open}
          axisStart={time.axisStart}
          axisEnd={time.axisEnd}
        />
      </div>

      <div className={`${B.mapWrap} anim d3`}>
        {/* The central MALL — Columbia's signature axis. Low's plaza (north) flows down
            the Low Steps, across College Walk, into the South Field lawns, with Butler
            anchoring the south end facing Low. Everything else frames this spine. */}
        <div className={B.mallLow} />
        <div className={B.lowSteps} />
        <div className={B.walk}><span>College Walk</span></div>
        <div className={B.southField} />

        {/* Decorative buildings at their real positions (hushed scenery). */}
        {SCENERY.map((b) => (
          <div
            key={b.name}
            className={`${B.cb} ${b.v ? B.v : ""} ${b.lt ? B.lt : ""}`}
            style={{ left: `${b.l}%`, top: `${b.t}%`, width: `${b.w}%`, height: `${b.h}%` }}
          >
            {b.name}
          </div>
        ))}

        {/* Low Memorial Library — the domed octagon on its steps, dead center-north.
            The landmark that makes the map read as Columbia (decorative, not a hero). */}
        <div className={B.low} style={{ left: "39%", top: "42%", width: "22%", height: "15%" }}>
          <div className={B.lowDome} />
        </div>

        {/* Live library heroes (Butler + Uris + NoCo): each with its own availability ring. */}
        {libs.map(({ library, free, total, closed }) => {
          const place = PLACEMENT[library.slug];
          if (!place) return null;
          const color = closed ? "var(--ink-faint)" : statusOf(free, total).color;
          return (
            <Fragment key={library.slug}>
              {/* The count ring is now a tap target too (not just the hero card). */}
              <button
                className={`${B.ring} ${closed ? B.ringClosed : ""}`}
                style={{
                  "--ring-color": color,
                  left: place.ring.left,
                  top: place.ring.top,
                  boxShadow: `0 8px 18px -6px rgba(var(--shadow),.5), 0 0 0 3px ${color}`,
                } as React.CSSProperties}
                onClick={() => onEnter(library)}
                aria-label={`Open ${library.name} — ${closed ? "closed" : `${free} of ${total} open`}`}
              >
                <span className={B.cnt} style={{ color }}>{closed ? "✕" : free}</span>
              </button>
              <button
                className={`${B.hero} ${B[library.slug]}`}
                style={place.hero}
                onClick={() => onEnter(library)}
                aria-label={`Open ${library.name}`}
              >
                {place.tall ? (
                  // Tall tower (NoCo): the glass-facade slab carries its short name
                  // running up the tower; the pulsing ring that caps it is the live cue.
                  <span className={B.nmV}>{library.shortName}</span>
                ) : (
                  <>
                    {/* Marks this as one of the few LIVE, tappable buildings among the
                        decorative campus — the rest are static scenery. */}
                    <span className={B.live}><i />Live</span>
                    {place.motif === "pillars" ? (
                      <div className={B.pillars}><i /><i /><i /><i /><i /><i /></div>
                    ) : place.motif === "dome" ? (
                      <div className={B.dome} />
                    ) : (
                      <div className={B.tower}><i /><i /><i /></div>
                    )}
                    {/* A long name ("Science & Engineering Library") won't fit the small
                        tile, so a library shows its short name when the full one is long. */}
                    <div className={B.nm}>{library.name.length > 16 ? library.shortName : library.name}</div>
                  </>
                )}
              </button>
            </Fragment>
          );
        })}
      </div>

      {/* One tappable summary card per live library. */}
      <div className={`${B.cards} anim d4`}>
        {libs.map(({ library, free, total, closed, opensLabel, nextFreeLabel }) => {
          const { cls, color, word } = statusOf(free, total);
          const statusColor = closed ? "var(--ink-soft)" : color;
          // When nothing's bookable now, lead with the answer to "so when CAN I?" — the
          // soonest a room opens up. Closed libraries already say when they reopen.
          const tail = closed
            ? `Closed${opensLabel ? ` · opens ${opensLabel}` : ""}`
            : free === 0
              ? nextFreeLabel
                ? `Full ${whenLabel} · next free ${nextFreeLabel}`
                : `Fully booked ${whenLabel}`
              : `${word} ${whenLabel}`;
          return (
            <button key={library.slug} className={B.sumcard} onClick={() => onEnter(library)}>
              <div className={B.stat} style={{ background: closed ? "var(--paper-2)" : `var(--${cls}-soft)` }}>
                <b style={{ color: statusColor }}>{closed ? "✕" : free}</b><em>OF {total}</em>
              </div>
              <div className={B.meta}>
                <h3>{library.name}</h3>
                <p>
                  <span style={{ color: statusColor, fontWeight: 700 }}>{tail}</span>
                </p>
              </div>
              <div className={B.arrow}>
                <svg viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}
