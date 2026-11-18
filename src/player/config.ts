"use client";

/**
 * Per-device player config (R15): position chosen by the installer, screen
 * key auto-generated at first run (read-only, surfaced via heartbeats),
 * PIN chosen by the installer for the hidden setup gesture.
 */

export interface PlayerConfig {
  position: 0 | 1 | 2;
  screenKey: string;
  pin: string; // 4 digits
}

const CONFIG_KEY = "westbrook.playerConfig.v1";

export function generateScreenKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  const s = [...bytes].map((b) => (b % 36).toString(36)).join("");
  return `scr-${s}`;
}

export function loadPlayerConfig(): PlayerConfig | null {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PlayerConfig;
    if (![0, 1, 2].includes(parsed.position)) return null;
    if (typeof parsed.screenKey !== "string" || !parsed.screenKey) return null;
    if (!/^\d{4}$/.test(parsed.pin ?? "")) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function savePlayerConfig(config: PlayerConfig) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}
