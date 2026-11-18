import { Mono } from "./parts";

/** The bold gold Welcome page (reference `.brandpg`). */
export function WelcomeSlide({
  hotelName,
  logoUrl,
}: {
  hotelName: string;
  logoUrl: string | null;
}) {
  const upper = hotelName.toUpperCase();
  return (
    <div className="brandpg">
      <Mono className="bmono" logoUrl={logoUrl} letter={upper.charAt(0)} />
      <div className="bname2">{upper}</div>
      <div className="bhotel">HOTEL</div>
      <div className="bline"></div>
      <div className="bwel">Welcome</div>
      <div className="bsub">We&rsquo;re glad you&rsquo;re here</div>
    </div>
  );
}
