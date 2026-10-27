import styles from "./CampusMap.module.css";

function statusOf(freeNow: number): { cls: string; color: string; word: string } {
  const cls = freeNow <= 1 ? "full" : freeNow <= 3 ? "limited" : "free";
  const word = freeNow === 0 ? "Fully booked" : freeNow <= 1 ? "Nearly full" : freeNow <= 3 ? "Filling up" : "Plenty open";
  return { cls, color: `var(--${cls})`, word };
}

export function CampusMap({ freeNow, onEnter }: { freeNow: number; onEnter: () => void }) {
  const { cls, color, word } = statusOf(freeNow);
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

        {/* NORTH — University Hall + Uris (centered spine) */}
        <div className={`${B.cb} ${B.lt}`} style={{ left: "38%", top: "11%", width: "24%", height: "8%" }}>University Hall</div>
        <div className={B.cb} style={{ left: "35%", top: "20%", width: "30%", height: "18%" }}>Uris<span className={B.so}>soon</span></div>

        {/* NORTH — Havemeyer | · | Schermerhorn (mirrored) */}
        <div className={B.cb} style={{ left: "11%", top: "22%", width: "18%", height: "11%" }}>Havemeyer</div>
        <div className={B.cb} style={{ left: "71%", top: "22%", width: "18%", height: "11%" }}>Schermerhorn</div>

        {/* NORTH — Low Library + Earl | Avery (mirrored, between Math/Lewisohn level) */}
        <div className={B.cb} style={{ left: "11%", top: "39.5%", width: "12%", height: "6%" }}>Earl</div>
        <div className={B.cb} style={{ left: "35%", top: "40%", width: "30%", height: "14%", fontSize: "9px", fontWeight: 800 }}>Low Library</div>
        <div className={B.cb} style={{ left: "77%", top: "34%", width: "12%", height: "6%" }}>Avery<span className={B.so}>soon</span></div>

        {/* NORTH — Dodge | Kent (mirrored) */}
        <div className={B.cb} style={{ left: "11%", top: "50%", width: "18%", height: "5%" }}>Dodge</div>
        <div className={B.cb} style={{ left: "71%", top: "50%", width: "18%", height: "5%" }}>Kent</div>

        {/* SOUTH — Pulitzer | Hamilton (mirrored) */}
        <div className={B.cb} style={{ left: "9%", top: "64%", width: "18%", height: "6.5%" }}>Pulitzer</div>
        <div className={B.cb} style={{ left: "73%", top: "64%", width: "18%", height: "6.5%" }}>Hamilton</div>

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

        {/* availability ring + Butler hero */}
        <div className={B.ring} style={{ "--ring-color": color, boxShadow: `0 8px 18px -6px rgba(var(--shadow),.5), 0 0 0 3px ${color}` } as React.CSSProperties}>
          <span className={B.cnt} style={{ color }}>{freeNow}</span>
        </div>
        <button className={B.butler} onClick={onEnter} aria-label="Open Butler Library">
          <div className={B.pillars}><i /><i /><i /><i /><i /><i /></div>
          <div className={B.nm}>Butler Library</div>
          <div className={B.sub}>Group Study · Floor 4</div>
        </button>
      </div>

      <button className={`${B.sumcard} anim d4`} onClick={onEnter}>
        <div className={B.stat} style={{ background: `var(--${cls}-soft)` }}>
          <b style={{ color }}>{freeNow}</b><em>OF 6</em>
        </div>
        <div className={B.meta}>
          <h3>Butler Library</h3>
          <p><span style={{ color, fontWeight: 700 }}>{word} now</span> · 6 group study rooms</p>
        </div>
        <div className={B.arrow}>
          <svg viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
      </button>
    </>
  );
}
