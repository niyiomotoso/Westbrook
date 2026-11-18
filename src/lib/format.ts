/** "₦45,000" — naira with thousands separators, no decimals (reference). */
export function formatNaira(amount: number): string {
  return `₦${Math.round(amount).toLocaleString("en-NG")}`;
}
