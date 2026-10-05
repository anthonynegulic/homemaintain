"use client";

import { useState } from "react";
import { ItemRow, TopBar, formatDate } from "@/components/ui";
import { searchItems } from "@/lib/logic";
import { useStore } from "@/lib/store";

export default function Search() {
  const { items, completions, rooms } = useStore();
  const [q, setQ] = useState("");
  const hits = searchItems(items, completions, q);
  return (
    <>
      <TopBar back />
      <h1 className="title">Search</h1>
      <input className="input" autoFocus type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Titles and notes" aria-label="Search" />
      <div className="list" style={{ marginTop: 16 }}>
        {hits.map(({ item, completion }) => (
          <div key={item.id}>
            <ItemRow item={item} rooms={rooms} />
            {completion && <p className="hint">Matched a note from {formatDate(completion.done_at)}</p>}
          </div>
        ))}
        {q.trim() && hits.length === 0 && <p className="muted">No matches.</p>}
        {!q.trim() && <p className="hint">Searches typed words in titles and notes, open and closed. Photos aren't searched.</p>}
      </div>
    </>
  );
}
