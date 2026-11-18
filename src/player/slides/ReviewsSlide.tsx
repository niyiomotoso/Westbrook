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
  const review = reviews[reviewIndex % reviews.length];
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
