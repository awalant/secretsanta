import test from "node:test";
import assert from "node:assert/strict";
import { makePin, checkPin, validPin } from "../src/pin.ts";
test("correct PIN accepted, wrong rejected, PIN not stored in clear", async () => {
  const r = await makePin("1234");
  assert.ok(await checkPin("1234", r)); assert.ok(!(await checkPin("1235", r)));
  assert.ok(!JSON.stringify(r).includes("1234"));
});
test("same PIN gets different salts and hashes", async () => {
  const a = await makePin("4321"), b = await makePin("4321");
  assert.notEqual(a.salt, b.salt); assert.notEqual(a.hash, b.hash);
});
test("PIN format", () => {
  assert.ok(validPin("1234") && validPin("12345678")); assert.ok(!validPin("123") && !validPin("12a4") && !validPin("123456789"));
 
});
import { report, progress } from "../src/tracking.ts";
import { decode, encode } from "../src/link.ts";
test("tracking sends only ids and flags, and fails silently", async () => {
  let seen = ""; const ok = (async (u: string, o: any) => { seen = u + (o?.body ?? ""); return { ok: true, json: async () => ({ t1: { revealed: true } }) }; }) as any;
  assert.equal(await report("e1", "t1", { revealed: true }, "https://x.firebaseio.com", ok), true);
  assert.match(seen, /exchanges\/e1\/t1\.json/); assert.ok(!/name/i.test(seen));
  assert.deepEqual(await progress("e1", "https://x.firebaseio.com", ok), { t1: { revealed: true } });
  const bad = (async () => { throw new Error("offline"); }) as any;
  assert.equal(await report("e", "t", {}, "https://x", bad), false); assert.equal(await progress("e", "https://x", bad), null);
  assert.equal(await report("e", "t", {}, ""), false);
});
test("links carry optional exchange id and token", () => {
  const p = { x: "y", names: ["A", "B"], me: 0, to: 1, e: "abc", t: "def" }; assert.deepEqual(decode(encode(p)), p);
});
