"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { photoUrl } from "@/lib/photos";
import { PRIORITY_LABEL, SIZE_LABEL, SIZES, formatAud, formatDate, intervalLabel, intervalOf, isRecurring, type SizeFilter } from "@/lib/logic";
import type { Item, Room } from "@/lib/types";

export function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
      <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
    </svg>
  );
}

/** Top bar: optional back button, plus search (every tab) and extra actions. */
export function TopBar({ back, children }: { back?: boolean; children?: ReactNode }) {
  const router = useRouter();
  return (
    <div className="topbar">
      {back && (
        <button className="btn" onClick={() => router.back()} aria-label="Back">‹ Back</button>
      )}
      <div className="actions">
        {children}
        <Link href="/search" className="btn icon" aria-label="Search"><SearchIcon /></Link>
      </div>
    </div>
  );
}

export function TabBar() {
  const path = usePathname();
  const tabs = [
    { href: "/", label: "Home", on: path === "/" },
    { href: "/rooms", label: "Rooms", on: path.startsWith("/rooms") },
    { href: "/history", label: "History", on: path.startsWith("/history") },
  ];
  return (
    <div className="tabs">
      <nav className="glass">
        {tabs.map((t) => (
          <Link key={t.href} href={t.href} className={t.on ? "on" : ""}>{t.label}</Link>
        ))}
      </nav>
    </div>
  );
}

export function Photo({ path, className }: { path: string; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    photoUrl(path).then((u) => live && setUrl(u)).catch(() => {});
    return () => { live = false; };
  }, [path]);
  // eslint-disable-next-line @next/next/no-img-element
  return url ? <img src={url} alt="" className={className} /> : <div className={className} style={{ minHeight: 112 }} />;
}

/** Camera / library picker via the browser's file input. */
export function PhotoPicker({ onPick, className, children, ariaLabel }: { onPick: (f: File) => void; className?: string; children: ReactNode; ariaLabel?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <input ref={ref} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f); e.target.value = ""; }} />
      <button type="button" className={className} aria-label={ariaLabel} onClick={() => ref.current?.click()}>{children}</button>
    </>
  );
}

export function PriorityPill({ item }: { item: Item }) {
  if (!item.priority) return null;
  return <span className={`pill p-${item.priority}`}>{PRIORITY_LABEL[item.priority]}</span>;
}

export function ItemRow({ item, rooms, showRoom = true }: { item: Item; rooms: Room[]; showRoom?: boolean }) {
  const room = rooms.find((r) => r.id === item.room_id);
  return (
    <Link href={`/items/${item.id}`} className={`glass row${item.critical ? " crit" : ""}`}>
      <div className="top">
        <span className="t">{item.title}</span>
        <PriorityPill item={item} />
      </div>
      <div className="meta">
        {showRoom && (room ? <span className="pill">{room.name}</span> : <span className="pill missing">No room</span>)}
        {item.size ? <span className="pill">{SIZE_LABEL[item.size]}</span> : <span className="pill missing">No size</span>}
        {isRecurring(item) && <span className="pill">↻ {intervalLabel(intervalOf(item)!)}</span>}
      </div>
    </Link>
  );
}

export function SizeFilterChips({ value, onChange }: { value: SizeFilter; onChange: (v: SizeFilter) => void }) {
  return (
    <div className="chips" role="group" aria-label="Size filter">
      {(["all", ...SIZES] as SizeFilter[]).map((s) => (
        <button key={s} className={`chip${value === s ? " on" : ""}`} onClick={() => onChange(s)}>
          {s === "all" ? "All" : SIZE_LABEL[s]}
        </button>
      ))}
    </div>
  );
}

export function Switch({ on, onChange, label, critical }: { on: boolean; onChange: (v: boolean) => void; label: string; critical?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={on} className="switch" onClick={() => onChange(!on)}>
      <span>{label}</span>
      <span className={`track${on ? " on" : ""}${critical ? " crit" : ""}`} />
    </button>
  );
}

export { formatAud, formatDate };
