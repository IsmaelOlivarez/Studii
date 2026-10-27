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

        {/* NORTH QUAD */}
        <div className={B.cb} style={{ left: "5%", top: "1.5%", width: "21%", height: "6%" }}>Pupin</div>
        <div className={B.cb} style={{ left: "38%", top: "1.5%", width: "23%", height: "7%" }}>Schapiro</div>
        <div className={B.cb} style={{ left: "72%", top: "1.5%", width: "23%", height: "6%" }}>Mudd</div>
        <div className={`${B.cb} ${B.v} ${B.lt}`} style={{ left: "0.5%", top: "1.5%", width: "5%", height: "13%" }}>NW Corner</div>
        <div className={`${B.cb} ${B.v} ${B.lt}`} style={{ left: "0.5%", top: "16%", width: "5%", height: "11%" }}>Chandler</div>
        <div className={B.cb} style={{ left: "7%", top: "16%", width: "17%", height: "8%" }}>Havemeyer</div>
        <div className={`${B.cb} ${B.lt}`} style={{ left: "35%", top: "10%", width: "27%", height: "6.5%" }}>University Hall</div>
        <div className={B.cb} style={{ left: "33%", top: "18%", width: "31%", height: "10%" }}>Uris<span className={B.so}>soon</span></div>
        <div className={`${B.cb} ${B.v}`} style={{ left: "65%", top: "9%", width: "8%", height: "16%" }}>Fairchild</div>
        <div className={`${B.cb} ${B.v}`} style={{ left: "84%", top: "9%", width: "12%", height: "16%" }}>Comp Sci</div>
        <div className={`${B.cb} ${B.v} ${B.lt}`} style={{ left: "0.5%", top: "29%", width: "5%", height: "12%" }}>Math</div>
        <div className={B.cb} style={{ left: "13%", top: "31%", width: "15%", height: "8%" }}>Earl</div>
        <div className={B.cb} style={{ left: "34%", top: "31%", width: "29%", height: "13%", fontSize: "9px", fontWeight: 800 }}>Low Library</div>
        <div className={B.cb} style={{ left: "68%", top: "29%", width: "14%", height: "7%" }}>Avery<span className={B.so}>soon</span></div>
        <div className={`${B.cb} ${B.v}`} style={{ left: "84%", top: "27%", width: "12%", height: "12%" }}>Scherm</div>
        <div className={`${B.cb} ${B.v} ${B.lt}`} style={{ left: "84%", top: "40%", width: "12%", height: "9%" }}>Fayer</div>
        <div className={`${B.cb} ${B.lt}`} style={{ left: "63%", top: "45%", width: "11%", height: "6%" }}>Buell</div>
        <div className={`${B.cb} ${B.lt}`} style={{ left: "76%", top: "39%", width: "11%", height: "7%" }}>St&nbsp;Paul&apos;s</div>
        <div className={`${B.cb} ${B.v} ${B.lt}`} style={{ left: "0.5%", top: "41%", width: "5%", height: "10%" }}>Lewisohn</div>
        <div className={B.cb} style={{ left: "7%", top: "45%", width: "19%", height: "6%" }}>Dodge</div>
        <div className={B.cb} style={{ left: "77%", top: "47.5%", width: "19%", height: "5.5%" }}>Kent</div>

        {/* SOUTH QUAD */}
        <div className={B.cb} style={{ left: "5%", top: "63%", width: "19%", height: "6.5%" }}>Pulitzer</div>
        <div className={`${B.cb} ${B.v} ${B.lt}`} style={{ left: "0.5%", top: "71%", width: "5%", height: "12%" }}>Furnald</div>
        <div className={B.cb} style={{ left: "75%", top: "63%", width: "20%", height: "6.5%" }}>Hamilton</div>
        <div className={`${B.cb} ${B.v} ${B.lt}`} style={{ left: "90%", top: "71%", width: "5%", height: "12%" }}>Hartley</div>
        <div className={`${B.cb} ${B.v} ${B.lt}`} style={{ left: "90%", top: "84%", width: "5%", height: "13%" }}>Wallach</div>
        <div className={B.lawn} style={{ left: "28%", top: "70%", width: "19%" }}>South Field<br />West</div>
        <div className={B.lawn} style={{ left: "52%", top: "70%", width: "19%" }}>South Field<br />East</div>
        <div className={B.sundial}><span>Sundial</span></div>
        <div className={`${B.cb} ${B.lt}`} style={{ left: "3%", top: "84.5%", width: "22%", height: "5%", fontSize: "6px" }}>Bookstore</div>
        <div className={B.cb} style={{ left: "3%", top: "90%", width: "22%", height: "8.5%" }}>Lerner Hall</div>
        <div className={B.cb} style={{ left: "74%", top: "86%", width: "21%", height: "8%" }}>John Jay</div>

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
