/**
 * Wi-Fi QR payload per the de-facto convention:
 * WIFI:T:WPA;S:<ssid>;P:<password>;;
 * Special characters \ ; , : " must be backslash-escaped (R7).
 */
export function escapeWifiField(value: string): string {
  return value.replace(/([\\;,:"])/g, "\\$1");
}

export function buildWifiQrPayload(ssid: string, password: string): string {
  return `WIFI:T:WPA;S:${escapeWifiField(ssid)};P:${escapeWifiField(password)};;`;
}
