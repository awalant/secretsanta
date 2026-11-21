import { FIREBASE_URL } from "./config";
export type Status = { revealed?: boolean; acknowledged?: boolean; at?: number };
type F = typeof fetch;
const url = (base: string, e: string, t?: string) => `${base.replace(/\/$/, "")}/exchanges/${e}${t ? "/" + t : ""}.json`;
export const enabled = (base = FIREBASE_URL) => !!base;
/** Stores only random ids and true/false flags, never names or assignments. Fails silently. */
export async function report(e: string, t: string, patch: Status, base = FIREBASE_URL, f: F = fetch): Promise<boolean> {
  if (!base) return false;
  try { return (await f(url(base, e, t), { method: "PATCH", body: JSON.stringify({ ...patch, at: Date.now() }) })).ok; } catch { return false; }
}
export async function progress(e: string, base = FIREBASE_URL, f: F = fetch): Promise<Record<string, Status> | null> {
  if (!base) return null;
  try { const r = await f(url(base, e)); return r.ok ? ((await r.json()) ?? {}) : null; } catch { return null; }
}
