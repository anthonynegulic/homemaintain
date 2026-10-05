"use client";

import Link from "next/link";
import { TopBar } from "@/components/ui";
import { roomCounts } from "@/lib/logic";
import { useStore } from "@/lib/store";

export default function Rooms() {
  const { rooms, items, today } = useStore();
  return (
    <>
      <TopBar />
      <h1 className="title">Rooms</h1>
      <div className="list">
        {roomCounts(rooms, items, today).map(({ room, count }) => (
          <Link key={room?.id ?? "none"} href={`/rooms/${room?.id ?? "none"}`} className="glass row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="t">{room?.name ?? "No room yet"}</span>
            <span className={count === 0 ? "muted" : "pill"}>{count}</span>
          </Link>
        ))}
      </div>
    </>
  );
}
