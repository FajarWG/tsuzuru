export function formatJPY(amount: number): string {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatIDR(amount: number): string {
  const formatted = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
  // Ensure a space between the symbol "Rp" and the digits: "Rp 1.234.567"
  return formatted.replace(/^Rp/, "Rp ");
}

export function formatInputAmount(value: string | number): string {
  const clean = String(value).replace(/\D/g, "");
  if (!clean) return "";
  return Number(clean).toLocaleString("en-US");
}

export function parseInputAmount(value: string | number): number {
  if (typeof value === "number") return value;
  const clean = value.replace(/[^\d.]/g, "");
  return clean ? parseFloat(clean) : 0;
}
