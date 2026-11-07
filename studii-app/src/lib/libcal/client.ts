// LibCal availability client. SERVER-SIDE ONLY.
//
// Browser calls to this endpoint are blocked by CORS, and we must never fan
// requests across user IPs (ban risk). This is invoked ONLY by the cache
// refresh path (one coordinated caller), never from a component.

// Columbia's LibCal lives on a custom domain; Barnard's is a SEPARATE Springshare
// tenant (barnard.libcal.com). The grid endpoint + Referer must be same-origin for
// each tenant, so the host is per-library (see Library.host). Columbia is the default.
const DEFAULT_HOST = "seats.library.columbia.edu";
const gridUrl = (host: string) => `https://${host}/spaces/availability/grid`;
// LibCal rejects the grid POST with `403 Invalid Referrer.` unless a same-origin
// Referer is present (verified 2026-10-27). Any reserve path under the host works.
const referer = (host: string) => `https://${host}/reserve/study-rooms`;

export interface GridSlot {
  start: string; // "YYYY-MM-DD HH:MM:SS"
  end: string;
  itemId: number; // LibCal space id
  checksum?: string; // per-slot token (used by LibCal's own booking flow; we ignore it)
  // Counter-intuitive, but verified against LibCal's rendered grid (2026-10-27):
  //   ABSENT entirely      = AVAILABLE (LibCal renders these green).
  //   "s-lc-eq-checkout"   = BOOKED  (the slot is checked out / taken; rendered red).
  //   "s-lc-eq-r-unavailable" = unavailable for other reasons (rendered red).
  // So: a slot is free IFF it has no className.
  className?: string;
}

/**
 * One call returns every room in `lid` for the [start, end) window.
 * gid=0 selects all groups in the building; a single call covers up to a week.
 */
export async function fetchGrid(
  lid: number,
  start: string, // "YYYY-MM-DD"
  end: string,
  host: string = DEFAULT_HOST, // Springshare tenant (Columbia default; Barnard differs)
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

  const res = await fetch(gridUrl(host), {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "X-Requested-With": "XMLHttpRequest", // required — bare requests get 403
      Referer: referer(host), // required — missing it gets `403 Invalid Referrer.`
      "User-Agent": "Studii/1.0 (Columbia UI class project)",
    },
    body,
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`LibCal grid lid=${lid} host=${host} -> HTTP ${res.status}`);
  const json = (await res.json()) as { slots?: GridSlot[] };
  return json.slots ?? [];
}
