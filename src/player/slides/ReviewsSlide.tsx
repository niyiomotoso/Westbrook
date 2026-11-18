import type { ReviewContent } from "@/lib/snapshot-types";
import { Stars } from "./parts";

/** The reviews page (reference `.revpg`) — photo-less, themed background. */
export function ReviewsSlide({
  reviews,
  reviewIndex,
}: {
  reviews: ReviewContent[];
  reviewIndex: number;
}) {
  // Guard the one-render window where a fresh snapshot (zero reviews) can
  // pair with stale engine state — reviews[NaN] would crash the player and
  // take the watchdog down with it (review finding).
  if (reviews.length === 0) return null;
  const review = reviews[reviewIndex % reviews.length];
  if (!review) return null;
  return (
    <div className="revpg">
      <div className="rk">Our guests say</div>
      <Stars size={20} />
      <p>&ldquo;{review.text}&rdquo;</p>
      <div className="rw">
        {review.firstName}, stayed in {review.month}
      </div>
      <div className="rd2">
        {reviews.map((_, i) => (
          <i key={i} className={i === reviewIndex % reviews.length ? "on" : ""} />
        ))}
      </div>
    </div>
  );
}
