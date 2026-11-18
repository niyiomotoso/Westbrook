/**
 * Admin-browser image pipeline (plan KTD): the browser does the resize —
 * Workers' 10ms CPU budget cannot decode images. Cover-crop to 9:16 at
 * ≤1080×1920, JPEG q0.85, EXIF orientation baked in via createImageBitmap.
 */

export const TARGET_W = 1080;
export const TARGET_H = 1920;
export const JPEG_QUALITY = 0.85;

export interface CropPlan {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  outW: number;
  outH: number;
}

/** Pure: centered 9:16 cover-crop plan, output capped at 1080×1920. */
export function planCoverCrop(srcW: number, srcH: number): CropPlan {
  const targetAspect = TARGET_W / TARGET_H;
  let sw = srcW;
  let sh = srcH;
  if (srcW / srcH > targetAspect) {
    sw = Math.round(srcH * targetAspect);
  } else {
    sh = Math.round(srcW / targetAspect);
  }
  const sx = Math.round((srcW - sw) / 2);
  const sy = Math.round((srcH - sh) / 2);
  const scale = Math.min(1, TARGET_W / sw);
  const outW = Math.round(sw * scale);
  const outH = Math.round(sh * scale);
  return { sx, sy, sw, sh, outW, outH };
}

/** Pure: upload warnings per R19. */
export function uploadWarnings(srcW: number, srcH: number): string[] {
  const warnings: string[] = [];
  if (srcW > srcH) {
    warnings.push(
      "This photo is landscape — the sides will be cropped away on the portrait screens.",
    );
  }
  if (srcW < TARGET_W) {
    warnings.push(
      `This photo is only ${srcW}px wide (1080px is ideal) — it may look soft on the screens.`,
    );
  }
  return warnings;
}

export interface ResizedUpload {
  blob: Blob;
  width: number;
  height: number;
  warnings: string[];
}

/** Browser-only: decode → cover-crop → JPEG blob. */
export async function resizeForWall(file: File): Promise<ResizedUpload> {
  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  });
  try {
    const plan = planCoverCrop(bitmap.width, bitmap.height);
    const canvas = new OffscreenCanvas(plan.outW, plan.outH);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no 2d context");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(
      bitmap,
      plan.sx,
      plan.sy,
      plan.sw,
      plan.sh,
      0,
      0,
      plan.outW,
      plan.outH,
    );
    const blob = await canvas.convertToBlob({
      type: "image/jpeg",
      quality: JPEG_QUALITY,
    });
    return {
      blob,
      width: plan.outW,
      height: plan.outH,
      warnings: uploadWarnings(bitmap.width, bitmap.height),
    };
  } finally {
    bitmap.close();
  }
}
