"use client";
import { useEffect, useState } from "react";
import styles from "./StatusBar.module.css";

export function StatusBar() {
  const [clock, setClock] = useState("9:41");
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      const h = d.getHours() % 12 === 0 ? 12 : d.getHours() % 12;
      setClock(`${h}:${String(d.getMinutes()).padStart(2, "0")}`);
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className={styles.statusbar}>
      <span>{clock}</span>
      <div className={styles.dots}>
        <span /><span /><span />
        <span className={styles.batt} />
      </div>
    </div>
  );
}
