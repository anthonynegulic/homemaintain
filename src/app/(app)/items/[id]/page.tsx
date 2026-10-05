"use client";

import Link from "next/link";
import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { Photo, PhotoPicker, Switch, TopBar, formatAud, formatDate } from "@/components/ui";
import { RepeatPicker } from "@/components/RepeatPicker";
import { PRIORITIES, PRIORITY_LABEL, SIZES, SIZE_LABEL, intervalLabel, intervalOf, isOpen } from "@/lib/logic";
import { useStore } from "@/lib/store";
import type { Interval, Item, Priority, Size } from "@/lib/types";

export default function ItemDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { items, rooms, photos, completions, today, updateItem, deleteItem, addItemPhoto, setRepeat } = useStore();
  const [error, setError] = useState("");
  const [editRepeat, setEditRepeat] = useState(false);
  const [openCompletion, setOpenCompletion] = useState<string | null>(null);
  const item = items.find((i) => i.id === id);
  if (!item) return <><TopBar back /><p className="muted">Item not found.</p></>;

  const guard = async (fn: () => Promise<void>) => {
    setError("");
    try { await fn(); } catch (e) { setError(e instanceof Error ? e.message : "Couldn't save"); }
  };
  const save = (patch: Partial<Item>) => guard(() => updateItem(item.id, patch));
  const interval = intervalOf(item);
  const itemPhotos = photos.filter((p) => p.item_id === item.id);
  const past = completions.filter((c) => c.item_id === item.id);

  return (
    <>
      <TopBar back />
      <input key={item.title} className="title-input" defaultValue={item.title} aria-label="Title"
        onBlur={(e) => e.target.value.trim() && e.target.value.trim() !== item.title && save({ title: e.target.value.trim() })} />

      <div className="glass card" style={{ marginTop: 12 }}>
        <div className="field-row">
          <span className="k">Room</span>
          <select aria-label="Room" value={item.room_id ?? ""} onChange={(e) => save({ room_id: e.target.value || null })}>
            <option value="">No room</option>
            {[...rooms].sort((a, b) => a.sort_order - b.sort_order).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
        <div className="field-row">
          <span className="k">Priority</span>
          <select aria-label="Priority" value={item.priority ?? ""} onChange={(e) => save({ priority: (e.target.value || null) as Priority | null })}>
            <option value="">No priority</option>
            {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
          </select>
        </div>
        <div className="field-row">
          <span className="k">Size</span>
          <select aria-label="Size" value={item.size ?? ""} onChange={(e) => save({ size: (e.target.value || null) as Size | null })}>
            <option value="">No size</option>
            {SIZES.map((s) => <option key={s} value={s}>{SIZE_LABEL[s]}</option>)}
          </select>
        </div>
        <div className="field-row">
          <Switch label="Critical" critical on={item.critical} onChange={(v) => save({ critical: v })} />
        </div>
        {interval && (
          <div style={{ padding: "6px 0" }}>
            <button className="field-row" style={{ width: "100%", background: "none", border: 0, color: "inherit", cursor: "pointer" }} onClick={() => setEditRepeat(!editRepeat)}>
              <span className="k">Repeats</span>
              <span className="v">{intervalLabel(interval)}{item.next_due && !isOpen(item, today) ? ` · next ${formatDate(item.next_due)}` : ""}</span>
            </button>
            {editRepeat && (
              <div style={{ marginTop: 8 }}>
                <RepeatPicker value={interval} onChange={(i: Interval) => guard(() => setRepeat(item, i))} />
                <button className="btn danger block" style={{ marginTop: 8 }} onClick={() => guard(async () => { await setRepeat(item, null); setEditRepeat(false); })}>Stop repeating</button>
              </div>
            )}
          </div>
        )}
      </div>

      <h2 className="section">Notes</h2>
      <textarea key={item.notes} className="textarea" defaultValue={item.notes} placeholder="Add notes" aria-label="Notes"
        onBlur={(e) => e.target.value !== item.notes && save({ notes: e.target.value })} />

      <h2 className="section">Photos</h2>
      <div className="photos">
        <PhotoPicker className="add" ariaLabel="Add photo" onPick={(f) => guard(() => addItemPhoto(item.id, f))}>+</PhotoPicker>
        {itemPhotos.map((p) => <Photo key={p.id} path={p.path} />)}
      </div>

      {past.length > 0 && (
        <>
          <h2 className="section">Done before</h2>
          <div className="list">
            {past.map((c) => (
              <div key={c.id} className="glass row" role="button" tabIndex={0} onClick={() => setOpenCompletion(openCompletion === c.id ? null : c.id)}>
                <div className="top">
                  <span className="t">{formatDate(c.done_at)}</span>
                  <span className="muted">{c.who}{c.cost !== null ? ` · ${formatAud(c.cost)}` : ""}</span>
                </div>
                {openCompletion === c.id && (
                  <div>
                    {c.notes ? <p style={{ whiteSpace: "pre-wrap" }}>{c.notes}</p> : <p className="muted">No notes.</p>}
                    {c.after_photo && <Photo path={c.after_photo} className="thumb" />}
                    {c.receipt_photo && <Photo path={c.receipt_photo} className="thumb" />}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {error && <p className="error">{error}</p>}
      <div className="footer-actions">
        {isOpen(item, today) ? (
          <Link href={`/items/${item.id}/close`} className="btn primary block">Mark done</Link>
        ) : (
          <button className="btn block" onClick={() => save({ status: "open", next_due: null })}>Reopen</button>
        )}
        <button className="btn danger block" onClick={() => confirm(`Delete "${item.title}"? Its history is deleted too.`) && guard(async () => { await deleteItem(item.id); router.replace("/"); })}>Delete item</button>
      </div>
    </>
  );
}
