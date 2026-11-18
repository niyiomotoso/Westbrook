import { screens } from "@/db/schema";
import { getDb } from "@/server/db";

export const dynamic = "force-dynamic";

const POSITION_NAMES = ["Left", "Middle", "Right"];

/** The screens status strip (R24): position, last seen, build. */
export default async function ScreensPage() {
  const rows = await getDb()
    .select()
    .from(screens)
    .all()
    .catch(() => [] as (typeof screens.$inferSelect)[]);
  const now = Date.now();

  return (
    <>
      <h1 className="ad-title">Screens</h1>
      <section className="ad-section">
        <h2>The wall</h2>
        {[0, 1, 2].map((pos) => {
          const here = rows.filter((r) => r.position === pos);
          return (
            <div className="ad-row" key={pos}>
              <div className="grow">
                <b>{POSITION_NAMES[pos]}</b>
                {here.length === 0 && (
                  <span className="sub">no screen has reported yet</span>
                )}
                {here.map((r) => {
                  const silentS = Math.round((now - r.lastSeen) / 1000);
                  return (
                    <span className="sub" key={r.key}>
                      {r.key.slice(0, 10)}… · seen {silentS}s ago
                      {r.buildId ? ` · build ${r.buildId.slice(0, 8)}` : ""}
                    </span>
                  );
                })}
              </div>
              {here.length > 1 ? (
                <span className="ad-badge">duplicate!</span>
              ) : here.length === 1 && now - here[0].lastSeen < 90_000 ? (
                <span className="ad-badge ok">healthy</span>
              ) : here.length === 1 ? (
                <span className="ad-badge">silent</span>
              ) : null}
            </div>
          );
        })}
      </section>
      <div className="ad-note">
        Each tablet reports once a minute. “Silent” usually means power or
        Wi-Fi is out at that screen, or the player app was closed.
      </div>
    </>
  );
}
