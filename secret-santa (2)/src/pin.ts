export type PinRec = { salt: string; hash: string };
const hex = (b: ArrayBuffer | Uint8Array) => [...new Uint8Array(b instanceof Uint8Array ? b : b)].map(x => x.toString(16).padStart(2, "0")).join("");
export async function hashPin(pin: string, salt: string): Promise<string> {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveBits"]);
  return hex(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: new TextEncoder().encode(salt), iterations: 200000 }, k, 256));
}
export async function makePin(pin: string): Promise<PinRec> {
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
  return { salt, hash: await hashPin(pin, salt) };
}
export const checkPin = async (pin: string, r: PinRec) => (await hashPin(pin, r.salt)) === r.hash;
export const validPin = (p: string) => /^\d{4,8}$/.test(p);
