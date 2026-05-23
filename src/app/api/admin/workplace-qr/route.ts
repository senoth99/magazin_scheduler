import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRoleApi } from "@/lib/auth";
import { UserRole } from "@/lib/enums";
import { prisma } from "@/lib/prisma";
import { ensureZoneCheckInToken, getZoneCheckInUrl } from "@/lib/workplaceQr";
import { renderCheckInQrPng, safeQrFileName } from "@/lib/workplaceQrImage";

export async function GET(req: Request) {
  const auth = await requireRoleApi([UserRole.ADMIN, UserRole.SUPER_ADMIN]);
  if (!auth.ok) return auth.response;

  const zoneId = z.string().cuid().safeParse(new URL(req.url).searchParams.get("zoneId"));
  if (!zoneId.success) {
    return NextResponse.json({ error: "invalid_zone_id" }, { status: 400 });
  }

  let zone: { id: string; name: string; isActive: boolean } | null;
  try {
    zone = await prisma.zone.findUnique({
      where: { id: zoneId.data },
      select: { id: true, name: true, isActive: true }
    });
  } catch (e) {
    console.error("[api/admin/workplace-qr GET] zone lookup", e);
    return NextResponse.json({ error: "database_unavailable" }, { status: 503 });
  }

  if (!zone?.isActive) {
    return NextResponse.json({ error: "zone_not_found" }, { status: 404 });
  }

  let token: string;
  try {
    token = await ensureZoneCheckInToken(zone.id);
  } catch (e) {
    console.error("[api/admin/workplace-qr GET] token", e);
    return NextResponse.json({ error: "token_unavailable" }, { status: 503 });
  }

  const url = getZoneCheckInUrl(token);

  let png: Buffer;
  try {
    png = await renderCheckInQrPng(url);
  } catch (e) {
    console.error("[api/admin/workplace-qr GET] render", e);
    return NextResponse.json({ error: "qr_render_failed" }, { status: 503 });
  }

  const safeName = safeQrFileName(zone.name);

  return new NextResponse(new Uint8Array(png), {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `inline; filename="qr-${safeName}.png"`,
      "Cache-Control": "private, no-store"
    }
  });
}
