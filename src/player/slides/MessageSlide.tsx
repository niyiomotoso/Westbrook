import type { MessageContent } from "@/lib/snapshot-types";
import { Mono, Photo } from "./parts";

/**
 * Message takeover (R10): identical on all three screens for the whole
 * window. With a picture: full photo + big footer card. Without: the bold
 * gold brand page. Reference uses `.bguest.n` for long double names.
 */
export function MessageSlide({
  message,
  hotelName,
  logoUrl,
  tint,
}: {
  message: MessageContent;
  hotelName: string;
  logoUrl: string | null;
  tint: boolean;
}) {
  const body = message.body.replaceAll("{name}", message.name).trim();
  const guestClass = message.name.length > 12 ? "bguest n" : "bguest";

  if (message.imageUrl) {
    return (
      <>
        <Photo url={message.imageUrl} />
        {tint && <div className="tint"></div>}
        <div className="fcard big">
          <div className="bk gold">{message.kicker}</div>
          <div className={guestClass}>{message.name}</div>
          <div className="bsub">{body}</div>
        </div>
      </>
    );
  }

  return (
    <div className="brandpg">
      <Mono
        className="bmono sm"
        logoUrl={logoUrl}
        letter={hotelName.toUpperCase().charAt(0)}
      />
      <div className="bk">{message.kicker}</div>
      <div className={guestClass}>{message.name}</div>
      <div className="bline"></div>
      <div className="bsub">{body}</div>
    </div>
  );
}
