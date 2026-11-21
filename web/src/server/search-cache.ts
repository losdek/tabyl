/**
 * Tiny in-memory cache for search pages. Any write to ads bumps the version,
 * so a cached page is never older than the last change (plus a 30 s TTL).
 */
const g = globalThis as unknown as { __tabylSearch?: { version: number; map: Map<string, { at: number; v: unknown }> } };
const state = (g.__tabylSearch ??= { version: 0, map: new Map() });
const TTL = 30_000;
const MAX = 500;

export function invalidateSearch() {
  state.version++;
  state.map.clear();
}

export async function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  const k = `${state.version}:${key}`;
  const hit = state.map.get(k);
  if (hit && Date.now() - hit.at < TTL) return hit.v as T;
  const v = await load();
  if (state.map.size >= MAX) state.map.delete(state.map.keys().next().value!);
  state.map.set(k, { at: Date.now(), v });
  return v;
}
