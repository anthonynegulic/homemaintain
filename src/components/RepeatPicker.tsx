"use client";

import { REPEAT_OPTIONS } from "@/lib/logic";
import type { Interval, RepeatUnit } from "@/lib/types";

const key = (i: Interval) => `${i.every}-${i.unit}`;

/** Preset intervals plus a custom number of weeks or months. */
export function RepeatPicker({ value, onChange }: { value: Interval; onChange: (i: Interval) => void }) {
  const preset = REPEAT_OPTIONS.find((o) => key(o.interval) === key(value));
  return (
    <div>
      <select
        className="select"
        aria-label="How often"
        value={preset ? key(preset.interval) : "custom"}
        onChange={(e) => {
          const o = REPEAT_OPTIONS.find((o) => key(o.interval) === e.target.value);
          onChange(o ? o.interval : { every: 2, unit: "weeks" });
        }}
      >
        {REPEAT_OPTIONS.map((o) => <option key={key(o.interval)} value={key(o.interval)}>{o.label}</option>)}
        <option value="custom">Custom…</option>
      </select>
      {!preset && (
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <input className="input" type="number" min={1} inputMode="numeric" aria-label="Every" value={value.every}
            onChange={(e) => onChange({ ...value, every: Math.max(1, Math.floor(Number(e.target.value)) || 1) })} />
          <select className="select" aria-label="Unit" value={value.unit} onChange={(e) => onChange({ ...value, unit: e.target.value as RepeatUnit })}>
            <option value="weeks">weeks</option>
            <option value="months">months</option>
          </select>
        </div>
      )}
    </div>
  );
}
