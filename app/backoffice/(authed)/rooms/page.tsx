"use client";

import { useCallback, useEffect, useState } from "react";
import { formatNaira } from "@/lib/format";

interface Room {
  id: string;
  name: string;
  priceNgn: number;
  tagText: string | null;
  enabled: number;
  sort: number;
}

export default function RoomsPage() {
  const [roomsList, setRoomsList] = useState<Room[]>([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [tag, setTag] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Room | null>(null);

  const reload = useCallback(async () => {
    const res = await fetch("/api/admin/rooms");
    if (res.ok) setRoomsList(((await res.json()) as { rooms: Room[] }).rooms);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function call(method: string, body?: unknown, query = "") {
    setError(null);
    const res = await fetch(`/api/admin/rooms${query}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) setError(await res.text());
    await reload();
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    await call("POST", { name, priceNgn: Number(price), tagText: tag });
    setName("");
    setPrice("");
    setTag("");
  }

  return (
    <>
      <h1 className="ad-title">Rooms</h1>

      <form className="ad-section" onSubmit={add}>
        <h2>Add a room type</h2>
        <label className="ad-label" htmlFor="room-name">
          Name
          <input
            id="room-name"
            className="ad-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>
        <label className="ad-label" htmlFor="room-price">
          Price a night (naira)
          <input
            id="room-price"
            className="ad-input"
            type="number"
            min="1"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />
        </label>
        <label className="ad-label" htmlFor="room-tag">
          Tag text (optional, e.g. &ldquo;2 left tonight&rdquo;)
          <input
            id="room-tag"
            className="ad-input"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
          />
        </label>
        {error && <div className="ad-error">{error}</div>}
        <button className="ad-btn">Add room</button>
      </form>

      <section className="ad-section">
        <h2>Room order on the wall</h2>
        {roomsList.map((r, i) => (
          <div className="ad-row" key={r.id}>
            <div className="grow">
              <b>
                {r.name}{" "}
                {r.enabled === 0 && <span className="ad-badge">off</span>}
              </b>
              <span className="sub">
                {formatNaira(r.priceNgn)} a night
                {r.tagText ? ` · tag: ${r.tagText}` : ""}
              </span>
            </div>
            <button
              className="ad-btn secondary small"
              aria-label={`Move ${r.name} up`}
              disabled={i === 0}
              onClick={() => call("PATCH", { id: r.id, move: "up" })}
            >
              ↑
            </button>
            <button
              className="ad-btn secondary small"
              aria-label={`Move ${r.name} down`}
              disabled={i === roomsList.length - 1}
              onClick={() => call("PATCH", { id: r.id, move: "down" })}
            >
              ↓
            </button>
            <button
              className="ad-btn secondary small"
              onClick={() => setEditing(r)}
            >
              Edit
            </button>
          </div>
        ))}
      </section>

      {editing && (
        <section className="ad-section">
          <h2>Edit {editing.name}</h2>
          <label className="ad-label" htmlFor="edit-name">
            Name
            <input
              id="edit-name"
              className="ad-input"
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
            />
          </label>
          <label className="ad-label" htmlFor="edit-price">
            Price a night (naira)
            <input
              id="edit-price"
              className="ad-input"
              type="number"
              min="1"
              value={editing.priceNgn}
              onChange={(e) =>
                setEditing({ ...editing, priceNgn: Number(e.target.value) })
              }
            />
          </label>
          <label className="ad-label" htmlFor="edit-tag">
            Tag text
            <input
              id="edit-tag"
              className="ad-input"
              value={editing.tagText ?? ""}
              onChange={(e) =>
                setEditing({ ...editing, tagText: e.target.value })
              }
            />
          </label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              className="ad-btn"
              onClick={async () => {
                await call("PATCH", {
                  id: editing.id,
                  name: editing.name,
                  priceNgn: editing.priceNgn,
                  tagText: editing.tagText,
                });
                setEditing(null);
              }}
            >
              Save
            </button>
            <button
              className="ad-btn secondary"
              onClick={() =>
                call("PATCH", { id: editing.id, enabled: editing.enabled === 0 })
              }
            >
              {editing.enabled === 0 ? "Turn on" : "Turn off"}
            </button>
            <button
              className="ad-btn danger"
              onClick={async () => {
                await call("DELETE", undefined, `?id=${editing.id}`);
                setEditing(null);
              }}
            >
              Delete room
            </button>
            <button className="ad-btn secondary" onClick={() => setEditing(null)}>
              Close
            </button>
          </div>
        </section>
      )}
    </>
  );
}
