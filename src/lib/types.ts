export type Priority = "high" | "medium" | "low";
export type Size = "5min" | "morning" | "day" | "weekend";
export type RepeatUnit = "weeks" | "months";

export interface Interval {
  every: number;
  unit: RepeatUnit;
}

export interface Room {
  id: string;
  household_id: string;
  name: string;
  sort_order: number;
}

export interface Item {
  id: string;
  household_id: string;
  title: string;
  room_id: string | null;
  priority: Priority | null;
  size: Size | null;
  critical: boolean;
  notes: string;
  status: "open" | "done";
  repeat_every: number | null;
  repeat_unit: RepeatUnit | null;
  next_due: string | null; // YYYY-MM-DD
  added_by: string | null;
  added_at: string;
}

export interface ItemPhoto {
  id: string;
  item_id: string;
  household_id: string;
  path: string;
  created_at: string;
}

export interface Completion {
  id: string;
  item_id: string;
  household_id: string;
  done_at: string;
  who: string;
  cost: number | null;
  notes: string;
  after_photo: string | null;
  receipt_photo: string | null;
}

export interface Member {
  user_id: string;
  display_name: string;
}

export interface Household {
  id: string;
  name: string;
  invite_token: string;
}
