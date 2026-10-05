"use client";

import { use } from "react";
import { ItemLists } from "@/components/ItemLists";
import { TopBar } from "@/components/ui";
import { useStore } from "@/lib/store";

export default function RoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { rooms } = useStore();
  const room = rooms.find((r) => r.id === id);
  // "none" is the No room yet group: items without a room, with no room to assign on add.
  if (!room && id !== "none") return <><TopBar back /><p className="muted">Room not found.</p></>;
  return (
    <>
      <TopBar back />
      <h1 className="title">{room?.name ?? "No room yet"}</h1>
      <ItemLists roomId={room?.id ?? null} />
    </>
  );
}
