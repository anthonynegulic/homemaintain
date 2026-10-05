"use client";

import { useState } from "react";
import { TopBar } from "@/components/ui";
import { useStore } from "@/lib/store";

export default function Settings() {
  const { rooms, members, household, addRoom, renameRoom, deleteRoom, moveRoom, signOut } = useStore();
  const [name, setName] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const sorted = [...rooms].sort((a, b) => a.sort_order - b.sort_order);
  const inviteUrl = typeof window === "undefined" ? "" : `${window.location.origin}/join/${household.invite_token}`;

  const attempt = async (fn: () => Promise<void>) => {
    setError("");
    try { await fn(); } catch (e) { setError(e instanceof Error ? e.message : "Something went wrong"); }
  };

  async function share() {
    if (navigator.share) {
      try { return await navigator.share({ title: "Join our home", url: inviteUrl }); } catch { /* cancelled */ }
    }
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
  }

  return (
    <>
      <TopBar back />
      <h1 className="title">Settings</h1>

      <h2 className="section">Household</h2>
      <div className="glass card">
        <div className="label">Members</div>
        <p style={{ margin: "0 4px 12px" }}>{members.map((m) => m.display_name).join(" and ")}</p>
        {members.length < 2 ? (
          <>
            <button className="btn primary block" onClick={share}>{copied ? "Link copied" : "Invite the second person"}</button>
            <p className="hint">Send them this link. It lets one more person join.</p>
          </>
        ) : (
          <p className="hint">Both members have joined.</p>
        )}
      </div>

      <h2 className="section">Rooms</h2>
      <div className="list">
        {sorted.map((r, i) => (
          <div key={r.id} className="glass" style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 8px 4px 16px" }}>
            <input className="input" style={{ border: 0, background: "transparent", paddingLeft: 0 }} defaultValue={r.name} aria-label="Room name"
              onBlur={(e) => e.target.value.trim() && e.target.value !== r.name && attempt(() => renameRoom(r.id, e.target.value))} />
            <button className="btn icon" style={{ border: 0 }} disabled={i === 0} onClick={() => attempt(() => moveRoom(r.id, -1))} aria-label="Move up">↑</button>
            <button className="btn icon" style={{ border: 0 }} disabled={i === sorted.length - 1} onClick={() => attempt(() => moveRoom(r.id, 1))} aria-label="Move down">↓</button>
            <button className="btn icon danger" style={{ border: 0 }} aria-label={`Delete ${r.name}`}
              onClick={() => confirm(`Delete ${r.name}? Its items will have no room.`) && attempt(() => deleteRoom(r.id))}>✕</button>
          </div>
        ))}
      </div>
      <form style={{ display: "flex", gap: 8, marginTop: 12 }} onSubmit={(e) => { e.preventDefault(); if (name.trim()) attempt(() => addRoom(name)).then(() => setName("")); }}>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="New room" aria-label="New room" />
        <button className="btn primary" disabled={!name.trim()}>Add room</button>
      </form>
      {error && <p className="error">{error}</p>}

      <div className="footer-actions"><button className="btn block" onClick={signOut}>Sign out</button></div>
    </>
  );
}
