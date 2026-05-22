import QRCode from "qrcode";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRoleApi } from "@/lib/auth";
import { UserRole } from "@/lib/enums";
import { prisma } from "@/lib/prisma";
import { ensureZoneCheckInToken, getZoneCheckInUrl } from "@/lib/workplaceQr";

export async function GET(req: Request) {
  const auth = await requireRoleApi([UserRole.ADMIN, UserRole.SUPER_ADMIN]);
  if (!auth.ok) return auth.response;

  const zoneId = z.string().cuid().safeParse(new URL(req.url).searchParams.get("zoneId"));
  if (!zoneId.success) {
    return NextResponse.json({ error: "invalid_zone_id" }, { status: 400 });
  }

  try {
    const zone = await prisma.zone.findUnique({
      where: { id: zoneId.data },
      select: { id: true, name: true, isActive: true }
    });
    if (!zone?.isActive) {
      return NextResponse.json({ error: "zone_not_found" }, { status: 404 });
    }

    const token = await ensureZoneCheckInToken(zone.id);
    const url = getZoneCheckInUrl(token);
    const png = await QRCode.toBuffer(url, { type: "png", margin: 2, width: 512 });
    const safeName = zone.name.replace(/[^\p{L}\p{N}\-_]+/gu, "-").slice(0, 40) || "point";

    return new NextResponse(new Uint8Array(png), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="qr-${safeName}.png"`,
        "Cache-Control": "private, no-store"
      }
    });
  } catch (e) {
    console.error("[api/admin/workplace-qr GET]", e);
    return NextResponse.json({ error: "qr_unavailable" }, { status: 503 });
  }
}
