// BookMark — Studii's little open-book logo. A dumb, reusable design-system
// primitive (no business logic): an open book drawn in the "paper & ink" palette
// with an --accent ribbon tucked into the spine. Sits beside the "Studii" wordmark
// in the campus-map brand header and the first-paint loader. `size` is the box in
// px; it inherits `currentColor` for the ink linework so it reads on any surface.
export function BookMark({
  size = 26,
  className,
  title = "Studii",
}: {
  size?: number;
  className?: string;
  title?: string;
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      role="img"
      aria-label={title}
    >
      {/* page fills — warm paper so the book reads as a solid object on the map */}
      <path
        d="M12 6.4C9.4 4.9 6.1 4.6 3.4 5.4v12.3c2.7-.8 6-.5 8.6 1V6.4Z"
        fill="var(--card)"
      />
      <path
        d="M12 6.4c2.6-1.5 5.9-1.8 8.6-1v12.3c-2.7-.8-6-.5-8.6 1V6.4Z"
        fill="var(--paper-2)"
      />
      {/* accent ribbon dropping from the spine — the one pop of brand blue */}
      <path d="M12 6.4v13.5l1.8-1.6 1.8 1.6V5.2L12 6.4Z" fill="var(--accent)" />
      {/* ink linework: the two covers + the spine */}
      <path
        d="M12 6.4C9.4 4.9 6.1 4.6 3.4 5.4v12.3c2.7-.8 6-.5 8.6 1 2.6-1.5 5.9-1.8 8.6-1V5.4c-2.7-.8-6-.5-8.6 1Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path d="M12 6.4v12.3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      {/* faint text lines on the left page */}
      <path
        d="M5.6 8.5c1.4-.2 2.9-.1 4.2.4M5.6 11c1.4-.2 2.9-.1 4.2.4"
        stroke="currentColor"
        strokeWidth="0.9"
        strokeLinecap="round"
        opacity="0.45"
      />
    </svg>
  );
}
