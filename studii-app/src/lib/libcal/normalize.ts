// Transforms raw LibCal grid slots into our domain AvailabilitySnapshot.
//
// Plan (implemented in Iteration 2):
//   1. group slots by itemId (spaceId) -> map to our RoomId via rooms.ts
//   2. bucket by date (YYYY-MM-DD)
//   3. mark a 15-min slot "busy" when className !== "s-lc-eq-checkout"
//   4. merge contiguous busy slots into BusyRange [startMin, endMin] tuples

import type { GridSlot } from "./client";
import type { AvailabilitySnapshot } from "@/domain/types";
import type { Library } from "@/domain/types";

export function normalizeGrid(
  _slots: GridSlot[],
  _library: Library,
): AvailabilitySnapshot {
  // TODO(iteration-2): implement per the plan above.
  throw new Error("normalizeGrid not implemented yet");
}
