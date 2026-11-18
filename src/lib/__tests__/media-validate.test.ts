import { describe, expect, it } from "vitest";
import {
  LOGO_MAX_BYTES,
  PHOTO_MAX_BYTES,
  validateMediaBytes,
} from "../../server/media";

const te = new TextEncoder();
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 1]);

describe("validateMediaBytes", () => {
  it("accepts a JPEG photo and rejects disguised executables", () => {
    expect(validateMediaBytes("photo", JPEG)).toMatchObject({ ext: "jpg" });
    const exe = te.encode("MZ\x90\x00this-is-not-an-image");
    expect(validateMediaBytes("photo", exe)).toMatchObject({
      error: expect.stringMatching(/JPEG/),
    });
    expect(validateMediaBytes("photo", PNG)).toMatchObject({
      error: expect.stringMatching(/JPEG/),
    });
  });

  it("enforces the 2MB photo cap", () => {
    const big = new Uint8Array(PHOTO_MAX_BYTES + 1);
    big.set([0xff, 0xd8, 0xff]);
    expect(validateMediaBytes("photo", big)).toMatchObject({
      error: expect.stringMatching(/2 MB/),
    });
  });

  it("accepts PNG and SVG logos, rejects JPEG-as-logo", () => {
    expect(validateMediaBytes("logo", PNG)).toMatchObject({ ext: "png" });
    expect(
      validateMediaBytes("logo", te.encode('<svg xmlns="x"></svg>')),
    ).toMatchObject({ ext: "svg" });
    expect(
      validateMediaBytes(
        "logo",
        te.encode('<?xml version="1.0"?><svg></svg>'),
      ),
    ).toMatchObject({ ext: "svg" });
    expect(validateMediaBytes("logo", JPEG)).toMatchObject({
      error: expect.stringMatching(/PNG or SVG/),
    });
  });

  it("enforces the 512KB logo cap and rejects empty files", () => {
    const big = new Uint8Array(LOGO_MAX_BYTES + 1);
    big.set([0x89, 0x50, 0x4e, 0x47]);
    expect(validateMediaBytes("logo", big)).toMatchObject({
      error: expect.stringMatching(/512 KB/),
    });
    expect(validateMediaBytes("photo", new Uint8Array(0))).toMatchObject({
      error: "empty file",
    });
  });
});
