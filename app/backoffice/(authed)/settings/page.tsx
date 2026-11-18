"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { buildWifiQrPayload } from "@/lib/wifi-qr";
import type { WallSettings } from "@/lib/snapshot-types";

export default function SettingsPage() {
  const [s, setS] = useState<WallSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const logoRef = useRef<HTMLInputElement>(null);

  const reload = useCallback(async () => {
    const res = await fetch("/api/admin/settings");
    if (res.ok) setS((await res.json()) as WallSettings);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  // Live Wi-Fi QR preview (R23) — scan-test before it hits the wall.
  useEffect(() => {
    if (!s?.wifiName) {
      setQr(null);
      return;
    }
    QRCode.toDataURL(buildWifiQrPayload(s.wifiName, s.wifiPassword), {
      margin: 1,
      width: 160,
    })
      .then(setQr)
      .catch(() => setQr(null));
  }, [s?.wifiName, s?.wifiPassword]);

  async function save() {
    if (!s) return;
    setError(null);
    setSaved(false);
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(s),
    });
    if (!res.ok) {
      setError(await res.text());
      return;
    }
    setSaved(true);
    await reload();
  }

  async function uploadLogo() {
    const file = logoRef.current?.files?.[0];
    if (!file) return;
    setError(null);
    const res = await fetch("/api/admin/logo", {
      method: "POST",
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (!res.ok) {
      setError(await res.text());
      return;
    }
    if (logoRef.current) logoRef.current.value = "";
    await reload();
  }

  if (!s) return <div className="ad-note">Loading…</div>;

  const set = (patch: Partial<WallSettings>) => {
    setSaved(false);
    setS({ ...s, ...patch });
  };

  return (
    <>
      <h1 className="ad-title">Settings</h1>

      <section className="ad-section">
        <h2>Branding</h2>
        <label className="ad-label" htmlFor="set-hotel">
          Hotel name
          <input
            id="set-hotel"
            className="ad-input"
            value={s.hotelName}
            onChange={(e) => set({ hotelName: e.target.value })}
          />
        </label>
        <div className="ad-row">
          {s.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="ad-thumb" src={s.logoUrl} alt="Current logo" />
          ) : (
            <div className="ad-note grow">
              No logo uploaded — the wall shows the hotel name as text.
            </div>
          )}
          {s.logoUrl && (
            <button
              className="ad-btn danger small"
              onClick={async () => {
                await fetch("/api/admin/logo", { method: "DELETE" });
                await reload();
              }}
            >
              Remove logo
            </button>
          )}
        </div>
        <label className="ad-label" htmlFor="set-logo">
          Upload logo (PNG or SVG)
          <input
            id="set-logo"
            ref={logoRef}
            className="ad-input"
            type="file"
            accept="image/png,image/svg+xml"
          />
        </label>
        <button className="ad-btn secondary" onClick={uploadLogo}>
          Upload logo
        </button>
      </section>

      <section className="ad-section">
        <h2>Time &amp; seasons</h2>
        <label className="ad-label" htmlFor="set-tz">
          Hotel timezone
          <input
            id="set-tz"
            className="ad-input"
            value={s.timezone}
            onChange={(e) => set({ timezone: e.target.value })}
          />
        </label>
        <div className="ad-note">Time card cities (up to 8, first is home)</div>
        {s.cities.map((c, i) => (
          <div className="ad-row" key={i}>
            <input
              className="ad-input"
              aria-label={`City ${i + 1} label`}
              value={c.label}
              onChange={(e) => {
                const cities = s.cities.slice();
                cities[i] = { ...c, label: e.target.value };
                set({ cities });
              }}
            />
            <input
              className="ad-input"
              aria-label={`City ${i + 1} timezone`}
              value={c.timezone}
              onChange={(e) => {
                const cities = s.cities.slice();
                cities[i] = { ...c, timezone: e.target.value };
                set({ cities });
              }}
            />
            <button
              className="ad-btn danger small"
              aria-label={`Remove city ${c.label}`}
              onClick={() => set({ cities: s.cities.filter((_, j) => j !== i) })}
            >
              ✕
            </button>
          </div>
        ))}
        {s.cities.length < 8 && (
          <button
            className="ad-btn secondary small"
            onClick={() =>
              set({ cities: [...s.cities, { label: "", timezone: "Europe/Paris" }] })
            }
          >
            Add a city
          </button>
        )}
        <div className="ad-row">
          <label
            style={{ display: "flex", gap: 8, alignItems: "center" }}
            htmlFor="set-xmas"
            className="grow"
          >
            <input
              id="set-xmas"
              type="checkbox"
              checked={s.seasons.christmasEnabled}
              onChange={(e) =>
                set({
                  seasons: { ...s.seasons, christmasEnabled: e.target.checked },
                })
              }
            />
            Christmas look
          </label>
          <input
            className="ad-input"
            style={{ width: 90 }}
            aria-label="Christmas start (MM-DD)"
            value={s.seasons.christmasStart}
            onChange={(e) =>
              set({ seasons: { ...s.seasons, christmasStart: e.target.value } })
            }
          />
          <input
            className="ad-input"
            style={{ width: 90 }}
            aria-label="Christmas end (MM-DD)"
            value={s.seasons.christmasEnd}
            onChange={(e) =>
              set({ seasons: { ...s.seasons, christmasEnd: e.target.value } })
            }
          />
        </div>
        <div className="ad-row">
          <label
            style={{ display: "flex", gap: 8, alignItems: "center" }}
            htmlFor="set-indep"
            className="grow"
          >
            <input
              id="set-indep"
              type="checkbox"
              checked={s.seasons.independenceEnabled}
              onChange={(e) =>
                set({
                  seasons: {
                    ...s.seasons,
                    independenceEnabled: e.target.checked,
                  },
                })
              }
            />
            Independence Day look
          </label>
          <input
            className="ad-input"
            style={{ width: 90 }}
            aria-label="Independence Day (MM-DD)"
            value={s.seasons.independenceDay}
            onChange={(e) =>
              set({ seasons: { ...s.seasons, independenceDay: e.target.value } })
            }
          />
        </div>
      </section>

      <section className="ad-section">
        <h2>Network</h2>
        <label className="ad-label" htmlFor="set-wifi">
          Wi-Fi network name
          <input
            id="set-wifi"
            className="ad-input"
            value={s.wifiName}
            onChange={(e) => set({ wifiName: e.target.value })}
          />
        </label>
        <label className="ad-label" htmlFor="set-wifipw">
          Wi-Fi password
          <input
            id="set-wifipw"
            className="ad-input"
            value={s.wifiPassword}
            onChange={(e) => set({ wifiPassword: e.target.value })}
          />
        </label>
        {qr && (
          <div className="ad-row">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt="Wi-Fi QR preview" width={80} height={80} style={{ borderRadius: 6 }} />
            <div className="ad-note grow">
              Scan this with a phone to test before it reaches the wall.
            </div>
          </div>
        )}
      </section>

      <section className="ad-section">
        <h2>Hotel info</h2>
        <label className="ad-label" htmlFor="set-breakfast">
          Breakfast hours (shown on the restaurant slide and Good to know)
          <input
            id="set-breakfast"
            className="ad-input"
            value={s.breakfastLine}
            onChange={(e) => set({ breakfastLine: e.target.value })}
          />
        </label>
        <label className="ad-label" htmlFor="set-checkout">
          Checkout line
          <input
            id="set-checkout"
            className="ad-input"
            value={s.checkoutLine}
            onChange={(e) => set({ checkoutLine: e.target.value })}
          />
        </label>
      </section>

      {error && <div className="ad-error">{error}</div>}
      {saved && <div className="ad-badge ok">Saved — screens update in ~45s</div>}
      <button className="ad-btn" onClick={save}>
        Save settings
      </button>
    </>
  );
}
