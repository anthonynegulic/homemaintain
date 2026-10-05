"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";

/** Email + password sign in / sign up. `next` is where to go afterwards. */
export function AuthForm({ next = "/", initialMode = "in" }: { next?: string; initialMode?: "in" | "up" }) {
  const router = useRouter();
  const [mode, setMode] = useState<"in" | "up">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const sb = getSupabase();
    const { data, error } =
      mode === "in" ? await sb.auth.signInWithPassword({ email, password }) : await sb.auth.signUp({ email, password });
    setBusy(false);
    if (error) return setError(error.message);
    if (!data.session) return setError("Check your email to confirm your account, then sign in.");
    router.replace(next);
  }

  return (
    <form onSubmit={submit}>
      <label className="field"><span>Email</span>
        <input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label className="field"><span>Password</span>
        <input className="input" type="password" autoComplete={mode === "in" ? "current-password" : "new-password"} minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} />
      </label>
      {error && <p className="error">{error}</p>}
      <button className="btn primary block" disabled={busy}>{mode === "in" ? "Sign in" : "Create account"}</button>
      <p style={{ textAlign: "center" }}>
        <button type="button" className="link" onClick={() => setMode(mode === "in" ? "up" : "in")}>
          {mode === "in" ? "New here? Create an account" : "Have an account? Sign in"}
        </button>
      </p>
    </form>
  );
}
