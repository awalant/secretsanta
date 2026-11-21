import { generate, validate, diagnose, Person, Rule } from "./engine";
import { encode, decode } from "./link";
import { makePin, checkPin, validPin, PinRec } from "./pin";
import { enabled, report, progress } from "./tracking";
import { Data, migrate, addExchange, resetDraw, validateImport } from "./store";
const app = document.getElementById("app")!;
const esc = (s: string) => s.replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
const KEY = "santa-organizer-v1", PK = "santa-pin-v1";
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const rid = () => [...crypto.getRandomValues(new Uint8Array(12))].map(b => b.toString(16).padStart(2, "0")).join("");
const DK = "santa-data-v2";
const load = (): Data => migrate(JSON.parse(localStorage.getItem(DK) || "null") ?? JSON.parse(localStorage.getItem(KEY) || "null"));
const save = (d: Data) => localStorage.setItem(DK, JSON.stringify(d));
const base = () => location.href.split("#")[0];

function organizer() {
  const data = load(), saved = data.exchanges.find(e => e.id === data.current)!; save(data);
  app.innerHTML = `<h1>Secret Santa — Organizer</h1>
  <label>Exchange<select id="sw" style="width:100%;font:inherit;padding:10px">${data.exchanges.map(e => `<option value="${e.id}"${e.id === data.current ? " selected" : ""}>${esc(e.x)}</option>`).join("")}</select></label>
  <button id="nb">New exchange</button><button id="nc">New, copy people &amp; rules</button><button id="rs" class="alt">Reset this draw</button>
  <label>Exchange name<input id="x" value="${esc(saved.x)}"></label>
  <label>Participants (one per line)<textarea id="n" rows="8">${esc(saved.names)}</textarea></label>
  <label>Rules, one per line: <code>Ann !> Bo</code> (Ann can't draw Bo) or <code>Ann !! Bo</code> (neither can draw the other)
  <textarea id="r" rows="5">${esc(saved.rules)}</textarea></label>
  <p id="warn" class="err" role="status"></p>
  <button id="g">Generate draw</button><button id="v" class="alt">Verify</button><button id="pg">Check progress</button><div id="prog"></div>
  <p id="msg" role="status"></p><div id="links"></div>
  <h2>Backup</h2><button id="xp">Export backup (JSON)</button><label>Import backup<input id="im" type="file" accept=".json,application/json"></label>
  <p class="note">A backup contains every draw, so keep the file private and don't open it if you want to stay blind.</p>
  <h2>Organizer PIN</h2><label>${localStorage.getItem(PK) ? "New PIN (4–8 digits)" : "Set a PIN (4–8 digits)"}<input id="np" type="password" inputmode="numeric" autocomplete="off"></label>
  <button id="sp">Save PIN</button>${localStorage.getItem(PK) ? '<button id="lk" class="alt">Lock now</button><button id="rp" class="alt">Remove PIN</button>' : ""}
  <p class="note">Assignments are never shown here. Each link contains one person's result; send it privately. Browser storage is not a secure vault.</p>`;
  const $ = (id: string) => document.getElementById(id) as HTMLInputElement;
  const msg = (t: string, c = "") => { $("msg").className = c; $("msg").textContent = t; };
  const parse = () => {
    const names = $("n").value.split("\n").map(s => s.trim()).filter(Boolean);
    const people: Person[] = names.map((name, i) => ({ id: "p" + i, name }));
    const bad: string[] = []; const rules: Rule[] = [];
    if (new Set(names.map(n => n.toLowerCase())).size !== names.length) bad.push("Duplicate names are not allowed.");
    for (const line of $("r").value.split("\n").map(s => s.trim()).filter(Boolean)) {
      const m = line.match(/^(.+?)\s*(!>|!!)\s*(.+)$/), a = people.find(p => p.name === m?.[1].trim()), b = people.find(p => p.name === m?.[3].trim());
      if (!m || !a || !b) { bad.push(`Can't read rule: ${line}`); continue; }
      rules.push({ giver: a.id, cannot: b.id }); if (m[2] === "!!") rules.push({ giver: b.id, cannot: a.id });
    }
    return { names, people, rules, bad };
  };
  const show = (links: string[], names: string[]) => {
    $("links").innerHTML = links.map((l, i) => `<div class="row"><span>${esc(names[i])}</span><button data-i="${i}">Copy link</button></div>`).join("");
    $("links").onclick = e => { const i = (e.target as HTMLElement).dataset.i; if (i) navigator.clipboard.writeText(base() + "#/d/" + links[+i]).then(() => msg(`Link for ${names[+i]} copied.`, "ok")); };
  };
  const persist = (links: string[]) => { Object.assign(saved, { x: $("x").value, names: $("n").value, rules: $("r").value, links }); save(data); };
  if (saved.links.length) show(saved.links, saved.names.split("\n").map((s: string) => s.trim()).filter(Boolean));
  $("g").onclick = () => {
    if (saved.links.length && !confirm("A draw already exists. Generating again replaces it, and links already sent will be out of date. Continue?")) return;
    const { names, people, rules, bad } = parse();
    if (bad.length) return msg(bad.join(" "), "err");
    const a = generate(people, rules);
    if (!a) return msg("No valid draw exists. " + diagnose(people, rules).join(" "), "err");
    const idx = (id: string) => people.findIndex(p => p.id === id);
    const e = rid(), links = people.map((p, i) => encode({ x: $("x").value, names, me: i, to: idx(a[p.id]), e, t: rid() }));
    saved.links = links; persist(links); show(links, names); msg(`Draw created for ${names.length} people. Results are hidden.`, "ok");
  };
  const warn = (src: "n" | "r") => {
    const first = decode(saved.links[0] || ""); if (!first) return void ($("warn").textContent = "");
    const was = first.names, now = $("n").value.split("\n").map(s => s.trim()).filter(Boolean), add = now.filter(n => !was.includes(n)), rem = was.filter(n => !now.includes(n));
    const parts = [src === "r" ? "Rules changed after the draw was made. Press Verify to see if it still follows them." : ""];
    if (add.length) parts.push(`Added after the draw: ${add.join(", ")}. They have no link yet.`);
    if (rem.length) parts.push(`Removed after the draw: ${rem.join(", ")}. Their link still exists, and someone is still assigned to them.`);
    if (add.length || rem.length) parts.push("Generate a new draw to fix this (it replaces all links).");
    $("warn").textContent = parts.filter(Boolean).join(" ");
  };
  $("n").oninput = () => warn("n"); $("r").oninput = () => warn("r");
  const sync = () => persist(saved.links);
  $("sw").onchange = () => { sync(); data.current = $("sw").value; save(data); organizer(); };
  const mk = (copy: boolean) => {
    sync(); const name = prompt("Name for the new exchange?", String(new Date().getFullYear() + 1))?.trim();
    if (!name) return; if (data.exchanges.some(e => e.x === name)) return msg("An exchange with that name already exists.", "err");
    save(addExchange(data, name, copy ? saved.id : undefined)); organizer();
  };
  $("nb").onclick = () => mk(false); $("nc").onclick = () => mk(true);
  $("rs").onclick = () => {
    sync(); if (!saved.links.length) return msg("Nothing to reset: no draw yet.", "err");
    if (confirm(`Reset "${saved.x}"? Its draw is deleted and links already sent will no longer match. People and rules are kept, and other years are untouched.`)) { save(resetDraw(data, saved.id)); organizer(); }
  };
  $("xp").onclick = () => {
    sync(); const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 1)], { type: "application/json" }));
    a.download = `santa-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click(); msg("Backup downloaded. Keep it private.", "ok");
  };
  $("im").onchange = async () => {
    const f = $("im").files?.[0]; if (!f) return; let r: Data | string;
    try { r = validateImport(JSON.parse(await f.text())); } catch { r = "That file isn't valid JSON."; }
    if (typeof r === "string") return msg("Import rejected: " + r, "err");
    if (confirm(`Replace ALL current data (${data.exchanges.length} exchange(s)) with this backup (${r.exchanges.length})? This can't be undone.`)) { save(r); organizer(); }
  };
  $("pg").onclick = async () => {
    const ps = (saved.links as string[]).map(decode), e = ps[0]?.e;
    if (!e || !enabled()) return msg("Progress tracking isn't set up (see README), or no draw exists yet.", "err");
    const s = await progress(e); if (!s) return msg("Couldn't reach the progress service.", "err");
    const row = (p: NonNullable<typeof ps[0]>) => { const st = s[p.t || ""] || {}; return `<div class="row"><span>${esc(p.names[p.me])}</span><span>${st.acknowledged ? "confirmed ✓" : st.revealed ? "revealed" : "not yet"}</span></div>`; };
    const list = ps.filter(Boolean) as NonNullable<typeof ps[0]>[];
    $("prog").innerHTML = `<p>${list.filter(p => s[p.t || ""]?.revealed).length} of ${list.length} revealed, ${list.filter(p => s[p.t || ""]?.acknowledged).length} confirmed.</p>` + list.map(row).join("");
  };
  $("sp").onclick = async () => {
    if (!validPin($("np").value)) return msg("PIN must be 4–8 digits.", "err");
    localStorage.setItem(PK, JSON.stringify(await makePin($("np").value))); sessionStorage.setItem("santa-unlocked", "1"); organizer();
  };
  if ($("rp")) $("rp").onclick = () => { if (confirm("Remove the PIN? Anyone using this browser can then open the organizer.")) { localStorage.removeItem(PK); organizer(); } };
  if ($("lk")) $("lk").onclick = () => { sessionStorage.removeItem("santa-unlocked"); gate(); };
  $("v").onclick = () => {
    const { names, people, rules, bad } = parse(); if (bad.length) return msg(bad.join(" "), "err");
    const a: Record<string, string> = {};
    const ps = (saved.links as string[]).map(decode);
    if (!ps.length || ps.some(p => !p) || ps.length !== names.length) return msg("No matching draw. Participants changed, so regenerate.", "err");
    ps.forEach(p => { a["p" + p!.me] = "p" + p!.to; });
    const errs = validate(people, rules, a);
    msg(errs.length ? "Problems: " + errs.join("; ") : `All ${names.length} assignments are valid and follow every rule.`, errs.length ? "err" : "ok");
  };
}

function draw(token: string) {
  const p = decode(token);
  if (!p) { app.innerHTML = `<h1>Secret Santa</h1><p class="err">This link is damaged or incomplete. Ask the organizer to resend it.</p>`; return; }
  const n = p.names.length, seg = 360 / n, R = 200, pt = (a: number) => `${R + R * Math.sin(a * Math.PI / 180)},${R - R * Math.cos(a * Math.PI / 180)}`;
  const cols = ["#a3262a", "#1f5d46", "#8a6414", "#5b1f2e"], fs = n > 10 ? 13 : n > 7 ? 15 : 17, cut = (s: string) => (s.length > 11 ? s.slice(0, 10) + "…" : s);
  const slices = p.names.map((nm, i) => {
    const a0 = i * seg - seg / 2, a1 = a0 + seg, label = i * seg;
    return `<path id="s${i}" d="M${R},${R} L${pt(a0)} A${R},${R} 0 0 1 ${pt(a1)} Z" fill="${cols[i % 4]}" stroke="#fbf4ea" stroke-width="2"/>
    <text x="${R}" y="${R - 90}" fill="#fff" font-size="${fs}" font-weight="600" text-anchor="middle" transform="rotate(${label} ${R} ${R})">${esc(cut(nm))}</text>`;
  }).join("");
  const seen = localStorage.getItem("seen-" + token) === "1";
  app.innerHTML = `<h1>Hello, ${esc(p.names[p.me])}</h1><p>${esc(p.x)} Secret Santa. Make sure nobody is looking over your shoulder.</p>
  <svg class="wheel" viewBox="-8 -8 416 416" role="img" aria-label="Wheel of names"><g id="w">${slices}</g><circle cx="200" cy="200" r="198" fill="none" stroke="#b98a2c" stroke-width="5"/><circle cx="200" cy="200" r="20" fill="#fbf4ea" stroke="#b98a2c" stroke-width="3"/><path d="M188,-2 L212,-2 L200,36Z" fill="#fbf4ea" stroke="#b98a2c" stroke-width="3" stroke-linejoin="round"/></svg>
  <div style="text-align:center"><button id="go">${seen ? "Show my person again" : "Reveal my person"}</button></div><p id="res" class="big" role="status" aria-live="polite"></p><div style="text-align:center"><button id="ak" hidden>I've got it ✓</button></div>`;
  const w = document.getElementById("w") as unknown as SVGGElement, res = document.getElementById("res")!;
  const done = () => { (document.getElementById("go") as HTMLButtonElement).textContent = "Revealed"; const hit = document.getElementById("s" + p.to); hit?.setAttribute("stroke", "#f2c14e"); hit?.setAttribute("stroke-width", "7"); res.textContent = `You are giving to ${p.names[p.to]} 🎁`; localStorage.setItem("seen-" + token, "1");
    if (p.e && p.t) { report(p.e, p.t, { revealed: true }); const ak = document.getElementById("ak") as HTMLButtonElement; ak.hidden = false; ak.onclick = () => { report(p.e!, p.t!, { acknowledged: true }); ak.textContent = "Thanks!"; ak.disabled = true; }; } };
  (document.getElementById("go") as HTMLButtonElement).onclick = e => {
    (e.target as HTMLButtonElement).disabled = true; res.textContent = "";
    const target = 360 * 5 - p.to * seg;
    if (reduced) { w.style.transform = `rotate(${-p.to * seg}deg)`; return done(); }
    w.style.transformOrigin = "200px 200px"; w.style.transition = "transform 6s cubic-bezier(.12,.6,.1,1)";
    requestAnimationFrame(() => { w.style.transform = `rotate(${target}deg)`; });
    w.addEventListener("transitionend", done, { once: true });
  };
}
const m = location.hash.match(/^#\/d\/(.+)$/);
function gate() {
  const rec: PinRec | null = JSON.parse(localStorage.getItem(PK) || "null");
  if (!rec || sessionStorage.getItem("santa-unlocked") === "1") return organizer();
  app.innerHTML = `<h1>Organizer locked</h1><label>PIN<input id="p" type="password" inputmode="numeric" autocomplete="off"></label><button id="u">Unlock</button><p id="m" class="err" role="status"></p>
  <p class="note">This is a simple lock to keep casual visitors out of the organizer screens, not strong security.</p>`;
  (document.getElementById("u") as HTMLButtonElement).onclick = async () => {
    if (await checkPin((document.getElementById("p") as HTMLInputElement).value, rec)) { sessionStorage.setItem("santa-unlocked", "1"); return organizer(); }
    document.getElementById("m")!.textContent = "Incorrect PIN.";
  };
}
m ? draw(m[1]) : gate();
addEventListener("hashchange", () => location.reload());
