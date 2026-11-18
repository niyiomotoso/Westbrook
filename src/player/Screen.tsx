"use client";

import { useEffect, useState } from "react";
import "@/styles/reference.css";

export type ScreenTheme = "night" | "xmas" | "indep";

export const DESIGN_W = 270;
export const DESIGN_H = 480;

const THEME_BG: Record<ScreenTheme, string> = {
  night: "#121722",
  xmas: "#10302a",
  indep: "#0c3a25",
};

/**
 * The 270x480 reference design box, scaled by one uniform factor
 * `min(viewportW / 270, viewportH / 480)` (R13), centered, with the
 * letterbox surplus filled by the active theme's background so an
 * off-ratio panel (e.g. 1200x1920) shows a themed border, never white.
 */
export function Screen({
  theme = "night",
  children,
}: {
  theme?: ScreenTheme;
  children: React.ReactNode;
}) {
  const [scale, setScale] = useState<number | null>(null);

  useEffect(() => {
    function update() {
      setScale(
        Math.min(window.innerWidth / DESIGN_W, window.innerHeight / DESIGN_H),
      );
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return (
    <div
      data-wall-viewport
      style={{
        width: "100vw",
        height: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        background: THEME_BG[theme],
      }}
    >
      <div
        className={`screen ${theme === "night" ? "" : theme}`.trim()}
        style={{
          transform: scale === null ? undefined : `scale(${scale})`,
          transformOrigin: "center center",
          visibility: scale === null ? "hidden" : "visible",
          flex: "none",
        }}
      >
        {children}
      </div>
    </div>
  );
}
