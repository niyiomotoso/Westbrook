"use client";

import { useState } from "react";
import {
  generateScreenKey,
  savePlayerConfig,
  type PlayerConfig,
} from "./config";

/** PIN gate shown after the hidden 5s corner press (R15). */
export function PinGate({
  expectedPin,
  onPass,
  onCancel,
}: {
  expectedPin: string;
  onPass: () => void;
  onCancel: () => void;
}) {
  const [pin, setPin] = useState("");
  const [wrong, setWrong] = useState(false);

  function check(value: string) {
    setPin(value);
    if (value.length === 4) {
      if (value === expectedPin) onPass();
      else {
        setWrong(true);
        setPin("");
      }
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: "rgba(10, 13, 20, 0.92)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
        color: "#f3ede2",
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}
    >
      <div style={{ fontSize: 16 }}>Enter the setup PIN</div>
      <input
        autoFocus
        inputMode="numeric"
        type="password"
        maxLength={4}
        value={pin}
        onChange={(e) => check(e.target.value.replace(/\D/g, ""))}
        aria-label="Setup PIN"
        style={{
          width: 130,
          fontSize: 28,
          textAlign: "center",
          letterSpacing: "0.3em",
          background: "#0d1118",
          color: "#f3ede2",
          border: `1px solid ${wrong ? "#e26d5a" : "#2b3446"}`,
          borderRadius: 8,
          padding: "10px 4px",
        }}
      />
      {wrong && <div style={{ color: "#e26d5a", fontSize: 13 }}>Not right — try again</div>}
      <button
        onClick={onCancel}
        style={{
          marginTop: 8,
          background: "transparent",
          border: "1px solid #2b3446",
          color: "#a2abbb",
          borderRadius: 8,
          padding: "8px 18px",
          fontSize: 14,
        }}
      >
        Back to the wall
      </button>
    </div>
  );
}

const POSITIONS: { value: 0 | 1 | 2; label: string }[] = [
  { value: 0, label: "Left" },
  { value: 1, label: "Middle" },
  { value: 2, label: "Right" },
];

/**
 * First-run setup (R15) — the only screen that accepts touch. Reopened
 * later via the hidden 5s corner press + PIN.
 */
export function SetupScreen({
  existing,
  onDone,
}: {
  existing: PlayerConfig | null;
  onDone: (config: PlayerConfig) => void;
}) {
  const [position, setPosition] = useState<0 | 1 | 2>(existing?.position ?? 0);
  const [pin, setPin] = useState(existing?.pin ?? "");
  const [screenKey] = useState(existing?.screenKey ?? generateScreenKey());

  const valid = /^\d{4}$/.test(pin);

  return (
    <main
      style={{
        height: "100dvh",
        background: "#121722",
        color: "#f3ede2",
        fontFamily: "'DM Sans', system-ui, sans-serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 18,
        padding: 24,
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: 34,
          fontWeight: 600,
        }}
      >
        WestBrook Wall setup
      </div>

      <div style={{ fontSize: 15, color: "#a2abbb" }}>
        Which position is this screen on the wall?
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        {POSITIONS.map((p) => (
          <button
            key={p.value}
            onClick={() => setPosition(p.value)}
            style={{
              padding: "16px 22px",
              fontSize: 18,
              borderRadius: 10,
              border:
                position === p.value
                  ? "2px solid #d6ab6a"
                  : "1px solid #2b3446",
              background: position === p.value ? "#1d2433" : "transparent",
              color: position === p.value ? "#d6ab6a" : "#f3ede2",
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      <label style={{ fontSize: 15, color: "#a2abbb" }} htmlFor="setup-pin">
        Choose a 4-digit PIN (reopens this screen later)
        <input
          id="setup-pin"
          inputMode="numeric"
          maxLength={4}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          style={{
            display: "block",
            margin: "8px auto 0",
            width: 120,
            fontSize: 26,
            textAlign: "center",
            letterSpacing: "0.3em",
            background: "#0d1118",
            color: "#f3ede2",
            border: "1px solid #2b3446",
            borderRadius: 8,
            padding: "8px 4px",
          }}
        />
      </label>

      <div style={{ fontSize: 12, color: "#5b6676" }}>
        Screen id: {screenKey} (shown on the back office Screens page)
      </div>

      <button
        disabled={!valid}
        onClick={() => {
          const config: PlayerConfig = { position, screenKey, pin };
          savePlayerConfig(config);
          onDone(config);
        }}
        style={{
          padding: "14px 34px",
          fontSize: 18,
          fontWeight: 500,
          borderRadius: 10,
          border: 0,
          background: valid ? "#d6ab6a" : "#4a4336",
          color: "#17130b",
        }}
      >
        Start the wall
      </button>
    </main>
  );
}
