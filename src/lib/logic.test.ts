import { describe, expect, it } from "vitest";
import { buildSections, matchesSize, nextDueFrom, roomCounts, searchItems, addInterval, isOpen } from "./logic";
import type { Completion, Item, Room } from "./types";

let n = 0;
const item = (o: Partial<Item> = {}): Item => ({
  id: `i${++n}`, household_id: "h", title: "Thing", room_id: null, priority: null, size: null, critical: false,
  notes: "", status: "open", repeat_every: null, repeat_unit: null, next_due: null, added_by: null,
  added_at: `2026-01-${String(10 + n).padStart(2, "0")}T00:00:00Z`, ...o,
});
const TODAY = "2026-10-05";

describe("size filter", () => {
  it("shows the chosen size and smaller, hides unsized", () => {
    expect(matchesSize(item({ size: "5min" }), "morning")).toBe(true);
    expect(matchesSize(item({ size: "morning" }), "morning")).toBe(true);
    expect(matchesSize(item({ size: "day" }), "morning")).toBe(false);
    expect(matchesSize(item({ size: null }), "morning")).toBe(false);
    expect(matchesSize(item({ size: null }), "all")).toBe(true);
  });
});

describe("sections", () => {
  it("splits critical / priority / attention and sorts by priority then size", () => {
    const a = item({ priority: "low", size: "5min" });
    const b = item({ priority: "high", size: "day" });
    const c = item({ priority: "high", size: "5min" });
    const crit = item({ critical: true, priority: "high" });
    const none = item({});
    const s = buildSections([a, b, c, crit, none], TODAY, "all");
    expect(s.critical).toEqual([crit]);
    expect(s.priority).toEqual([c, b, a]);
    expect(s.attention).toEqual([none]);
  });
  it("critical always shows; attention ignores the size filter", () => {
    const crit = item({ critical: true, size: "weekend" });
    const none = item({ size: "weekend" });
    const big = item({ priority: "high", size: "weekend" });
    const s = buildSections([crit, none, big], TODAY, "5min");
    expect(s.critical).toEqual([crit]);
    expect(s.attention).toEqual([none]);
    expect(s.priority).toEqual([]);
  });
  it("limits to a room", () => {
    const a = item({ room_id: "r1", priority: "low" });
    const b = item({ room_id: "r2", priority: "low" });
    expect(buildSections([a, b], TODAY, "all", "r1").priority).toEqual([a]);
  });
  it("hides done items until a recurring one is due", () => {
    const done = item({ status: "done" });
    const waiting = item({ status: "done", next_due: "2026-11-01", repeat_every: 1, repeat_unit: "months" });
    const due = item({ status: "done", next_due: TODAY, repeat_every: 1, repeat_unit: "months" });
    expect(isOpen(done, TODAY)).toBe(false);
    expect(isOpen(waiting, TODAY)).toBe(false);
    expect(isOpen(due, TODAY)).toBe(true);
  });
});

describe("room counts", () => {
  const rooms: Room[] = [
    { id: "r2", household_id: "h", name: "B", sort_order: 2 },
    { id: "r1", household_id: "h", name: "A", sort_order: 1 },
  ];
  it("counts every open item, orders rooms, adds No room group only if needed", () => {
    const items = [item({ room_id: "r1", critical: true }), item({ room_id: "r1" }), item({ room_id: "r1", status: "done" })];
    const c = roomCounts(rooms, items, TODAY);
    expect(c.map((x) => [x.room?.name, x.count])).toEqual([["A", 2], ["B", 0]]);
    expect(roomCounts(rooms, [...items, item({})], TODAY).at(-1)).toEqual({ room: null, count: 1 });
  });
});

describe("recurrence", () => {
  it("rolls forward from the actual completion date", () => {
    expect(nextDueFrom(new Date(2026, 9, 20), { every: 3, unit: "months" })).toBe("2027-01-20");
    expect(nextDueFrom(new Date(2026, 9, 20), { every: 2, unit: "weeks" })).toBe("2026-11-03");
  });
  it("clamps month ends", () => {
    expect(addInterval(new Date(2026, 0, 31), { every: 1, unit: "months" }).getDate()).toBe(28);
  });
});

describe("search", () => {
  it("matches titles, notes and completion notes", () => {
    const a = item({ title: "Leaky tap" });
    const b = item({ notes: "Use the 8mm drill bit" });
    const c = item({ title: "Gutters", status: "done" });
    const comp: Completion = { id: "c1", item_id: c.id, household_id: "h", done_at: "2026-02-01T00:00:00Z", who: "Us", cost: null, notes: "Borrowed ladder", after_photo: null, receipt_photo: null };
    expect(searchItems([a, b, c], [comp], "drill").map((h) => h.item)).toEqual([b]);
    expect(searchItems([a, b, c], [comp], "ladder")[0].item).toBe(c);
    expect(searchItems([a, b, c], [comp], "leaky TAP")).toHaveLength(1);
    expect(searchItems([a, b, c], [comp], "  ")).toEqual([]);
  });
});
