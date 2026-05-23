/** PNG QR для URL check-in (отдельный модуль — qrcode только на сервере). */
export async function renderCheckInQrPng(url: string): Promise<Buffer> {
  const QRCode = (await import("qrcode")).default;
  return QRCode.toBuffer(url, { type: "png", margin: 2, width: 512 });
}

export function safeQrFileName(zoneName: string): string {
  const slug = zoneName
    .trim()
    .replace(/[^\w\u0400-\u04FF-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return slug || "shop";
}
