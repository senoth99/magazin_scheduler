"use client";

type ZoneRow = {
  id: string;
  name: string;
};

export function AdminZoneQrList({ zones }: { zones: ZoneRow[] }) {
  if (zones.length === 0) {
    return <p className="text-sm text-muted">Нет активных точек. Создайте их в разделе «Офлайн-точки».</p>;
  }

  return (
    <ul className="space-y-3">
      {zones.map((zone) => {
        const href = `/api/admin/workplace-qr?zoneId=${encodeURIComponent(zone.id)}`;
        const fileName = `qr-${zone.name.replace(/[^\p{L}\p{N}\-_]+/gu, "-") || "point"}.png`;
        return (
          <li
            key={zone.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card/40 px-3 py-3"
          >
            <span className="text-sm font-semibold">{zone.name}</span>
            <a
              href={href}
              download={fileName}
              className="btn-secondary inline-flex min-h-10 shrink-0 items-center justify-center touch-manipulation px-4 text-[11px]"
            >
              Скачать QR
            </a>
          </li>
        );
      })}
    </ul>
  );
}
