import type { Zone } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** Включить выбор точек, привязки сотрудников и админку нескольких магазинов. */
export const MULTI_ZONE_ENABLED = false;

export async function getPrimaryShopZone(): Promise<Zone | null> {
  return prisma.zone.findFirst({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
  });
}
