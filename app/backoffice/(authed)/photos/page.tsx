"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { resizeForWall } from "@/lib/client-resize";

interface PhotoRow {
  id: string;
  roomId: string | null;
  placeTag: string | null;
  url: string;
  createdAt: number;
}

interface PhotoData {
  rooms: { id: string; name: string; enabled: boolean; photoCount: number }[];
  tags: { tag: string; name: string; photoCount: number }[];
  photos: PhotoRow[];
}

export default function PhotosPage() {
  const [data, setData] = useState<PhotoData | null>(null);
  const [target, setTarget] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const reload = useCallback(async () => {
    const res = await fetch("/api/admin/photos");
    if (res.ok) setData((await res.json()) as PhotoData);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function upload() {
    const files = fileRef.current?.files;
    if (!files || files.length === 0 || !target) return;
    setBusy(true);
    setError(null);
    const collected: string[] = [];
    try {
      for (const file of Array.from(files)) {
        const resized = await resizeForWall(file);
        collected.push(
          ...resized.warnings.map((w) => `${file.name}: ${w}`),
        );
        const [kind, id] = target.split(":");
        const q = kind === "room" ? `room=${encodeURIComponent(id)}` : `tag=${id}`;
        const res = await fetch(`/api/admin/photos?${q}`, {
          method: "POST",
          headers: { "Content-Type": "image/jpeg" },
          body: resized.blob,
        });
        if (!res.ok) {
          setError(`${file.name}: ${await res.text()}`);
          break;
        }
      }
      if (fileRef.current) fileRef.current.value = "";
      setNotes(collected);
      await reload();
    } catch {
      setError("Upload failed — try again.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    await fetch(`/api/admin/photos?id=${id}`, { method: "DELETE" });
    await reload();
  }

  const groups: { key: string; name: string; count: number; photos: PhotoRow[] }[] =
    data
      ? [
          ...data.rooms.map((r) => ({
            key: `room:${r.id}`,
            name: r.name,
            count: r.photoCount,
            photos: data.photos.filter((p) => p.roomId === r.id),
          })),
          ...data.tags.map((t) => ({
            key: `tag:${t.tag}`,
            name: t.name,
            count: t.photoCount,
            photos: data.photos.filter((p) => p.placeTag === t.tag),
          })),
        ]
      : [];

  return (
    <>
      <h1 className="ad-title">Photos</h1>

      <section className="ad-section">
        <h2>Add photos</h2>
        <label className="ad-label" htmlFor="photo-target">
          Where do these belong?
          <select
            id="photo-target"
            className="ad-select"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          >
            <option value="">Choose a room or place…</option>
            {data?.rooms.map((r) => (
              <option key={r.id} value={`room:${r.id}`}>
                Room · {r.name}
              </option>
            ))}
            {data?.tags.map((t) => (
              <option key={t.tag} value={`tag:${t.tag}`}>
                Place · {t.name}
              </option>
            ))}
          </select>
        </label>
        <label className="ad-label" htmlFor="photo-files">
          Photos (portrait works best)
          <input
            id="photo-files"
            ref={fileRef}
            className="ad-input"
            type="file"
            accept="image/*"
            multiple
          />
        </label>
        <button className="ad-btn" onClick={upload} disabled={busy || !target}>
          {busy ? "Uploading…" : "Upload"}
        </button>
        {error && <div className="ad-error">{error}</div>}
        {notes.map((n, i) => (
          <div key={i} className="ad-warn">
            {n}
          </div>
        ))}
        <div className="ad-note">
          Photos are trimmed to the screens&rsquo; 9:16 shape and shrunk to
          1080×1920 on your device before upload.
        </div>
      </section>

      {groups.map((g) => (
        <section className="ad-section" key={g.key}>
          <h2>
            {g.name}{" "}
            {g.count === 0 && (
              <span className="ad-badge">no photos — won&rsquo;t appear in the loop</span>
            )}
          </h2>
          {g.photos.map((p) => (
            <div className="ad-row" key={p.id}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="ad-thumb" src={p.url} alt="" />
              <div className="grow">
                <span className="sub">
                  added {new Date(p.createdAt).toLocaleDateString()}
                </span>
              </div>
              <button
                className="ad-btn danger small"
                onClick={() => remove(p.id)}
              >
                Delete
              </button>
            </div>
          ))}
          {g.photos.length === 0 && (
            <div className="ad-note">Nothing here yet.</div>
          )}
        </section>
      ))}
    </>
  );
}
