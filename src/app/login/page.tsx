import { AuthForm } from "@/components/AuthForm";

export default function Login() {
  return (
    <main className="shell">
      <h1 className="title">Home</h1>
      <p className="muted">Sign in to your shared list.</p>
      <AuthForm />
    </main>
  );
}
