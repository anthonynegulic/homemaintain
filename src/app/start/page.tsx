"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";

/** First user creates the household, then shares the invite link from Settings. */
export default function Start() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [me, setMe] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getSupabase().auth.getSession().then(({ data }) => !data.session && router.replace("/login"));
  }, [router]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await getSupabase().rpc("create_household", { p_name: name, p_display_name: me });
    if (error) {
      setBusy(false);
      return setError(error.message);
    }
    router.replace("/settings");
  }

  return (
    <main className="shell">
      <h1 className="title">Set up your home</h1>
      <form onSubmit={submit}>
        <label className="field"><span>Your name</span>
          <input className="input" required value={me} onChange={(e) => setMe(e.target.value)} />
        </label>
        <label className="field"><span>Household name</span>
          <input className="input" placeholder="Our home" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="btn primary block" disabled={busy || !me.trim()}>Create household</button>
        <p className="hint">You can invite the second person from Settings afterwards.</p>
      </form>
    </main>
  );
}
