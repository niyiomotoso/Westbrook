"use client";

/**
 * Design-QA gallery: every slide variant at the native 270x480 design size,
 * for side-by-side comparison against docs/westbrook-wall-full-loop.html
 * (AGENTS.md rule 0). Not part of the loop — never shown to guests.
 */

import "@/styles/reference.css";
import { SlideLayer } from "@/player/SlideLayer";
import { LeftOverlay } from "@/player/overlays/LeftOverlay";
import { SeasonDecor } from "@/player/overlays/SeasonDecor";
import { TimeCard } from "@/player/overlays/TimeCard";
import { sampleSnapshot } from "@/player/fixtures/sample-content";
import { buildActiveSlides } from "@/lib/active-slides";
import type { Season } from "@/lib/season";

const slides = buildActiveSlides(sampleSnapshot);
// 2026-11-17 19:50 Lagos — matches the reference's "7:50 PM" time card.
const T = Date.UTC(2026, 10, 17, 18, 50, 0);

function Box({
  label,
  season = "none",
  theme,
  overlay,
  children,
}: {
  label: string;
  season?: Season;
  theme?: string;
  overlay?: "left" | "right";
  children: React.ReactNode;
}) {
  const cls = theme ?? (season === "none" ? "night" : season);
  return (
    <figure style={{ margin: 0 }}>
      <div
        className={`screen ${cls === "night" ? "" : cls}`.trim()}
        data-gallery-screen={label}
      >
        {children}
        {overlay === "left" && (
          <LeftOverlay
            hotelName={sampleSnapshot.settings.hotelName}
            logoUrl={null}
            greeting="Good evening"
          />
        )}
        {overlay === "right" && (
          <TimeCard t={T} city={sampleSnapshot.settings.cities[0]} />
        )}
        <SeasonDecor season={season} />
      </div>
      <figcaption
        style={{ color: "#9aa5b6", fontSize: 12, padding: "6px 2px" }}
      >
        {label}
      </figcaption>
    </figure>
  );
}

export default function GalleryPage() {
  const layer = (i: number, season: Season = "none") => (
    <SlideLayer
      slide={slides[i]}
      slideIndex={i}
      total={slides.length}
      reviewIndex={1}
      season={season}
      snapshot={sampleSnapshot}
      opacity={1}
    />
  );

  return (
    <main
      style={{
        background: "#05070a",
        minHeight: "100vh",
        display: "flex",
        flexWrap: "wrap",
        gap: 20,
        padding: 20,
        alignItems: "flex-start",
      }}
    >
      <Box label="welcome">{layer(0)}</Box>
      <Box label="room-standard">{layer(1)}</Box>
      <Box label="room-deluxe-tag" overlay="right">
        {layer(2)}
      </Box>
      <Box label="room-suite">{layer(3)}</Box>
      <Box label="place-pool" overlay="left">
        {layer(4)}
      </Box>
      <Box label="place-restaurant">{layer(5)}</Box>
      <Box label="place-lobby">{layer(6)}</Box>
      <Box label="place-gym">{layer(7)}</Box>
      <Box label="place-bar">{layer(8)}</Box>
      <Box label="reviews" overlay="left">
        {layer(9)}
      </Box>
      <Box label="good-to-know" overlay="right">
        {layer(10)}
      </Box>
      <Box label="xmas-room" season="xmas">
        {layer(1, "xmas")}
      </Box>
      <Box label="indep-welcome" season="indep">
        {layer(0, "indep")}
      </Box>
    </main>
  );
}
