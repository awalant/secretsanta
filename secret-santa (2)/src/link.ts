export type Payload = { x: string; names: string[]; me: number; to: number; e?: string; t?: string };
const b64 = (s: string) => btoa(String.fromCharCode(...new TextEncoder().encode(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64 = (s: string) => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0)));
export const encode = (p: Payload) => b64(JSON.stringify(p));
export function decode(s: string): Payload | null {
  try {
    const p = JSON.parse(unb64(s));
    const ok = typeof p.x === "string" && Array.isArray(p.names) && p.names.every((n: unknown) => typeof n === "string") &&
      Number.isInteger(p.me) && Number.isInteger(p.to) && p.me !== p.to && (p.e === undefined || typeof p.e === "string") && (p.t === undefined || typeof p.t === "string") &&
      p.me >= 0 && p.to >= 0 && p.me < p.names.length && p.to < p.names.length;
    return ok ? p : null;
  } catch { return null; }
}
