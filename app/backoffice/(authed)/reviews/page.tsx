"use client";

import { useCallback, useEffect, useState } from "react";

interface Review {
  id: string;
  firstName: string;
  month: string;
  text: string;
  hidden: number;
}

export default function ReviewsPage() {
  const [list, setList] = useState<Review[]>([]);
  const [firstName, setFirstName] = useState("");
  const [month, setMonth] = useState("");
  const [text, setText] = useState("");
  const [consented, setConsented] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const res = await fetch("/api/admin/reviews");
    if (res.ok) setList(((await res.json()) as { reviews: Review[] }).reviews);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/admin/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName, month, text, consented }),
    });
    if (!res.ok) {
      setError(await res.text());
      return;
    }
    setFirstName("");
    setMonth("");
    setText("");
    setConsented(false);
    await reload();
  }

  return (
    <>
      <h1 className="ad-title">Reviews</h1>

      <form className="ad-section" onSubmit={add}>
        <h2>Add a review</h2>
        <label className="ad-label" htmlFor="rev-name">
          Guest first name
          <input
            id="rev-name"
            className="ad-input"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
        </label>
        <label className="ad-label" htmlFor="rev-month">
          Month of stay (e.g. October)
          <input
            id="rev-month"
            className="ad-input"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            required
          />
        </label>
        <label className="ad-label" htmlFor="rev-text">
          The review ({text.length}/140)
          <textarea
            id="rev-text"
            className="ad-textarea"
            rows={3}
            maxLength={140}
            value={text}
            onChange={(e) => setText(e.target.value)}
            required
          />
        </label>
        <label
          style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14 }}
          htmlFor="rev-consent"
        >
          <input
            id="rev-consent"
            type="checkbox"
            checked={consented}
            onChange={(e) => setConsented(e.target.checked)}
          />
          The guest agreed to show this on the wall
        </label>
        {error && <div className="ad-error">{error}</div>}
        <button className="ad-btn" disabled={!consented}>
          Add review
        </button>
      </form>

      <section className="ad-section">
        <h2>On the wall</h2>
        {list.map((r) => (
          <div className="ad-row" key={r.id}>
            <div className="grow">
              <b>
                &ldquo;{r.text}&rdquo;{" "}
                {r.hidden === 1 && <span className="ad-badge">hidden</span>}
              </b>
              <span className="sub">
                {r.firstName}, stayed in {r.month}
              </span>
            </div>
            <button
              className="ad-btn secondary small"
              onClick={async () => {
                await fetch("/api/admin/reviews", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ id: r.id, hidden: r.hidden === 0 }),
                });
                await reload();
              }}
            >
              {r.hidden === 1 ? "Show" : "Hide"}
            </button>
            <button
              className="ad-btn danger small"
              onClick={async () => {
                await fetch(`/api/admin/reviews?id=${r.id}`, {
                  method: "DELETE",
                });
                await reload();
              }}
            >
              Delete
            </button>
          </div>
        ))}
        {list.length === 0 && (
          <div className="ad-note">
            No reviews yet — the reviews page stays out of the loop until one
            is added.
          </div>
        )}
      </section>
    </>
  );
}
