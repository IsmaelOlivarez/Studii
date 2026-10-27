// LibCal availability client. SERVER-SIDE ONLY.
//
// Browser calls to this endpoint are blocked by CORS, and we must never fan
// requests across user IPs (ban risk). This is invoked ONLY by the cache
// refresh path (one coordinated caller), never from a component.

const GRID_URL = "https://seats.library.columbia.edu/spaces/availability/grid";

export interface GridSlot {
  start: string; // "YYYY-MM-DD HH:MM:SS"
  end: string;
  itemId: number; // LibCal space id
  className: string; // "s-lc-eq-checkout" = available; "*unavailable" = taken
}

/**
 * One call returns every room in `lid` for the [start, end) window.
 * gid=0 selects all groups in the building; a single call covers up to a week.
 */
export async function fetchGrid(
  lid: number,
  start: string, // "YYYY-MM-DD"
  end: string,
): Promise<GridSlot[]> {
  const body = new URLSearchParams({
    lid: String(lid),
    gid: "0",
    eid: "-1",
    seat: "0",
    seatId: "0",
    zone: "0",
    start,
    end,
    pageIndex: "0",
    pageSize: "200",
  });

  const res = await fetch(GRID_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "X-Requested-With": "XMLHttpRequest", // required — bare requests get 403
      "User-Agent": "Studii/1.0 (Columbia UI class project)",
    },
    body,
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`LibCal grid lid=${lid} -> HTTP ${res.status}`);
  const json = (await res.json()) as { slots?: GridSlot[] };
  return json.slots ?? [];
}
