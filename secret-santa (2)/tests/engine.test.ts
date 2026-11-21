import test from "node:test";
import assert from "node:assert/strict";
import { generate, validate, diagnose, Person, Rule } from "../src/engine.ts";
import { encode, decode } from "../src/link.ts";
const mk = (n: number): Person[] => Array.from({ length: n }, (_, i) => ({ id: "p" + i, name: "P" + i }));
const P = mk(8);
test("valid, no self, no duplicates (200 runs)", () => {
  for (let i = 0; i < 200; i++) { const a = generate(P, [])!; assert.deepEqual(validate(P, [], a), []); }
});
test("directional exclusion respected, other direction allowed", () => {
  const r: Rule[] = [{ giver: "p0", cannot: "p1" }]; let rev = false;
  for (let i = 0; i < 300; i++) { const a = generate(P, r)!; assert.notEqual(a.p0, "p1"); if (a.p1 === "p0") rev = true; }
  assert.ok(rev);
});
test("mutual and multiple exclusions", () => {
  const r: Rule[] = [["p0","p1"],["p1","p0"],["p0","p2"],["p0","p3"]].map(([giver, cannot]) => ({ giver, cannot }));
  for (let i = 0; i < 200; i++) assert.deepEqual(validate(P, r, generate(P, r)!), []);
});
test("impossible constraints detected and diagnosed", () => {
  const p = mk(3), r: Rule[] = [{ giver: "p0", cannot: "p1" }, { giver: "p0", cannot: "p2" }];
  assert.equal(generate(p, r), null); assert.match(diagnose(p, r)[0], /P0/);
  assert.equal(generate(mk(1), []), null);
});
test("generation is randomized", () => {
  const s = new Set(Array.from({ length: 40 }, () => JSON.stringify(generate(P, []))));
  assert.ok(s.size > 5);
});
test("add/remove participants and rule changes re-validate", () => {
  const a = generate(P, [])!;
  assert.ok(validate(mk(9), [], a).length > 0);
  assert.ok(validate(P.slice(0, 7), [], a).length > 0);
  assert.ok(validate(P, [{ giver: "p0", cannot: a.p0 }], a).length > 0);
});
test("manual change validation catches duplicates", () => {
  const a = generate(P, [])!; a.p0 = a.p1;
  assert.ok(validate(P, [], a).some(e => /more than once/.test(e)));
});
test("links round-trip and reject bad data", () => {
  const p = { x: "2026", names: ["Ann", "Bo é"], me: 0, to: 1 };
  assert.deepEqual(decode(encode(p)), p);
  assert.equal(decode("garbage!"), null);
  assert.equal(decode(encode({ ...p, to: 0 })), null);
  assert.equal(decode(encode({ ...p, to: 5 })), null);
});
