"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { resizeForWall } from "@/lib/client-resize";

interface Template {
  id: string;
  kicker: string;
  body: string;
}

interface Msg {
  id: string;
  kicker: string;
  name: string;
  body: string;
  mediaKey: string | null;
  startAt: number;
  durationMs: number;
  canceled: number;
}

export default function MessagesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [kicker, setKicker] = useState("");
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [durationS, setDurationS] = useState(12);
  const [when, setWhen] = useState(""); // datetime-local; empty = post now
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [newTplKicker, setNewTplKicker] = useState("");
  const [newTplBody, setNewTplBody] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const reload = useCallback(async () => {
    const res = await fetch("/api/admin/messages");
    if (res.ok) {
      const d = (await res.json()) as { templates: Template[]; messages: Msg[] };
      setTemplates(d.templates);
      setMsgs(d.messages);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  function pickTemplate(t: Template) {
    setKicker(t.kicker);
    setBody(t.body);
  }

  const preview = body.replaceAll("{name}", name || "…");

  async function post() {
    setError(null);
    setOk(null);
    let imageBase64: string | undefined;
    const file = fileRef.current?.files?.[0];
    if (file) {
      const resized = await resizeForWall(file);
      const buf = new Uint8Array(await resized.blob.arrayBuffer());
      let bin = "";
      for (const b of buf) bin += String.fromCharCode(b);
      imageBase64 = btoa(bin);
    }
    const res = await fetch("/api/admin/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kicker,
        name,
        body,
        durationS,
        startAt: when ? new Date(when).getTime() : null,
        imageBase64,
      }),
    });
    if (!res.ok) {
      setError(await res.text());
      return;
    }
    const d = (await res.json()) as { startAt: number };
    setOk(
      when
        ? `Scheduled for ${new Date(d.startAt).toLocaleString()}.`
        : `Going up on all three screens in ~30 seconds.`,
    );
    setName("");
    setWhen("");
    if (fileRef.current) fileRef.current.value = "";
    await reload();
  }

  async function saveTemplate() {
    setError(null);
    const res = await fetch("/api/admin/messages", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kicker: newTplKicker, body: newTplBody }),
    });
    if (!res.ok) {
      setError(await res.text());
      return;
    }
    setNewTplKicker("");
    setNewTplBody("");
    await reload();
  }

  const now = Date.now();

  return (
    <>
      <h1 className="ad-title">Messages</h1>

      <section className="ad-section">
        <h2>Templates</h2>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {templates.map((t) => (
            <button
              key={t.id}
              className="ad-btn secondary small"
              onClick={() => pickTemplate(t)}
            >
              {t.kicker}
            </button>
          ))}
        </div>
      </section>

      <section className="ad-section">
        <h2>Post a message</h2>
        <label className="ad-label" htmlFor="msg-kicker">
          Heading (kicker)
          <input
            id="msg-kicker"
            className="ad-input"
            value={kicker}
            onChange={(e) => setKicker(e.target.value)}
          />
        </label>
        <label className="ad-label" htmlFor="msg-name">
          Visitor name or names
          <input
            id="msg-name"
            className="ad-input"
            placeholder="Mr Okafor · Mr and Mrs Eze"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="ad-label" htmlFor="msg-body">
          Message (editable — {"{name}"} drops the name in)
          <textarea
            id="msg-body"
            className="ad-textarea"
            rows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </label>
        {body && (
          <div className="ad-note">
            Preview: <b style={{ color: "var(--ad-ink)" }}>{kicker}</b> —{" "}
            {name || "…"} — {preview}
          </div>
        )}
        <label className="ad-label" htmlFor="msg-image">
          Picture (optional)
          <input
            id="msg-image"
            ref={fileRef}
            className="ad-input"
            type="file"
            accept="image/*"
          />
        </label>
        <label className="ad-label" htmlFor="msg-duration">
          Shows for {durationS} seconds
          <input
            id="msg-duration"
            className="ad-input"
            type="range"
            min={8}
            max={30}
            value={durationS}
            onChange={(e) => setDurationS(Number(e.target.value))}
          />
        </label>
        <label className="ad-label" htmlFor="msg-when">
          Show from (leave empty to post now)
          <input
            id="msg-when"
            className="ad-input"
            type="datetime-local"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
          />
        </label>
        {error && <div className="ad-error">{error}</div>}
        {ok && <div className="ad-badge ok">{ok}</div>}
        <button className="ad-btn" onClick={post} disabled={!kicker || !body}>
          {when ? "Schedule" : "Post to all screens"}
        </button>
      </section>

      <section className="ad-section">
        <h2>Upcoming &amp; recent</h2>
        {msgs.map((m) => {
          const end = m.startAt + m.durationMs;
          const state = m.canceled
            ? "canceled"
            : end <= now
              ? "shown"
              : m.startAt <= now
                ? "live now"
                : "upcoming";
          return (
            <div className="ad-row" key={m.id}>
              <div className="grow">
                <b>
                  {m.kicker} — {m.name || "(no name)"}{" "}
                  <span className={`ad-badge ${state === "upcoming" || state === "live now" ? "ok" : ""}`}>
                    {state}
                  </span>
                </b>
                <span className="sub">
                  {new Date(m.startAt).toLocaleString()} ·{" "}
                  {Math.round(m.durationMs / 1000)}s
                </span>
              </div>
              {state === "upcoming" && (
                <button
                  className="ad-btn danger small"
                  onClick={async () => {
                    const res = await fetch(`/api/admin/messages?id=${m.id}`, {
                      method: "DELETE",
                    });
                    if (!res.ok) setError(await res.text());
                    await reload();
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          );
        })}
        {msgs.length === 0 && <div className="ad-note">No messages yet.</div>}
      </section>

      <section className="ad-section">
        <h2>Write a new template</h2>
        <label className="ad-label" htmlFor="tpl-kicker">
          Heading
          <input
            id="tpl-kicker"
            className="ad-input"
            value={newTplKicker}
            onChange={(e) => setNewTplKicker(e.target.value)}
          />
        </label>
        <label className="ad-label" htmlFor="tpl-body">
          Body (use {"{name}"} where the guest&rsquo;s name goes)
          <textarea
            id="tpl-body"
            className="ad-textarea"
            rows={2}
            value={newTplBody}
            onChange={(e) => setNewTplBody(e.target.value)}
          />
        </label>
        <button
          className="ad-btn secondary"
          onClick={saveTemplate}
          disabled={!newTplKicker || !newTplBody}
        >
          Save template
        </button>
      </section>
    </>
  );
}
