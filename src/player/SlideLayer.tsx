import type { Slide } from "@/lib/active-slides";
import type { Season } from "@/lib/season";
import type { Snapshot } from "@/lib/snapshot-types";
import { GoodToKnowSlide } from "./slides/GoodToKnowSlide";
import { PlaceSlide } from "./slides/PlaceSlide";
import { ReviewsSlide } from "./slides/ReviewsSlide";
import { RoomSlide } from "./slides/RoomSlide";
import { WelcomeSlide } from "./slides/WelcomeSlide";
import { Prog } from "./slides/parts";

/**
 * One stacked layer: a slide plus its progress bar as direct siblings
 * (the reference `.brandpg+.prog` recolor relies on that adjacency).
 * Layers are absolutely positioned so current and incoming can cross-fade.
 */
export function SlideLayer({
  slide,
  slideIndex,
  total,
  reviewIndex,
  season,
  snapshot,
  opacity,
}: {
  slide: Slide;
  slideIndex: number;
  total: number;
  reviewIndex: number;
  season: Season;
  snapshot: Snapshot;
  opacity: number;
}) {
  const s = snapshot.settings;
  const tint = season === "xmas";

  let content: React.ReactNode;
  switch (slide.kind) {
    case "welcome":
      content = <WelcomeSlide hotelName={s.hotelName} logoUrl={s.logoUrl} />;
      break;
    case "room":
      content = (
        <RoomSlide
          photoUrl={slide.photoUrl}
          name={slide.name}
          priceNgn={slide.priceNgn}
          tagText={slide.tagText}
          tint={tint}
        />
      );
      break;
    case "place":
      content = (
        <PlaceSlide
          photoUrl={slide.photoUrl}
          name={slide.name}
          breakfastLine={slide.breakfastLine}
          tint={tint}
        />
      );
      break;
    case "reviews":
      content = (
        <ReviewsSlide reviews={snapshot.reviews} reviewIndex={reviewIndex} />
      );
      break;
    case "goodToKnow":
      content = (
        <GoodToKnowSlide
          breakfastLine={s.breakfastLine}
          checkoutLine={s.checkoutLine}
          wifiName={s.wifiName}
          wifiPassword={s.wifiPassword}
        />
      );
      break;
  }

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {content}
      <Prog count={total} activeIndex={slideIndex} />
    </div>
  );
}
