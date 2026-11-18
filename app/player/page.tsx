"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { loadPlayerConfig, type PlayerConfig } from "@/player/config";
import { useKiosk } from "@/player/kiosk";
import { PinGate, SetupScreen } from "@/player/setup";
import { PlayerErrorBoundary } from "@/player/PlayerErrorBoundary";
import { Screen } from "@/player/Screen";
import { SlideLayer } from "@/player/SlideLayer";
import { LeftOverlay } from "@/player/overlays/LeftOverlay";
import { SeasonDecor } from "@/player/overlays/SeasonDecor";
import { TimeCard } from "@/player/overlays/TimeCard";
import { MessageSlide } from "@/player/slides/MessageSlide";
import { usePlayerEngine } from "@/player/engine";
import { usePolledSnapshot } from "@/player/poller";
import { useWallClock } from "@/player/wall-clock";
import type { Season } from "@/lib/season";
import type { Snapshot } from "@/lib/snapshot-types";

function PlayerInner() {
  const params = useSearchParams();
  // Device config (position, screen key, PIN) from first-run setup (R15).
  // ?p= remains a QA override that skips kiosk mode entirely.
  const pParam = params.get("p");
  const [config, setConfig] = useState<PlayerConfig | null>(null);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [showSetup, setShowSetup] = useState(false);

  useEffect(() => {
    setConfig(loadPlayerConfig());
    setConfigLoaded(true);
  }, []);

  const clock = useWallClock();
  const polled = usePolledSnapshot(clock);

  const kioskConfig = pParam === null ? config : null;
  const { gestureFired, resetGesture } = useKiosk(kioskConfig, () =>
    polledTimezoneRef.current,
  );

  const position =
    pParam !== null
      ? Math.min(2, Math.max(0, Number(pParam)))
      : (config?.position ?? 0);
  const seasonParam = params.get("season");
  const seasonOverride =
    seasonParam === "xmas" || seasonParam === "indep" || seasonParam === "none"
      ? (seasonParam as Season)
      : undefined;

  // Nightly-reload timezone follows settings without re-binding the kiosk.
  const polledTimezoneRef = useRef("Africa/Lagos");
  useEffect(() => {
    if (polled?.settings.timezone) polledTimezoneRef.current = polled.settings.timezone;
  }, [polled?.settings.timezone]);

  // Message demo override (?msg=pic|plain) — a 12s takeover starting shortly
  // after load, for QA until the back office posts real messages (U9).
  const msgParam = params.get("msg");
  const snapshot: Snapshot | null = useMemo(() => {
    if (!polled) return null;
    if (msgParam !== "pic" && msgParam !== "plain") return polled;
    return {
      ...polled,
      message: {
        id: "demo",
        kicker: "Welcome back",
        name: msgParam === "plain" ? "Mrs Bello" : "Mr Okafor",
        body:
          msgParam === "plain"
            ? "Everyone at WestBrook wishes you a wonderful day."
            : "It is a pleasure to have you with us again.",
        imageUrl: msgParam === "pic" ? "/fixtures/suite.svg" : null,
        startAt: Date.now() + 4000,
        durationMs: 12000,
      },
    };
  }, [polled, msgParam]);

  // First run on a kiosk tablet: the setup screen (the only touch surface).
  if (configLoaded && pParam === null && (!config || showSetup)) {
    return (
      <SetupScreen
        existing={config}
        onDone={(c) => {
          setConfig(c);
          setShowSetup(false);
        }}
      />
    );
  }

  if (!snapshot || !configLoaded) {
    // Themed ground until the first snapshot (stored or live) arrives —
    // never a blank white frame (R12).
    return <Screen theme="night">{null}</Screen>;
  }

  return (
    <>
      {gestureFired && config && (
        <PinGate
          expectedPin={config.pin}
          onPass={() => {
            resetGesture();
            setShowSetup(true);
          }}
          onCancel={resetGesture}
        />
      )}
      <PlayerView
        snapshot={snapshot}
        position={position}
        clock={clock}
        seasonOverride={seasonOverride}
      />
    </>
  );
}

function PlayerView({
  snapshot,
  position,
  clock,
  seasonOverride,
}: {
  snapshot: Snapshot;
  position: number;
  clock: ReturnType<typeof useWallClock>;
  seasonOverride?: Season;
}) {
  const engine = usePlayerEngine(snapshot, position, clock, seasonOverride);
  const slides = engine.activeSlides;
  const theme = engine.season === "none" ? "night" : engine.season;

  // A live message takes over everything (R10): overlays and seasonal
  // garland/snow hide; the theme tint stays (plan decision).
  if (engine.ready && engine.message) {
    return (
      <Screen theme={theme}>
        <MessageSlide
          message={engine.message}
          hotelName={snapshot.settings.hotelName}
          logoUrl={snapshot.settings.logoUrl}
          tint={engine.season === "xmas" && engine.message.imageUrl !== null}
        />
      </Screen>
    );
  }

  const current = slides[engine.slideIndex];
  const incoming = slides[engine.incomingIndex];
  const showLeftOverlay =
    engine.ready && position === 0 && current.kind !== "welcome";
  const city = snapshot.settings.cities[engine.cityIndex];

  return (
    <Screen theme={theme}>
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
          {/* Incoming layer stays mounted at opacity 0 — no unmount/remount
              churn each slot, and the next slide's DOM is always warm
              (review finding; also strengthens R12 preloading). */}
          <SlideLayer
            slide={incoming}
            slideIndex={engine.incomingIndex}
            total={slides.length}
            reviewIndex={engine.incomingReviewIndex}
            season={engine.season}
            snapshot={snapshot}
            opacity={engine.incomingOpacity}
          />
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
    <PlayerErrorBoundary>
      <Suspense fallback={null}>
        <PlayerInner />
      </Suspense>
    </PlayerErrorBoundary>
  );
}
