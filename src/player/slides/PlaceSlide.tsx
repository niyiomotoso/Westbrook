import { Photo } from "./parts";

/**
 * Place slide. Name only (`.pline.big`) for pool/lobby/gym/bar; the
 * restaurant shows its name plus the breakfast line (reference markup:
 * `.bname` + `.pline`).
 */
export function PlaceSlide({
  photoUrl,
  name,
  breakfastLine,
  tint,
}: {
  photoUrl: string;
  name: string;
  breakfastLine: string | null;
  tint: boolean;
}) {
  return (
    <>
      <Photo url={photoUrl} />
      {tint && <div className="tint"></div>}
      <div className="fcard">
        {breakfastLine ? (
          <>
            <div className="bname">{name.toUpperCase()}</div>
            <div className="pline">Breakfast {breakfastLine}</div>
          </>
        ) : (
          <div className="pline big">{name}</div>
        )}
      </div>
    </>
  );
}
