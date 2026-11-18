/* Shared presentational bits, markup lifted from the reference. */

export function Star({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 14 14" width={size} height={size} aria-hidden="true">
      <polygon
        points="7,0.5 8.9,5 13.7,5.4 10,8.6 11.2,13.3 7,10.8 2.8,13.3 4,8.6 0.3,5.4 5.1,5"
        fill="currentColor"
      />
    </svg>
  );
}

export function Stars({ size = 16 }: { size?: number }) {
  return (
    <div className="stars">
      {[0, 1, 2, 3, 4].map((i) => (
        <Star key={i} size={size} />
      ))}
    </div>
  );
}

/**
 * The circular monogram. With an uploaded logo the image replaces the
 * stand-in "W" (brief §5); without one the "W" / hotel-name text shows.
 */
export function Mono({
  logoUrl,
  letter,
  className,
}: {
  logoUrl: string | null;
  letter: string;
  className: string;
}) {
  return (
    <span className={className}>
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt=""
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            borderRadius: "50%",
            display: "block",
          }}
        />
      ) : (
        letter
      )}
    </span>
  );
}

/** Full-bleed slide photo (reference `.photo` holds a cover image). */
export function Photo({ url }: { url: string }) {
  return (
    <div className="photo">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt=""
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
        }}
      />
    </div>
  );
}

/** Progress bar: one segment per active slide, `.on` = this screen's slide. */
export function Prog({ count, activeIndex }: { count: number; activeIndex: number }) {
  return (
    <div className="prog">
      {Array.from({ length: count }, (_, i) => (
        <i key={i} className={i === activeIndex ? "on" : ""} />
      ))}
    </div>
  );
}
