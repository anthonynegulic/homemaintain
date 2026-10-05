"use client";

import Link from "next/link";
import { TopBar, formatAud, formatDate } from "@/components/ui";
import { historyRows } from "@/lib/logic";
import { useStore } from "@/lib/store";
import type { Completion, Item } from "@/lib/types";

export function HistoryRow({ item, completion }: { item: Item; completion: Completion }) {
  return (
    <Link href={`/items/${item.id}`} className="glass row">
      <span className="t">{item.title}</span>
      <div className="meta">
        <span className="pill">{formatDate(completion.done_at)}</span>
        <span className="pill">{completion.who}</span>
        {completion.cost !== null && <span className="pill">{formatAud(completion.cost)}</span>}
      </div>
    </Link>
  );
}

export default function History() {
  const { items, completions } = useStore();
  const rows = historyRows(items, completions);
  return (
    <>
      <TopBar />
      <h1 className="title">History</h1>
      <div className="list">
        {rows.map((r) => <HistoryRow key={r.completion.id} {...r} />)}
        {rows.length === 0 && <p className="muted">Nothing done yet. Closed items show up here.</p>}
      </div>
    </>
  );
}
