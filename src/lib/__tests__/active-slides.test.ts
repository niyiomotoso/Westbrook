import { describe, expect, it } from "vitest";
import { buildActiveSlides, snapshotImageUrls } from "../active-slides";
import { sampleSnapshot } from "../../player/fixtures/sample-content";
import type { Snapshot } from "../snapshot-types";

function clone(): Snapshot {
  return JSON.parse(JSON.stringify(sampleSnapshot)) as Snapshot;
}

describe("buildActiveSlides", () => {
  it("yields the brief's 11-step order for the full sample hotel", () => {
    const slides = buildActiveSlides(sampleSnapshot);
    expect(slides.map((s) => s.kind)).toEqual([
      "welcome",
      "room",
      "room",
      "room",
      "place",
      "place",
      "place",
      "place",
      "place",
      "reviews",
      "goodToKnow",
    ]);
    expect(slides.length).toBe(11);
  });

  it("orders places pool, restaurant, lobby, gym, bar regardless of input order", () => {
    const snap = clone();
    snap.places.reverse();
    const names = buildActiveSlides(snap)
      .filter((s) => s.kind === "place")
      .map((s) => (s.kind === "place" ? s.name : ""));
    expect(names).toEqual([
      "Pool terrace",
      "Terrace restaurant",
      "Lobby",
      "Gym",
      "Bar",
    ]);
  });

  it("skips a tag with zero photos — nobody notices an absence (R4)", () => {
    const snap = clone();
    snap.places = snap.places.map((p) =>
      p.tag === "gym" || p.tag === "bar" ? { ...p, photoUrls: [] } : p,
    );
    const slides = buildActiveSlides(snap);
    expect(slides.length).toBe(9);
    expect(
      slides.some((s) => s.kind === "place" && (s.name === "Gym" || s.name === "Bar")),
    ).toBe(false);
  });

  it("skips the reviews page when there are no reviews", () => {
    const snap = clone();
    snap.reviews = [];
    const slides = buildActiveSlides(snap);
    expect(slides.some((s) => s.kind === "reviews")).toBe(false);
    expect(slides.length).toBe(10);
  });

  it("emits one slide per room photo, carrying the room caption", () => {
    const snap = clone();
    snap.rooms[0].photoUrls = ["/a.jpg", "/b.jpg"];
    const rooms = buildActiveSlides(snap).filter((s) => s.kind === "room");
    expect(rooms.length).toBe(4);
    expect(rooms[0]).toMatchObject({ name: "Standard", photoUrl: "/a.jpg" });
    expect(rooms[1]).toMatchObject({ name: "Standard", photoUrl: "/b.jpg" });
  });

  it("gives the restaurant its breakfast line and nobody else (R5)", () => {
    const places = buildActiveSlides(sampleSnapshot).filter(
      (s) => s.kind === "place",
    );
    for (const p of places) {
      if (p.kind !== "place") continue;
      if (p.name === "Terrace restaurant") {
        expect(p.breakfastLine).toBe("7 – 10 am");
      } else {
        expect(p.breakfastLine).toBeNull();
      }
    }
  });

  it("always keeps Welcome first and Good to know last (N >= 2)", () => {
    const snap = clone();
    snap.rooms = [];
    snap.places = [];
    snap.reviews = [];
    const slides = buildActiveSlides(snap);
    expect(slides.map((s) => s.kind)).toEqual(["welcome", "goodToKnow"]);
  });
});

describe("snapshotImageUrls", () => {
  it("collects every room, place, logo, and message image once", () => {
    const snap = clone();
    snap.settings.logoUrl = "/media/logo.png";
    snap.message = {
      id: "m1",
      kicker: "Welcome back",
      name: "Mr Okafor",
      body: "x",
      imageUrl: "/media/msg.jpg",
      startAt: 0,
      durationMs: 12000,
    };
    snap.rooms[0].photoUrls = ["/dup.jpg"];
    snap.places[0].photoUrls = ["/dup.jpg"];
    const urls = snapshotImageUrls(snap);
    expect(urls.filter((u) => u === "/dup.jpg").length).toBe(1);
    expect(urls).toContain("/media/logo.png");
    expect(urls).toContain("/media/msg.jpg");
  });
});
