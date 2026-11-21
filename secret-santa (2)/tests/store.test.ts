import test from "node:test";
import assert from "node:assert/strict";
import { migrate, addExchange, resetDraw, validateImport, blank } from "../src/store.ts";
import { encode } from "../src/link.ts";
const link = encode({ x: "y", names: ["A", "B"], me: 0, to: 1 });
const withDraw = () => { const d = migrate({ x: "2026", names: "A\nB", rules: "A !! B", links: [link, link] }); return d; };
test("old single-exchange data migrates without loss", () => {
  const d = withDraw(); assert.equal(d.exchanges.length, 1); assert.equal(d.exchanges[0].links.length, 2); assert.equal(migrate(null).exchanges.length, 1);
});
test("new year copies people and rules, never the draw, and keeps history", () => {
  const d = withDraw(), n = addExchange(d, "2027", d.current);
  assert.equal(n.exchanges.length, 2); assert.deepEqual(n.exchanges[0], d.exchanges[0]);
  const c = n.exchanges.find(e => e.id === n.current)!; assert.equal(c.names, "A\nB"); assert.equal(c.rules, "A !! B"); assert.deepEqual(c.links, []);
  assert.deepEqual(addExchange(d, "blank").exchanges[1].names, "");
});
test("reset clears only the chosen draw", () => {
  const n = addExchange(withDraw(), "2027"), old = n.exchanges[0];
  n.exchanges[1].links = [link, link];
  const r = resetDraw(n, n.current);
  assert.deepEqual(r.exchanges[1].links, []); assert.equal(r.exchanges[1].names, n.exchanges[1].names); assert.deepEqual(r.exchanges[0], old);
});
test("backup round-trips through JSON and validates", () => {
  const d = addExchange(withDraw(), "2027"), back = validateImport(JSON.parse(JSON.stringify(d)));
  assert.deepEqual(back, d);
});
test("bad or incompatible backups are rejected with a reason", () => {
  const d = withDraw();
  for (const bad of [null, "x", { v: 1 }, { ...d, exchanges: [] }, { ...d, current: "nope" },
    { ...d, exchanges: [{ ...d.exchanges[0], links: ["garbage"] }] }, { ...d, exchanges: [{ ...d.exchanges[0], names: 5 }] },
    { ...d, exchanges: [d.exchanges[0], d.exchanges[0]] }]) assert.equal(typeof validateImport(bad), "string");
  assert.ok(blank("z").id.length > 6);
});
