import { createHmac, timingSafeEqual } from "node:crypto";
export function verifySgiPaylinkRequest(body: string, timestamp: string | null, signature: string | null, secret: string, now = Date.now(), mode: "sandbox" | "live_pilot" = "sandbox") {
  if (!/^[A-Za-z0-9+/]{43}=$/.test(secret) || Buffer.from(secret, "base64").length !== 32 || !timestamp || !/^\d{13}$/.test(timestamp) || Math.abs(now - Number(timestamp)) > 60000 || !signature || !/^[a-f0-9]{64}$/.test(signature)) return false;
  const expected = createHmac("sha256", Buffer.from(secret, "base64")).update(`sgi-paylinks-${mode}-v1\n${timestamp}\n${body}`).digest();
  return timingSafeEqual(expected, Buffer.from(signature, "hex"));
}
