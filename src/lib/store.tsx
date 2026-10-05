"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "./supabase";
import { uploadPhoto } from "./photos";
import { nextDueFrom, toDateString } from "./logic";
import type { Completion, Household, Interval, Item, ItemPhoto, Member, Room } from "./types";

export interface CloseDetails {
  who: string;
  cost: number | null;
  notes: string;
  afterPhoto: File | null;
  receiptPhoto: File | null;
  repeat: Interval | null;
}

interface Store {
  ready: boolean;
  userId: string;
  household: Household;
  members: Member[];
  rooms: Room[];
  items: Item[];
  photos: ItemPhoto[];
  completions: Completion[];
  today: string;
  reload: () => Promise<void>;
  signOut: () => Promise<void>;
  addItem: (title: string, roomId: string | null, photo: File | null) => Promise<void>;
  updateItem: (id: string, patch: Partial<Item>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  addItemPhoto: (itemId: string, file: File) => Promise<void>;
  closeItem: (item: Item, d: CloseDetails) => Promise<void>;
  setRepeat: (item: Item, interval: Interval | null) => Promise<void>;
  addRoom: (name: string) => Promise<void>;
  renameRoom: (id: string, name: string) => Promise<void>;
  deleteRoom: (id: string) => Promise<void>;
  moveRoom: (id: string, dir: -1 | 1) => Promise<void>;
}

const Ctx = createContext<Store | null>(null);

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore outside AppProvider");
  return s;
}

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

/** Loads the signed-in user's household and keeps it in memory; redirects when signed out or not in a household. */
export function AppProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [household, setHousehold] = useState<Household | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [photos, setPhotos] = useState<ItemPhoto[]>([]);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [today, setToday] = useState(() => toDateString(new Date()));

  const reload = useCallback(async () => {
    const sb = getSupabase();
    const { data: sess } = await sb.auth.getSession();
    const user = sess.session?.user;
    if (!user) return router.replace("/login");
    const { data: mem } = await sb.from("members").select("household_id").eq("user_id", user.id).maybeSingle();
    if (!mem) return router.replace("/start");
    const hid = mem.household_id as string;
    const [h, m, r, i, p, c] = await Promise.all([
      sb.from("households").select("*").eq("id", hid).single(),
      sb.from("members").select("user_id, display_name").eq("household_id", hid),
      sb.from("rooms").select("*").eq("household_id", hid).order("sort_order"),
      sb.from("items").select("*").eq("household_id", hid),
      sb.from("item_photos").select("*").eq("household_id", hid).order("created_at", { ascending: false }),
      sb.from("completions").select("*").eq("household_id", hid).order("done_at", { ascending: false }),
    ]);
    setHousehold(check(h) as Household);
    setMembers(check(m) as Member[]);
    setRooms(check(r) as Room[]);
    setItems(check(i) as Item[]);
    setPhotos(check(p) as ItemPhoto[]);
    setCompletions(
      (check(c) as Completion[]).map((x) => ({ ...x, cost: x.cost === null ? null : Number(x.cost) })),
    );
    setToday(toDateString(new Date()));
    setUserId(user.id);
  }, [router]);

  useEffect(() => {
    reload().catch(() => router.replace("/login"));
    const onVisible = () => document.visibilityState === "visible" && reload().catch(() => {});
    document.addEventListener("visibilitychange", onVisible); // pick up the other person's changes
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [reload, router]);

  const store = useMemo<Store | null>(() => {
    if (!userId || !household) return null;
    const sb = getSupabase();
    const hid = household.id;
    const run = async (fn: () => Promise<unknown>) => {
      await fn();
      await reload();
    };
    return {
      ready: true, userId, household, members, rooms, items, photos, completions, today, reload,
      signOut: async () => {
        await sb.auth.signOut();
        router.replace("/login");
      },
      addItem: (title, roomId, photo) =>
        run(async () => {
          const row = check(
            await sb.from("items").insert({ household_id: hid, title: title.trim(), room_id: roomId, added_by: userId }).select("id").single(),
          );
          if (photo && row) {
            const path = await uploadPhoto(hid, photo);
            check(await sb.from("item_photos").insert({ item_id: row.id, household_id: hid, path }));
          }
        }),
      updateItem: (id, patch) => run(async () => check(await sb.from("items").update(patch).eq("id", id))),
      deleteItem: (id) => run(async () => check(await sb.from("items").delete().eq("id", id))),
      addItemPhoto: (itemId, file) =>
        run(async () => {
          const path = await uploadPhoto(hid, file);
          check(await sb.from("item_photos").insert({ item_id: itemId, household_id: hid, path }));
        }),
      closeItem: (item, d) =>
        run(async () => {
          const [after, receipt] = await Promise.all([
            d.afterPhoto ? uploadPhoto(hid, d.afterPhoto) : null,
            d.receiptPhoto ? uploadPhoto(hid, d.receiptPhoto) : null,
          ]);
          const now = new Date();
          check(
            await sb.from("completions").insert({
              item_id: item.id, household_id: hid, done_at: now.toISOString(),
              who: d.who.trim() || "Us", cost: d.cost, notes: d.notes.trim(),
              after_photo: after, receipt_photo: receipt,
            }),
          );
          // Repeat is chosen at close-out; an item that already repeats keeps its interval unless changed.
          const interval = d.repeat;
          check(
            await sb.from("items").update({
              status: "done",
              repeat_every: interval?.every ?? null,
              repeat_unit: interval?.unit ?? null,
              next_due: interval ? nextDueFrom(now, interval) : null,
            }).eq("id", item.id),
          );
        }),
      setRepeat: (item, interval) =>
        run(async () => {
          // Changing the interval re-rolls the due date from the last completion.
          const last = completions.find((c) => c.item_id === item.id);
          const next = interval && item.status === "done" && last ? nextDueFrom(new Date(last.done_at), interval) : item.next_due;
          check(
            await sb.from("items").update({
              repeat_every: interval?.every ?? null,
              repeat_unit: interval?.unit ?? null,
              next_due: interval ? next : null,
            }).eq("id", item.id),
          );
        }),
      addRoom: (name) =>
        run(async () =>
          check(await sb.from("rooms").insert({ household_id: hid, name: name.trim(), sort_order: Math.max(0, ...rooms.map((r) => r.sort_order)) + 1 })),
        ),
      renameRoom: (id, name) => run(async () => check(await sb.from("rooms").update({ name: name.trim() }).eq("id", id))),
      deleteRoom: (id) => run(async () => check(await sb.from("rooms").delete().eq("id", id))),
      moveRoom: (id, dir) =>
        run(async () => {
          const sorted = [...rooms].sort((a, b) => a.sort_order - b.sort_order);
          const i = sorted.findIndex((r) => r.id === id);
          const j = i + dir;
          if (i < 0 || j < 0 || j >= sorted.length) return;
          [sorted[i], sorted[j]] = [sorted[j], sorted[i]];
          await Promise.all(sorted.map((r, idx) => sb.from("rooms").update({ sort_order: idx + 1 }).eq("id", r.id)));
        }),
    };
  }, [userId, household, members, rooms, items, photos, completions, today, reload, router]);

  if (!store) return <div className="center muted">Loading…</div>;
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}
