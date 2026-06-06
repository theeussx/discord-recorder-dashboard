import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });
      if (!resp.ok) {
        const json = await resp.json().catch(() => ({}));
        throw new Error(json?.error || "Login failed");
      }
      window.location.href = "/";
    } catch (err: any) {
      setError(err?.message ?? String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form onSubmit={submit} className="p-6 bg-white rounded shadow-md w-80">
        <h2 className="text-lg font-semibold mb-4">Login</h2>
        {error && <div className="text-red-600 mb-2">{error}</div>}
        <label className="block mb-2">
          <div className="text-sm">Usuário</div>
          <Input value={username} onChange={e => setUsername(e.target.value)} />
        </label>
        <label className="block mb-4">
          <div className="text-sm">Senha</div>
          <Input type="password" value={password} onChange={e => setPassword(e.target.value)} />
        </label>
        <Button type="submit" disabled={loading}>{loading ? "Entrando..." : "Entrar"}</Button>
      </form>
    </div>
  );
}
