import { formatNaira } from "@/lib/format";
import { Photo } from "./parts";

/** Room slide: full photo + dark footer card with the price (reference). */
export function RoomSlide({
  photoUrl,
  name,
  priceNgn,
  tagText,
  tint,
}: {
  photoUrl: string;
  name: string;
  priceNgn: number;
  tagText: string | null;
  tint: boolean;
}) {
  return (
    <>
      <Photo url={photoUrl} />
      {tint && <div className="tint"></div>}
      <div className="fcard">
        {tagText && <em className="tag">{tagText}</em>}
        <div className="bname">{name.toUpperCase()}</div>
        <div className="bprice">{formatNaira(priceNgn)}</div>
        <div className="bnight">a night</div>
      </div>
    </>
  );
}
