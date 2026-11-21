import type { CardAd } from "./ads";

/** JSON shape of a card for the client feed and the mobile API. */
export type CardJSON = Omit<CardAd, "createdAt" | "updatedAt" | "bumpedAt" | "promotedUntil" | "photo" | "search"> & {
  createdAt: string;
  updatedAt: string;
  bumpedAt: string;
  promotedUntil: string | null;
  photo: { id: string; width: number; height: number; blur: string } | null;
};

export function cardJSON(a: CardAd): CardJSON {
  const { search: _s, ...rest } = a;
  void _s;
  return {
    ...rest,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
    bumpedAt: a.bumpedAt.toISOString(),
    promotedUntil: a.promotedUntil?.toISOString() ?? null,
    photo: a.photo ? { id: a.photo.id, width: a.photo.width, height: a.photo.height, blur: a.photo.blur } : null,
  };
}

export function cardFromJSON(j: CardJSON): CardAd {
  return {
    ...j,
    search: null,
    createdAt: new Date(j.createdAt),
    updatedAt: new Date(j.updatedAt),
    bumpedAt: new Date(j.bumpedAt),
    promotedUntil: j.promotedUntil ? new Date(j.promotedUntil) : null,
    photo: j.photo ? { ...j.photo, adId: j.id, userId: j.userId, position: 0, phash: "", createdAt: new Date(0) } : null,
  } as CardAd;
}
