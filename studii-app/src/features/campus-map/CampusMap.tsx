"use client";

import { Fragment, useRef, useState } from "react";
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
  { hero: React.CSSProperties; ring: React.CSSProperties; motif: "pillars" | "dome" | "tower" | "book"; tall?: boolean }
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
  // NoCo (Northwest Corner Building): a thin VERTICAL slab in the top-left corner, kept
  // SHORT (not a full-height tower). Its short name is stacked upright down the slab and
  // the count ring caps the top as a live beacon.
  "science-eng": {
    hero: { left: "2.5%", top: "3%", width: "12%", height: "22%" },
    ring: { left: "17.5%", top: "14%" }, // just right of the slab, vertically centered
    motif: "tower",
    tall: true,
  },
};

// The swipeable campuses, left → right. Morningside (the live map) sits in the middle
// so the app launches on it; Barnard and East Campus are scenery-only shells for now —
// real-ish silhouettes marking where future libraries will live.
const CAMPUSES = ["barnard", "morningside", "east-campus"] as const;
const CAMPUS_LABEL: Record<(typeof CAMPUSES)[number], string> = {
  barnard: "Barnard",
  morningside: "Morningside",
  "east-campus": "East Campus",
};
const START_IDX = 1; // launch centered on Morningside

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

  // Which campus is on screen. Swipe (touch), the edge arrows, or the dots move it;
  // clamped to the ends — no wrap — so the arrows can hide at Barnard / East Campus.
  const [idx, setIdx] = useState(START_IDX);
  const go = (next: number) => setIdx(Math.max(0, Math.min(CAMPUSES.length - 1, next)));
  const startX = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (startX.current == null) return;
    const dx = e.changedTouches[0].clientX - startX.current;
    const TH = 45; // px before a drag counts as a swipe
    if (dx <= -TH) go(idx + 1);
    else if (dx >= TH) go(idx - 1);
    startX.current = null;
  };
  const shift = { transform: `translateX(${-idx * 100}%)` }; // both tracks move together

  // Each library declares which campus it lives on; a map only draws its own campus's
  // live heroes (so Morningside's rings stay on Morningside, Lehman's on East Campus).
  const libsByCampus = (c: (typeof CAMPUSES)[number]) =>
    libs.filter((l) => l.library.campus === c);

  // Live library heroes for one campus: a tappable count ring + a hero tile with its
  // motif, overlaid on that campus's scenery. Reused by every map that has live
  // libraries (Morningside; East Campus once Lehman lands) — a campus with no PLACEMENT
  // entry for a lib simply draws nothing.
  const renderHeroes = (campusLibs: LibStat[]) =>
    campusLibs.map(({ library, free, total, closed }) => {
      const place = PLACEMENT[library.slug];
      if (!place) return null;
      const color = closed ? "var(--ink-faint)" : statusOf(free, total).color;
      return (
        <Fragment key={library.slug}>
          {/* The count ring is a tap target too (not just the hero card). */}
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
              // A thin vertical slab (NoCo): the short name stacked UPRIGHT, each letter
              // facing the viewer; the pulsing ring that caps it is the live cue.
              <span className={B.nmV}>
                {library.shortName.split("").map((ch, i) => (
                  <span key={i}>{ch}</span>
                ))}
              </span>
            ) : (
              <>
                {/* Marks this as one of the few LIVE, tappable buildings among the
                    decorative campus — the rest are static scenery. */}
                <span className={B.live}><i />Live</span>
                {place.motif === "pillars" ? (
                  <div className={B.pillars}><i /><i /><i /><i /><i /><i /></div>
                ) : place.motif === "dome" ? (
                  <div className={B.dome} />
                ) : place.motif === "book" ? (
                  <div className={B.book}><i /><i /><i /></div>
                ) : (
                  <div className={B.tower}><i /><i /><i /></div>
                )}
                {/* A long name won't fit the small tile, so a library shows its short
                    name when the full one is long. */}
                <div className={B.nm}>{library.name.length > 16 ? library.shortName : library.name}</div>
              </>
            )}
          </button>
        </Fragment>
      );
    });

  // ── The three map scenes (Barnard · Morningside · East Campus) ──────────────
  // Barnard: the real campus is a NARROW north–south block framed by Claremont Ave
  // (west) and Broadway (east, the Main Gate), running 120th St → 116th St. Milbank
  // spans the north, the angular Diana Center sits upper-east, Milstein holds the
  // center with Futter Field — the signature lawn — on the Broadway side, Barnard Hall
  // below, then the Arthur Ross Courtyard and the southern residence cluster. Scenery only.
  const barnardMap = (
    <div className={B.mapWrap}>
      {/* The two avenues that pinch the campus into its narrow strip. */}
      <div className={`${B.ave} ${B.aveL}`}><span>Claremont Ave</span></div>
      <div className={`${B.ave} ${B.aveR}`}><span>Broadway</span></div>

      {/* Signature green spaces: Futter Field (east/mid) + Arthur Ross Courtyard (south). */}
      <div className={B.zone} style={{ left: "52%", top: "24%", width: "33%", height: "28%", borderRadius: "7px" }} />
      <div className={B.zone} style={{ left: "31%", top: "71%", width: "20%", height: "8%", borderRadius: "6px" }} />

      {/* NORTH (120th St): Milbank across the top; the Diana Center's angular slab upper-east.
          Footprints are kept NARROW (thin map-like blocks) with gaps between the rows. */}
      <div className={B.cb} style={{ left: "13%", top: "4%", width: "34%", height: "12%" }}>Milbank Hall</div>
      <div className={`${B.cb} ${B.diana}`} style={{ left: "66%", top: "5%", width: "19%", height: "15%" }}>Diana Center</div>

      {/* UPPER-MIDDLE: Vagelos Science Center under Milbank, Milstein at the core. */}
      <div className={B.cb} style={{ left: "13%", top: "20%", width: "24%", height: "13%" }}>Vagelos Science Center</div>
      <div className={B.cb} style={{ left: "13%", top: "37%", width: "27%", height: "14%" }}>Milstein Center</div>

      {/* LOWER-MIDDLE: Barnard Hall — left edge aligned to the Claremont-side column. */}
      <div className={B.cb} style={{ left: "13%", top: "56%", width: "28%", height: "12%" }}>Barnard Hall</div>

      {/* SOUTH (116th St): Hewitt/Vagelos on Claremont, Brooks center, Sulzberger + Reid on Broadway. */}
      <div className={`${B.cb} ${B.lt}`} style={{ left: "13%", top: "70%", width: "14%", height: "16%" }}>Hewitt Hall</div>
      <div className={`${B.cb} ${B.lt}`} style={{ left: "13%", top: "89%", width: "14%", height: "7%" }}>Vagelos</div>
      <div className={`${B.cb} ${B.lt}`} style={{ left: "31%", top: "83%", width: "20%", height: "12%" }}>Brooks Hall</div>
      <div className={`${B.cb} ${B.lt}`} style={{ left: "65%", top: "70%", width: "20%", height: "12%" }}>Sulzberger Hall</div>
      <div className={`${B.cb} ${B.lt}`} style={{ left: "65%", top: "85%", width: "20%", height: "11%" }}>Reid Hall</div>
    </div>
  );

  // Morningside: the live campus — mirrored scenery plus the tappable library heroes.
  const morningsideMap = (
    <div className={B.mapWrap}>
      <div className={`${B.zone} ${B.north}`} />
      <div className={`${B.zone} ${B.south}`} />
      <div className={B.walk}><span>College Walk</span></div>

      {/* NORTH — edge verticals (mirrored L/R). The NW Corner block that used to sit
          at top-left is now the live NoCo hero (Northwest Corner Building). */}
      <div className={`${B.cb} ${B.v} ${B.lt}`} style={{ left: "1.5%", top: "16.5%", width: "6%", height: "12%" }}>Chandler</div>
      <div className={`${B.cb} ${B.v} ${B.lt}`} style={{ left: "1.5%", top: "31%", width: "6%", height: "12%" }}>Math</div>
      <div className={`${B.cb} ${B.v} ${B.lt}`} style={{ left: "1.5%", top: "45%", width: "6%", height: "10%" }}>Lewisohn</div>
      <div className={`${B.cb} ${B.v} ${B.lt}`} style={{ left: "92.5%", top: "2%", width: "6%", height: "13%" }}>Comp Sci</div>
      <div className={`${B.cb} ${B.v} ${B.lt}`} style={{ left: "92.5%", top: "16.5%", width: "6%", height: "12%" }}>Fairchild</div>
      <div className={`${B.cb} ${B.v} ${B.lt}`} style={{ left: "92.5%", top: "31%", width: "6%", height: "12%" }}>Fayer</div>
      <div className={`${B.cb} ${B.v} ${B.lt}`} style={{ left: "92.5%", top: "45%", width: "6%", height: "10%" }}>Philo</div>

      {/* NORTH — top row (Pupin | Schapiro | Mudd) */}
      <div className={B.cb} style={{ left: "11%", top: "1.5%", width: "18%", height: "6.5%" }}>Pupin</div>
      <div className={B.cb} style={{ left: "39%", top: "1.5%", width: "22%", height: "9%" }}>Schapiro</div>
      <div className={B.cb} style={{ left: "71%", top: "1.5%", width: "18%", height: "6.5%" }}>Mudd</div>

      {/* NORTH — University Hall (Uris sits just below it, as a live hero) */}
      <div className={`${B.cb} ${B.lt}`} style={{ left: "38%", top: "11%", width: "24%", height: "8%" }}>University Hall</div>

      {/* NORTH — Havemeyer | · | Schermerhorn (mirrored) */}
      <div className={B.cb} style={{ left: "11%", top: "19%", width: "16%", height: "11%" }}>Havemeyer</div>
      <div className={B.cb} style={{ left: "73%", top: "19%", width: "16%", height: "11%" }}>Schermerhorn</div>

      {/* NORTH — Low Library + Earl | Avery (mirrored, between Math/Lewisohn level) */}
      <div className={B.cb} style={{ left: "11%", top: "39.5%", width: "12%", height: "6%" }}>Earl</div>
      <div className={B.cb} style={{ left: "35%", top: "40%", width: "30%", height: "14%", fontSize: "11px", fontWeight: 800 }}>Low Library</div>
      <div className={B.cb} style={{ left: "73%", top: "34%", width: "10%", height: "10%" }}>Avery<span className={B.so}>soon</span></div>

      {/* NORTH — Dodge | Kent (mirrored) */}
      <div className={B.cb} style={{ left: "11%", top: "50%", width: "18%", height: "5%" }}>Dodge</div>
      <div className={B.cb} style={{ left: "71%", top: "50%", width: "18%", height: "5%" }}>Kent</div>

      {/* SOUTH — Pulitzer | Hamilton (mirrored) */}
      <div className={B.cb} style={{ left: "11%", top: "64%", width: "18%", height: "6.5%" }}>Pulitzer</div>
      <div className={B.cb} style={{ left: "71%", top: "64%", width: "18%", height: "6.5%" }}>Hamilton</div>

      {/* SOUTH — Furnald | Hartley (mirrored edge verticals) */}
      <div className={`${B.cb} ${B.v} ${B.lt}`} style={{ left: "1.5%", top: "72%", width: "6%", height: "13%" }}>Furnald</div>
      <div className={`${B.cb} ${B.v} ${B.lt}`} style={{ left: "92.5%", top: "72%", width: "6%", height: "13%" }}>Hartley</div>

      {/* SOUTH — lawns + sundial */}
      <div className={B.lawn} style={{ left: "29%", top: "73%", width: "18%" }}>South Field<br />West</div>
      <div className={B.lawn} style={{ left: "53%", top: "73%", width: "18%" }}>South Field<br />East</div>
      <div className={B.sundial}><span>Sundial</span></div>

      {/* SOUTH — bottom row: Lerner/Carman | Butler | John Jay (mirrored, hug borders) */}
      <div className={B.cb} style={{ left: "1.5%", top: "86%", width: "20%", height: "6%" }}>Lerner Hall</div>
      <div className={B.cb} style={{ left: "1.5%", top: "92.5%", width: "20%", height: "6%" }}>Carman</div>
      <div className={B.cb} style={{ left: "78.5%", top: "86%", width: "20%", height: "12.5%" }}>John Jay</div>

      {/* Live library heroes (Butler + Uris + NoCo): each with its own availability ring. */}
      {renderHeroes(libsByCampus("morningside"))}
    </div>
  );

  // East Campus: the superblock EAST of Amsterdam Ave, linked to the main campus by the
  // Law Bridge (Revson Plaza). Framed by Amsterdam Ave (west) and Morningside Drive
  // (east), 116th → ~119th. SIPA + Italian Academy + Jerome Greene Hall align down the
  // Amsterdam side, the East Campus residence tower and Ancel Plaza hold the core, Wien
  // below, and Heyman Center / Faculty House / President's House line Morningside Dr.
  const eastMap = (
    <div className={B.mapWrap}>
      {/* The avenues bounding the precinct. */}
      <div className={`${B.ave} ${B.aveL}`}><span>Amsterdam Ave</span></div>
      <div className={`${B.ave} ${B.aveR}`}><span>Morningside Dr</span></div>

      {/* The Law Bridge (Revson Plaza) decking across Amsterdam to the main campus. */}
      <div className={B.bridge} style={{ left: "0%", top: "63%", width: "15%", height: "5.5%" }}><span>Law Bridge</span></div>

      {/* Ancel Plaza — the raised hardscape plaza at the core (East Campus's signature). */}
      <div className={`${B.zone} ${B.plaza}`} style={{ left: "44%", top: "30%", width: "26%", height: "22%", borderRadius: "6px" }} />

      {/* WEST column (Amsterdam side): SIPA, Italian Academy, Jerome Greene Hall. */}
      <div className={B.cb} style={{ left: "13%", top: "5%", width: "22%", height: "15%" }}>International Affairs</div>
      <div className={B.cb} style={{ left: "13%", top: "27%", width: "20%", height: "11%" }}>Italian Academy</div>
      <div className={B.cb} style={{ left: "13%", top: "60%", width: "24%", height: "16%" }}>Jerome Greene Hall</div>

      {/* CENTER column: East Campus residence tower, Wien Hall, Jerome Greene Annex. */}
      <div className={B.cb} style={{ left: "44%", top: "5%", width: "24%", height: "18%" }}>East Campus</div>
      <div className={B.cb} style={{ left: "44%", top: "58%", width: "22%", height: "12%" }}>Wien Hall</div>
      <div className={B.cb} style={{ left: "44%", top: "73%", width: "20%", height: "10%" }}>Jerome Greene Annex</div>

      {/* EAST column (Morningside Dr side): Heyman Center, Faculty House, President's House. */}
      <div className={`${B.cb} ${B.lt}`} style={{ left: "71%", top: "7%", width: "16%", height: "12%" }}>Heyman Center</div>
      <div className={`${B.cb} ${B.lt}`} style={{ left: "71%", top: "40%", width: "16%", height: "13%" }}>Faculty House</div>
      <div className={`${B.cb} ${B.lt}`} style={{ left: "71%", top: "72%", width: "16%", height: "12%" }}>President&apos;s House</div>

      {/* Live library heroes on East Campus (Lehman, in the International Affairs bldg). */}
      {renderHeroes(libsByCampus("east-campus"))}
    </div>
  );

  const maps = [barnardMap, morningsideMap, eastMap];

  // ── The cards beneath each map: live summaries for the campus's libraries, or a quiet
  //    empty line when a campus has none yet. These slide in lockstep with the maps.
  const renderCards = (campusLibs: LibStat[]) =>
    campusLibs.length === 0 ? (
      <p className={B.emptyCards}>No live libraries here yet</p>
    ) : (
      campusLibs.map(({ library, free, total, closed, opensLabel, nextFreeLabel }) => {
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
            <div className={B.arrowcard}>
              <svg viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
          </button>
        );
      })
    );
  const cards = CAMPUSES.map((c) => renderCards(libsByCampus(c)));

  return (
    <>
      <div className={`${B.brand} anim d1`}>
        <h1>Stud<i>ii</i></h1>
        {/* Location label tracks the campus you've swiped to. */}
        <div className={B.loc}>{CAMPUS_LABEL[CAMPUSES[idx]]}</div>
      </div>

      {/* Shared date + time controls — scrub to see every library at that moment.
          These stay FIXED above all three campuses (they drive the live Morningside map). */}
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

      {/* Swipeable carousel. The maps and the cards are two tracks that slide in sync,
          so the page dots can sit between them — right under the map, always visible. */}
      <div className={`${B.carousel} anim d3`} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div className={B.viewport}>
          <div className={B.track} style={shift}>
            {maps.map((scene, i) => (
              <div className={B.panel} key={CAMPUSES[i]} aria-hidden={i !== idx}>{scene}</div>
            ))}
          </div>

          {/* Tall, skinny, low-opacity edge arrows — subtle hints that more campuses sit
              left (Barnard) and right (East Campus). Tappable; each hides at its end. */}
          {idx > 0 && (
            <button className={`${B.arrow} ${B.arrowL}`} onClick={() => go(idx - 1)} aria-label={`Go to ${CAMPUS_LABEL[CAMPUSES[idx - 1]]}`}>
              <svg viewBox="0 0 12 48" fill="none"><path d="M9 4 L3 24 L9 44" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          )}
          {idx < CAMPUSES.length - 1 && (
            <button className={`${B.arrow} ${B.arrowR}`} onClick={() => go(idx + 1)} aria-label={`Go to ${CAMPUS_LABEL[CAMPUSES[idx + 1]]}`}>
              <svg viewBox="0 0 12 48" fill="none"><path d="M3 4 L9 24 L3 44" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          )}
        </div>

        {/* Which of the three campuses you're on (active one stretches into a pill). */}
        <div className={B.dots}>
          {CAMPUSES.map((c, i) => (
            <button
              key={c}
              className={`${B.dot} ${i === idx ? B.dotOn : ""}`}
              onClick={() => go(i)}
              aria-label={`Go to ${CAMPUS_LABEL[c]}`}
              aria-current={i === idx}
            />
          ))}
        </div>

        <div className={B.viewport}>
          <div className={B.track} style={shift}>
            {cards.map((scene, i) => (
              <div className={`${B.panel} ${B.cardPanel}`} key={CAMPUSES[i]} aria-hidden={i !== idx}>
                <div className={B.cards}>{scene}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
