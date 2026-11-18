"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { buildWifiQrPayload } from "@/lib/wifi-qr";

/** Good to know page (reference `.info2`): breakfast, checkout, Wi-Fi QR. */
export function GoodToKnowSlide({
  breakfastLine,
  checkoutLine,
  wifiName,
  wifiPassword,
}: {
  breakfastLine: string;
  checkoutLine: string;
  wifiName: string;
  wifiPassword: string;
}) {
  const [qrUrl, setQrUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(buildWifiQrPayload(wifiName, wifiPassword), {
      margin: 1,
      width: 148,
      color: { dark: "#111111", light: "#ffffff" },
    })
      .then((url) => {
        if (!cancelled) setQrUrl(url);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [wifiName, wifiPassword]);

  return (
    <div className="info2">
      <div className="ih">Good to know</div>
      <div className="il">
        <span>Breakfast</span>
        <b>{breakfastLine}</b>
      </div>
      <div className="il">
        <span>Checkout</span>
        <b>{checkoutLine}</b>
      </div>
      <div className="iq">
        {qrUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={qrUrl}
            alt="Wi-Fi QR code"
            width={74}
            height={74}
            style={{ borderRadius: 4, display: "block" }}
          />
        ) : (
          <span style={{ width: 74, height: 74, display: "inline-block" }} />
        )}
        <span>Scan for Wi-Fi</span>
      </div>
    </div>
  );
}
