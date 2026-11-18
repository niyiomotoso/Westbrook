import type { Snapshot } from "@/lib/snapshot-types";

/**
 * Phase 1 fixture — mirrors the reference sample hotel exactly: three room
 * types, every place photographed, three reviews → an 11-step loop.
 * Photos are the reference's own placeholder art (public/fixtures/*.svg).
 */
export const sampleSnapshot: Snapshot = {
  contentVersion: 1,
  activateAt: 0,
  loopEpoch: 0,
  buildId: "fixture",
  settings: {
    hotelName: "WestBrook",
    logoUrl: null,
    timezone: "Africa/Lagos",
    cities: [
      { label: "Lagos · local", timezone: "Africa/Lagos" },
      { label: "London", timezone: "Europe/London" },
      { label: "New York", timezone: "America/New_York" },
      { label: "Dubai", timezone: "Asia/Dubai" },
      { label: "Tokyo", timezone: "Asia/Tokyo" },
    ],
    breakfastLine: "7 – 10 am",
    checkoutLine: "12 noon",
    wifiName: "WestBrook Guest",
    wifiPassword: "welcome2026",
    seasons: {
      christmasStart: "12-01",
      christmasEnd: "01-06",
      christmasEnabled: true,
      independenceDay: "10-01",
      independenceEnabled: true,
    },
  },
  rooms: [
    {
      id: "standard",
      name: "Standard",
      priceNgn: 45000,
      tagText: null,
      photoUrls: ["/fixtures/standard.svg"],
    },
    {
      id: "deluxe",
      name: "Deluxe",
      priceNgn: 65000,
      tagText: "2 left tonight",
      photoUrls: ["/fixtures/deluxe.svg"],
    },
    {
      id: "suite",
      name: "Suite",
      priceNgn: 120000,
      tagText: null,
      photoUrls: ["/fixtures/suite.svg"],
    },
  ],
  places: [
    { tag: "pool", name: "Pool terrace", photoUrls: ["/fixtures/pool.svg"] },
    {
      tag: "restaurant",
      name: "Terrace restaurant",
      photoUrls: ["/fixtures/restaurant.svg"],
    },
    { tag: "lobby", name: "Lobby", photoUrls: ["/fixtures/lobby.svg"] },
    { tag: "gym", name: "Gym", photoUrls: ["/fixtures/gym.svg"] },
    { tag: "bar", name: "Bar", photoUrls: ["/fixtures/bar.svg"] },
  ],
  reviews: [
    {
      firstName: "Amara",
      month: "October",
      text: "The staff remembered our names from the first evening.",
    },
    {
      firstName: "Tunde",
      month: "October",
      text: "Quiet room, a great breakfast, and the pool at sunset.",
    },
    {
      firstName: "Chidinma",
      month: "September",
      text: "Check-in took two minutes and the suite was spotless.",
    },
  ],
  message: null,
};
