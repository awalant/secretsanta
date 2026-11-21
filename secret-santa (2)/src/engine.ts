export type Person = { id: string; name: string };
export type Rule = { giver: string; cannot: string }; // directional
export type Assignment = Record<string, string>; // giverId -> recipientId

const rnd = (n: number) => { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % n; };
export function shuffle<T>(a: T[]): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) { const j = rnd(i + 1); [r[i], r[j]] = [r[j], r[i]]; }
  return r;
}
export function allowedMap(people: Person[], rules: Rule[]): Record<string, string[]> {
  const m: Record<string, string[]> = {};
  for (const p of people)
    m[p.id] = people.filter(q => q.id !== p.id && !rules.some(r => r.giver === p.id && r.cannot === q.id)).map(q => q.id);
  return m;
}
/** Randomized backtracking: one complete valid assignment, or null if none exists (exhaustive search). */
export function generate(people: Person[], rules: Rule[]): Assignment | null {
  if (people.length < 2) return null;
  const allowed = allowedMap(people, rules);
  const order = shuffle(people.map(p => p.id)).sort((a, b) => allowed[a].length - allowed[b].length);
  const used = new Set<string>(), out: Assignment = {};
  const go = (i: number): boolean => {
    if (i === order.length) return true;
    const g = order[i];
    for (const r of shuffle(allowed[g])) {
      if (used.has(r)) continue;
      used.add(r); out[g] = r;
      if (go(i + 1)) return true;
      used.delete(r); delete out[g];
    }
    return false;
  };
  return go(0) ? out : null;
}
/** Human-readable problems; empty array = valid. */
export function validate(people: Person[], rules: Rule[], a: Assignment): string[] {
  const errs: string[] = [], ids = new Set(people.map(p => p.id)), seen = new Set<string>();
  const nm = (id: string) => people.find(p => p.id === id)?.name ?? id;
  for (const p of people) {
    const r = a[p.id];
    if (!r || !ids.has(r)) { errs.push(`${p.name} has no valid recipient`); continue; }
    if (r === p.id) errs.push(`${p.name} drew themselves`);
    if (seen.has(r)) errs.push(`${nm(r)} is drawn more than once`);
    seen.add(r);
    if (rules.some(x => x.giver === p.id && x.cannot === r)) errs.push(`${p.name} breaks an exclusion rule`);
  }
  return errs;
}
/** Hall-style check: a group of givers whose combined allowed recipients are fewer than the group. */
export function diagnose(people: Person[], rules: Rule[]): string[] {
  const n = people.length;
  if (n < 2) return ["At least two participants are needed."];
  if (n > 16) return ["Too many participants to diagnose automatically."];
  const al = allowedMap(people, rules);
  let best: { size: number; msg: string } | null = null;
  for (let m = 1; m < 1 << n; m++) {
    const g = people.filter((_, i) => m >> i & 1), u = new Set(g.flatMap(p => al[p.id]));
    if (u.size < g.length && (!best || g.length < best.size))
      best = { size: g.length, msg: `${g.map(p => p.name).join(", ")} can only draw from ${u.size} ${u.size === 1 ? "person" : "people"}.` };
  }
  return best ? [best.msg] : [];
}
