"use client";

import { use, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import { AuthForm } from "@/components/AuthForm";

export default function Join({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getSupabase().auth.getSession().then(({ data }) => setSignedIn(!!data.session));
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await getSupabase().rpc("join_household", { p_token: token, p_display_name: name });
    if (error) {
      setBusy(false);
      return setError(error.message);
    }
    router.replace("/");
  }

  if (signedIn === null) return <div className="center muted">Loading…</div>;
  return (
    <main className="shell">
      <h1 className="title">Join your home</h1>
      {signedIn ? (
        <form onSubmit={submit}>
          <label className="field"><span>Your name</span>
            <input className="input" required value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          {error && <p className="error">{error}</p>}
          <button className="btn primary block" disabled={busy || !name.trim()}>Join household</button>
        </form>
      ) : (
        <>
          <p className="muted">Create an account to accept the invite.</p>
          <AuthForm next={`/join/${token}`} initialMode="up" />
        </>
      )}
    </main>
  );
}
