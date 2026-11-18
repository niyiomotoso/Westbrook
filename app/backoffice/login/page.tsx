"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import "@/styles/admin.css";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.status === 204) {
        router.replace("/backoffice/photos");
        return;
      }
      setError(
        res.status === 429
          ? "Too many attempts — wait a minute and try again."
          : "That password is not right.",
      );
    } catch {
      setError("Network problem — try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ad-root" style={{ display: "flex", alignItems: "center" }}>
      <main className="ad-main" style={{ width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 8 }}>
          <div
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: 34,
              fontWeight: 600,
            }}
          >
            WestBrook
          </div>
          <div style={{ color: "var(--ad-muted)", fontSize: 13 }}>
            Reception back office
          </div>
        </div>
        <form className="ad-section" onSubmit={submit}>
          <label className="ad-label" htmlFor="password">
            Reception password
            <input
              id="password"
              className="ad-input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          {error && <div className="ad-error">{error}</div>}
          <button className="ad-btn" disabled={busy || !password}>
            {busy ? "Checking…" : "Sign in"}
          </button>
        </form>
      </main>
    </div>
  );
}
