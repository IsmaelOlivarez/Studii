import styles from "./DateChips.module.css";

function parseISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function DateChips({
  dateKeys,
  activeIdx,
  onSelect,
  compact = false,
}: {
  dateKeys: string[];
  activeIdx: number;
  onSelect: (i: number) => void;
  compact?: boolean;
}) {
  return (
    <div className={`${styles.dates} ${compact ? styles.compact : ""}`}>
      {dateKeys.map((iso, i) => {
        const d = parseISO(iso);
        const lbl = i === 0 ? "Today" : i === 1 ? "Tom" : d.toLocaleDateString("en", { weekday: "short" });
        return (
          <button
            key={iso}
            className={`${styles.chip} ${i === activeIdx ? styles.on : ""}`}
            onClick={() => onSelect(i)}
          >
            <em>{lbl}</em>
            <b>{d.getDate()}</b>
          </button>
        );
      })}
    </div>
  );
}
