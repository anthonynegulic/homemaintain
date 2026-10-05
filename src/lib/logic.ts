import type { Completion, Interval, Item, Priority, Room, Size } from "./types";

export const PRIORITIES: Priority[] = ["high", "medium", "low"];
export const PRIORITY_LABEL: Record<Priority, string> = { high: "High", medium: "Medium", low: "Low" };

export const SIZES: Size[] = ["5min", "morning", "day", "weekend"];
export const SIZE_LABEL: Record<Size, string> = {
  "5min": "5 min",
  morning: "A morning",
  day: "Full day",
  weekend: "Weekend",
};

export type SizeFilter = "all" | Size;

export const REPEAT_OPTIONS: { label: string; interval: Interval }[] = [
  { label: "Every month", interval: { every: 1, unit: "months" } },
  { label: "Every 3 months", interval: { every: 3, unit: "months" } },
  { label: "Every 6 months", interval: { every: 6, unit: "months" } },
  { label: "Every 12 months", interval: { every: 12, unit: "months" } },
];

/** Local date as YYYY-MM-DD. */
export function toDateString(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function addInterval(from: Date, { every, unit }: Interval): Date {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  if (unit === "weeks") {
    d.setDate(d.getDate() + every * 7);
  } else {
    const day = d.getDate();
    d.setDate(1);
    d.setMonth(d.getMonth() + every);
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(day, lastDay)); // 31 Jan + 1 month => 28/29 Feb
  }
  return d;
}

/** Rolling schedule: next due is the actual completion date plus the interval. */
export function nextDueFrom(completedAt: Date, interval: Interval): string {
  return toDateString(addInterval(completedAt, interval));
}

export function intervalOf(item: Item): Interval | null {
  return item.repeat_every && item.repeat_unit ? { every: item.repeat_every, unit: item.repeat_unit } : null;
}

export function intervalLabel(i: Interval): string {
  const unit = i.unit === "weeks" ? "week" : "month";
  return i.every === 1 ? `Every ${unit}` : `Every ${i.every} ${unit}s`;
}

/** Open, or a recurring item whose due date has arrived. */
export function isOpen(item: Item, today: string): boolean {
  if (item.status === "open") return true;
  return !!item.next_due && item.next_due <= today;
}

export function isRecurring(item: Item): boolean {
  return intervalOf(item) !== null;
}

const prioRank = (p: Priority | null) => (p ? PRIORITIES.indexOf(p) : PRIORITIES.length);
const sizeRank = (s: Size | null) => (s ? SIZES.indexOf(s) : SIZES.length);

/** Chosen size shows that size and every smaller one. Unsized items are hidden. */
export function matchesSize(item: Item, filter: SizeFilter): boolean {
  if (filter === "all") return true;
  if (!item.size) return false;
  return sizeRank(item.size) <= SIZES.indexOf(filter);
}

export interface Sections {
  critical: Item[];
  priority: Item[];
  attention: Item[];
}

/** The shared Home / room layout. `roomId` limits it to one room (null = items with no room). */
export function buildSections(items: Item[], today: string, filter: SizeFilter, roomId?: string | null): Sections {
  const open = items.filter((i) => isOpen(i, today) && (roomId === undefined || i.room_id === roomId));
  const byAdded = (a: Item, b: Item) => b.added_at.localeCompare(a.added_at);
  const critical = open.filter((i) => i.critical).sort(byAdded);
  const rest = open.filter((i) => !i.critical);
  const priority = rest
    .filter((i) => i.priority && matchesSize(i, filter))
    .sort((a, b) => prioRank(a.priority) - prioRank(b.priority) || sizeRank(a.size) - sizeRank(b.size) || byAdded(a, b));
  // Needs attention is deliberately unaffected by the size filter.
  const attention = rest.filter((i) => !i.priority).sort(byAdded);
  return { critical, priority, attention };
}

export interface RoomCount {
  room: Room | null; // null => "No room yet"
  count: number;
}

export function roomCounts(rooms: Room[], items: Item[], today: string): RoomCount[] {
  const open = items.filter((i) => isOpen(i, today));
  const sorted = [...rooms].sort((a, b) => a.sort_order - b.sort_order);
  const counts: RoomCount[] = sorted.map((room) => ({ room, count: open.filter((i) => i.room_id === room.id).length }));
  const none = open.filter((i) => !i.room_id).length;
  if (none > 0) counts.push({ room: null, count: none });
  return counts;
}

export interface SearchHit {
  item: Item;
  /** Set when the match came from a completion note. */
  completion?: Completion;
}

/** Typed-word search across item titles, item notes and completion notes (open and closed). */
export function searchItems(items: Item[], completions: Completion[], query: string): SearchHit[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const has = (text: string) => words.every((w) => text.toLowerCase().includes(w));
  const byItem = new Map<string, Completion[]>();
  for (const c of completions) byItem.set(c.item_id, [...(byItem.get(c.item_id) ?? []), c]);
  const hits: SearchHit[] = [];
  for (const item of items) {
    if (has(`${item.title} ${item.notes}`)) {
      hits.push({ item });
      continue;
    }
    const c = (byItem.get(item.id) ?? []).find((c) => has(c.notes));
    if (c) hits.push({ item, completion: c });
  }
  return hits;
}

/** One history row per completion, most recent first. */
export function historyRows(items: Item[], completions: Completion[]): { item: Item; completion: Completion }[] {
  const byId = new Map(items.map((i) => [i.id, i]));
  return [...completions]
    .sort((a, b) => b.done_at.localeCompare(a.done_at))
    .flatMap((completion) => {
      const item = byId.get(completion.item_id);
      return item ? [{ item, completion }] : [];
    });
}

export const formatAud = (n: number) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(n);

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
