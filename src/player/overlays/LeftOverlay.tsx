import { Mono } from "../slides/parts";

/**
 * Left screen only: brand + big greeting over the photo (reference `.ovl`).
 * Hidden while the left screen shows the Welcome page (R3).
 */
export function LeftOverlay({
  hotelName,
  logoUrl,
  greeting,
}: {
  hotelName: string;
  logoUrl: string | null;
  greeting: string;
}) {
  const upper = hotelName.toUpperCase();
  return (
    <div className="ovl">
      <div className="lock">
        <Mono className="mono lg" logoUrl={logoUrl} letter={upper.charAt(0)} />
        <div className="lname">
          {upper}
          <small>HOTEL</small>
        </div>
      </div>
      <div className="gbig2">{greeting}</div>
    </div>
  );
}
