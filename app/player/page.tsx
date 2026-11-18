"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Screen } from "@/player/Screen";
import { SlideLayer } from "@/player/SlideLayer";
import { LeftOverlay } from "@/player/overlays/LeftOverlay";
import { SeasonDecor } from "@/player/overlays/SeasonDecor";
import { TimeCard } from "@/player/overlays/TimeCard";
import { usePlayerEngine } from "@/player/engine";
import { sampleSnapshot } from "@/player/fixtures/sample-content";
import type { Season } from "@/lib/season";

function PlayerInner() {
  const params = useSearchParams();
  // Position: 0 left, 1 middle, 2 right. Interim ?p= override until the
  // first-run setup screen (U11) owns device config.
  const position = Math.min(2, Math.max(0, Number(params.get("p") ?? 0)));
  const seasonParam = params.get("season");
  const seasonOverride =
    seasonParam === "xmas" || seasonParam === "indep" || seasonParam === "none"
      ? (seasonParam as Season)
      : undefined;

  const snapshot = sampleSnapshot;
  const engine = usePlayerEngine(snapshot, position, seasonOverride);
  const slides = engine.activeSlides;

  const current = slides[engine.slideIndex];
  const incoming = slides[engine.incomingIndex];
  const showLeftOverlay = position === 0 && current.kind !== "welcome";
  const city = snapshot.settings.cities[engine.cityIndex];

  return (
    <Screen theme={engine.season === "none" ? "night" : engine.season}>
      {engine.ready && (
        <>
          <SlideLayer
            slide={current}
            slideIndex={engine.slideIndex}
            total={slides.length}
            reviewIndex={engine.reviewIndex}
            season={engine.season}
            snapshot={snapshot}
            opacity={1}
          />
          {engine.incomingOpacity > 0 && (
            <SlideLayer
              slide={incoming}
              slideIndex={engine.incomingIndex}
              total={slides.length}
              reviewIndex={engine.incomingReviewIndex}
              season={engine.season}
              snapshot={snapshot}
              opacity={engine.incomingOpacity}
            />
          )}
          {showLeftOverlay && (
            <LeftOverlay
              hotelName={snapshot.settings.hotelName}
              logoUrl={snapshot.settings.logoUrl}
              greeting={engine.greeting}
            />
          )}
          {position === 2 && city && <TimeCard t={engine.t} city={city} />}
          <SeasonDecor season={engine.season} />
        </>
      )}
    </Screen>
  );
}

export default function PlayerPage() {
  return (
    <Suspense fallback={null}>
      <PlayerInner />
    </Suspense>
  );
}
