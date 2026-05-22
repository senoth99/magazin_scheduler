import type { Zone } from "@prisma/client";
import { getActiveZoneId } from "./activeZone";
import { UserRole } from "./enums";
import { MULTI_ZONE_ENABLED, getPrimaryShopZone } from "./multiZone";
import { prisma } from "./prisma";

export async function getAccessibleZonesForUser(user: { id: string; role: string }): Promise<Zone[]> {
  if (!MULTI_ZONE_ENABLED) {
    const primary = await getPrimaryShopZone();
    return primary ? [primary] : [];
  }

  if (user.role === UserRole.SUPER_ADMIN || user.role === UserRole.ADMIN) {
    return prisma.zone.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
    });
  }

  const rows = await prisma.userZone.findMany({
    where: { userId: user.id, zone: { isActive: true } },
    include: { zone: true },
    orderBy: { zone: { sortOrder: "asc" } }
  });
  return rows.map((r) => r.zone);
}

export type ResolveActiveZoneResult =
  | { needsSelection: false; zone: Zone }
  | { needsSelection: true };

/** Без записи cookie — только для RSC / server actions чтения. */
export async function resolveActiveZoneForUser(user: {
  id: string;
  role: string;
}): Promise<ResolveActiveZoneResult | null> {
  if (!MULTI_ZONE_ENABLED) {
    const zone = await getPrimaryShopZone();
    if (!zone) return null;
    return { needsSelection: false, zone };
  }

  const accessible = await getAccessibleZonesForUser(user);
  if (accessible.length === 0) return null;

  if (accessible.length === 1) {
    return { needsSelection: false, zone: accessible[0] };
  }

  const cookieId = await getActiveZoneId();
  if (cookieId) {
    const zone = accessible.find((z) => z.id === cookieId);
    if (zone) return { needsSelection: false, zone };
  }

  return { needsSelection: true };
}
