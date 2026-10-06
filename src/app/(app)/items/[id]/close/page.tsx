"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { PhotoPicker, Switch, TopBar } from "@/components/ui";
import { RepeatPicker } from "@/components/RepeatPicker";
import { REPEAT_OPTIONS, intervalOf } from "@/lib/logic";
import { useStore } from "@/lib/store";
import type { Interval } from "@/lib/types";

/** Two-step close-out. Every field is optional; Skip moves on without filling anything. */
export default function CloseOut({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { items, closeItem } = useStore();
  const item = items.find((i) => i.id === id);
  const [step, setStep] = useState<1 | 2>(1);
  const [tradie, setTradie] = useState(false);
  const [tradieName, setTradieName] = useState("");
  const [cost, setCost] = useState("");
  const [notes, setNotes] = useState("");
  const [after, setAfter] = useState<File | null>(null);
  const [receipt, setReceipt] = useState<File | null>(null);
  // An item that already repeats keeps repeating at its interval unless switched off here.
  const current = item ? intervalOf(item) : null;
  const [repeat, setRepeat] = useState(current !== null);
  const [interval, setInterval] = useState<Interval>(current ?? REPEAT_OPTIONS[1].interval);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!item) return <><TopBar back /><p className="muted">Item not found.</p></>;

  async function finish(skipStep2 = false) {
    setBusy(true);
    setError("");
    const parsed = parseFloat(cost.replace(/[^0-9.]/g, ""));
    try {
      await closeItem(item!, {
        who: tradie ? tradieName || "Tradie" : "Us",
        cost: Number.isFinite(parsed) ? parsed : null,
        notes,
        afterPhoto: skipStep2 ? null : after,
        receiptPhoto: skipStep2 ? null : receipt,
        repeat: repeat ? interval : null, // Skip leaves the repeat setting as shown
      });
      router.replace("/");
    } catch (e) {
      setBusy(false);
      setError(e instanceof Error ? e.message : "Couldn't save");
    }
  }

  return (
    <>
      <TopBar back />
      <h1 className="title" style={{ fontSize: 32 }}>{item.title}</h1>
      <div className="steps"><i className="on" /><i className={step === 2 ? "on" : ""} /></div>

      {step === 1 ? (
        <>
          <div className="label">Who did it?</div>
          <div className="chips" style={{ margin: 0, padding: 0 }}>
            <button className={`chip${!tradie ? " on" : ""}`} onClick={() => setTradie(false)}>Us</button>
            <button className={`chip${tradie ? " on" : ""}`} onClick={() => setTradie(true)}>A tradie</button>
          </div>
          {tradie && <input className="input" style={{ marginTop: 10 }} placeholder="Tradie name" aria-label="Tradie name" value={tradieName} onChange={(e) => setTradieName(e.target.value)} />}
          <label className="field"><span>Cost (AUD)</span>
            <input className="input" inputMode="decimal" placeholder="0.00" value={cost} onChange={(e) => setCost(e.target.value)} />
          </label>
          <label className="field"><span>Notes</span>
            <textarea className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} />
            <p className="hint">Notes are searchable later.</p>
          </label>
          <div className="footer-actions">
            <button className="btn primary block" onClick={() => setStep(2)}>Next</button>
            <button className="link" onClick={() => setStep(2)}>Skip</button>
          </div>
        </>
      ) : (
        <>
          <div className="glass card">
            <div className="field-row">
              <span className="k">After photo</span>
              <PhotoPicker className="btn" onPick={setAfter}>{after ? "Change photo" : "Add photo"}</PhotoPicker>
            </div>
            <div className="field-row">
              <span className="k">Receipt or warranty</span>
              <PhotoPicker className="btn" onPick={setReceipt}>{receipt ? "Change photo" : "Add photo"}</PhotoPicker>
            </div>
            <Switch label="Repeat this?" on={repeat} onChange={setRepeat} />
            {repeat && <RepeatPicker value={interval} onChange={setInterval} />}
          </div>
          {error && <p className="error">{error}</p>}
          <div className="footer-actions">
            <button className="btn primary block" disabled={busy} onClick={() => finish()}>{busy ? "Saving…" : "Mark done"}</button>
            <button className="link" disabled={busy} onClick={() => finish(true)}>Skip</button>
            <button className="link" onClick={() => setStep(1)}>Back</button>
          </div>
        </>
      )}
    </>
  );
}
