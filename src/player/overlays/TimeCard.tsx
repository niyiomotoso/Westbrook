import { formatCityTime, isDaytime } from "@/lib/hotel-time";
import type { CityConfig } from "@/lib/snapshot-types";

/**
 * Right screen only: one city at a time, 6s per city (reference `.ovt`).
 * Gold dot = daytime there (06:00–17:59), grey dot = night.
 */
export function TimeCard({ t, city }: { t: number; city: CityConfig }) {
  const day = isDaytime(t, city.timezone);
  return (
    <div className="ovt">
      <div className="tcity">
        <i className={`dn ${day ? "d" : "n"}`}></i>
        {city.label}
      </div>
      <div className="ttime">{formatCityTime(t, city.timezone)}</div>
    </div>
  );
}
