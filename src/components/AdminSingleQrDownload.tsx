"use client";

export function AdminSingleQrDownload({ zoneId, zoneName }: { zoneId: string; zoneName: string }) {
  const href = `/api/admin/workplace-qr?zoneId=${encodeURIComponent(zoneId)}`;
  const fileName = `qr-${zoneName.replace(/[^\p{L}\p{N}\-_]+/gu, "-") || "shop"}.png`;
  return (
    <a
      href={href}
      download={fileName}
      className="btn-secondary inline-flex min-h-[44px] items-center justify-center touch-manipulation"
    >
      Скачать QR-код
    </a>
  );
}
