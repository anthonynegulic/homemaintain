"use client";

import Link from "next/link";
import { ItemLists } from "@/components/ItemLists";
import { TopBar } from "@/components/ui";

export default function Home() {
  return (
    <>
      <TopBar>
        <Link href="/settings" className="btn" aria-label="Settings">Settings</Link>
      </TopBar>
      <h1 className="title">Home</h1>
      <ItemLists />
    </>
  );
}
