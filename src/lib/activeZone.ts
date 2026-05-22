import type { Zone } from "@prisma/client";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { MULTI_ZONE_ENABLED, getPrimaryShopZone } from "@/lib/multiZone";
import { prisma } from "./prisma";
import { sessionCookieSecure } from "./sessionCookie";

export const ACTIVE_ZONE_COOKIE = "ss_active_zone_id";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 14;

/** Только чтение cookie (без fallback). */
async function getActiveZoneIdFromCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(ACTIVE_ZONE_COOKIE)?.value?.trim();
  if (!raw) return null;
  const zone = await prisma.zone.findFirst({ where: { id: raw, isActive: true }, select: { id: true } });
  return zone?.id ?? null;
}

/** Эффективная активная точка: cookie или единственная точка в режиме одного магазина. */
export async function getActiveZoneId(): Promise<string | null> {
  const fromCookie = await getActiveZoneIdFromCookie();
  if (fromCookie) return fromCookie;

  if (!MULTI_ZONE_ENABLED) {
    const primary = await getPrimaryShopZone();
    return primary?.id ?? null;
  }

  return null;
}

/** Только Server Action / Route Handler. */
export async function setActiveZoneId(zoneId: string) {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ZONE_COOKIE, zoneId, {
    httpOnly: true,
    sameSite: "lax",
    secure: sessionCookieSecure(),
    path: "/",
    maxAge: COOKIE_MAX_AGE
  });
}

/** Только Server Action / Route Handler. */
export async function clearActiveZoneId() {
  const cookieStore = await cookies();
  cookieStore.delete(ACTIVE_ZONE_COOKIE);
}

export async function requireActiveZone(): Promise<Zone> {
  if (!MULTI_ZONE_ENABLED) {
    const zone = await getPrimaryShopZone();
    if (!zone) redirect("/select-point");
    return zone;
  }

  const zoneId = await getActiveZoneIdFromCookie();
  if (!zoneId) redirect("/select-point");
  const zone = await prisma.zone.findFirst({ where: { id: zoneId, isActive: true } });
  if (!zone) redirect("/select-point");
  return zone;
}

export async function requireActiveZoneId(): Promise<string> {
  const zone = await requireActiveZone();
  return zone.id;
}
