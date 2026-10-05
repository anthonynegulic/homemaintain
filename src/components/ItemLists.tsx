"use client";

import { useState, type FormEvent } from "react";
import { useStore } from "@/lib/store";
import { buildSections, type SizeFilter } from "@/lib/logic";
import { ItemRow, PhotoPicker, SizeFilterChips } from "./ui";

/** The Home layout; with `roomId` it is limited to that room (new items land in it). */
export function ItemLists({ roomId }: { roomId?: string | null }) {
  const { items, rooms, today, addItem } = useStore();
  const [filter, setFilter] = useState<SizeFilter>("all");
  const [title, setTitle] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { critical, priority, attention } = buildSections(items, today, filter, roomId);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      await addItem(title, roomId ?? null, photo);
      setTitle("");
      setPhoto(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add the item");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <form className="quickadd" onSubmit={submit}>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs doing?" aria-label="New item" enterKeyHint="done" />
        <PhotoPicker className="btn icon" onPick={setPhoto} ariaLabel="Add photo">{photo ? "✓" : "📷"}</PhotoPicker>
        <button className="btn primary" disabled={!title.trim() || busy}>Add item</button>
      </form>
      {error && <p className="error">{error}</p>}

      {critical.length > 0 && (
        <>
          <h2 className="section crit">Critical</h2>
          <div className="list">{critical.map((i) => <ItemRow key={i.id} item={i} rooms={rooms} showRoom={roomId === undefined} />)}</div>
        </>
      )}

      <h2 className="section">Priority</h2>
      <SizeFilterChips value={filter} onChange={setFilter} />
      <div className="list" style={{ marginTop: 12 }}>
        {priority.map((i) => <ItemRow key={i.id} item={i} rooms={rooms} showRoom={roomId === undefined} />)}
        {priority.length === 0 && <p className="muted" style={{ margin: "4px" }}>{filter === "all" ? "Nothing prioritised yet." : "Nothing this size."}</p>}
      </div>

      <h2 className="section">Needs attention</h2>
      <div className="list">
        {attention.map((i) => <ItemRow key={i.id} item={i} rooms={rooms} showRoom={roomId === undefined} />)}
        {attention.length === 0 && <p className="muted" style={{ margin: "4px" }}>Everything has a priority.</p>}
      </div>
    </>
  );
}
