import { decode } from "./link";
export type Exchange = { id: string; x: string; names: string; rules: string; links: string[]; created: number };
export type Data = { v: 2; current: string; exchanges: Exchange[] };
const rid = () => [...crypto.getRandomValues(new Uint8Array(6))].map(b => b.toString(16).padStart(2, "0")).join("");
export const blank = (x: string, names = "", rules = ""): Exchange => ({ id: rid(), x, names, rules, links: [], created: Date.now() });
/** Accepts saved v2 data, the old single-exchange (v1) shape, or nothing. */
export function migrate(raw: any): Data {
  if (raw?.v === 2 && Array.isArray(raw.exchanges) && raw.exchanges.length) return raw as Data;
  const e = blank(raw?.x ?? String(new Date().getFullYear()), raw?.names ?? "", raw?.rules ?? "");
  e.links = Array.isArray(raw?.links) ? raw.links : [];
  return { v: 2, current: e.id, exchanges: [e] };
}
/** New exchange; optionally copies participants and rules (never the draw) from another. Old ones are untouched. */
export function addExchange(d: Data, x: string, copyFrom?: string): Data {
  const src = d.exchanges.find(e => e.id === copyFrom), e = blank(x, src?.names, src?.rules);
  return { ...d, current: e.id, exchanges: [...d.exchanges, e] };
}
/** Clears only this exchange's draw; people, rules and other years stay. */
export function resetDraw(d: Data, id: string): Data {
  return { ...d, exchanges: d.exchanges.map(e => (e.id === id ? { ...e, links: [] } : e)) };
}
/** Returns validated data, or a plain-English reason it was rejected. */
export function validateImport(raw: any): Data | string {
  if (!raw || typeof raw !== "object") return "This isn't a Secret Santa backup.";
  if (raw.v !== 2) return "This backup is from an incompatible version.";
  if (!Array.isArray(raw.exchanges) || !raw.exchanges.length) return "The backup has no exchanges.";
  const ids = new Set<string>();
  for (const e of raw.exchanges) {
    if (!e || typeof e.id !== "string" || typeof e.x !== "string" || typeof e.names !== "string" || typeof e.rules !== "string" || !Array.isArray(e.links) || typeof e.created !== "number")
      return "An exchange in the backup is malformed.";
    if (ids.has(e.id)) return "The backup contains a duplicate exchange.";
    ids.add(e.id);
    if (e.links.some((l: unknown) => typeof l !== "string" || !decode(l))) return `Exchange "${e.x}" contains a damaged link.`;
  }
  if (!ids.has(raw.current)) return "The backup's current exchange is missing.";
  return raw as Data;
}
