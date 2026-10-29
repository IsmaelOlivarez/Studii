import { Fragment } from "react";
import styles from "./CampusMap.module.css";
import type { Library } from "@/domain/types";

/** One library's live headline for the map: how many of its rooms are free now. */
export interface LibStat {
  library: Library;
  free: number;
  total: number;
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
// location) with a dome motif echoing its round reading room.
const PLACEMENT: Record<
  string,
  { hero: React.CSSProperties; ring: React.CSSProperties; motif: "pillars" | "dome" }
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
};

export function CampusMap({
  libs,
  onEnter,
}: {
  libs: LibStat[];
  onEnter: (library: Library) => void;
}) {
  const B = styles; // shorthand

  return (
    <>
      <div className={`${B.brand} anim d1`}>
        <h1>Stud<i>ii</i></h1>
        <div className={B.loc}>Columbia<b>Morningside</b></div>
      </div>

      <div className={`${B.greet} anim d2`}>
        <div className={B.eyebrow}>Midterm season · live</div>
        <p>Don&apos;t wander the stacks.<br /><b>See what&apos;s open</b> before you walk over.</p>
      </div>

      <div className={`${B.mapWrap} anim d3`}>
        <div className={`${B.zone} ${B.north}`} />
        <div className={`${B.zone} ${B.south}`} />
        <div className={B.walk}><span>College Walk</span></div>

        {/* NORTH — edge verticals (mirrored L/R) */}
        <div className={`${B.cb} ${B.v} ${B.lt}`} style={{ left: "1.5%", top: "2%", width: "6%", height: "13%" }}>NW Corner</div>
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

        {/* Live library heroes (Butler + Uris): each with its own availability ring. */}
        {libs.map(({ library, free, total }) => {
          const place = PLACEMENT[library.slug];
          if (!place) return null;
          const { color } = statusOf(free, total);
          return (
            <Fragment key={library.slug}>
              <div
                className={B.ring}
                style={{
                  "--ring-color": color,
                  left: place.ring.left,
                  top: place.ring.top,
                  boxShadow: `0 8px 18px -6px rgba(var(--shadow),.5), 0 0 0 3px ${color}`,
                } as React.CSSProperties}
              >
                <span className={B.cnt} style={{ color }}>{free}</span>
              </div>
              <button
                className={`${B.hero} ${B[library.slug]}`}
                style={place.hero}
                onClick={() => onEnter(library)}
                aria-label={`Open ${library.name}`}
              >
                {place.motif === "pillars" ? (
                  <div className={B.pillars}><i /><i /><i /><i /><i /><i /></div>
                ) : (
                  <div className={B.dome} />
                )}
                <div className={B.nm}>{library.name}</div>
                <div className={B.sub}>{library.floorLabel}</div>
              </button>
            </Fragment>
          );
        })}
      </div>

      {/* One tappable summary card per live library. */}
      <div className={`${B.cards} anim d4`}>
        {libs.map(({ library, free, total }) => {
          const { cls, color, word } = statusOf(free, total);
          return (
            <button key={library.slug} className={B.sumcard} onClick={() => onEnter(library)}>
              <div className={B.stat} style={{ background: `var(--${cls}-soft)` }}>
                <b style={{ color }}>{free}</b><em>OF {total}</em>
              </div>
              <div className={B.meta}>
                <h3>{library.name}</h3>
                <p><span style={{ color, fontWeight: 700 }}>{word} now</span> · {total} group study rooms</p>
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
