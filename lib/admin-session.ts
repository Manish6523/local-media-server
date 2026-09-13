import { createHmac, timingSafeEqual } from "crypto";
import { getConfig, getPinEnabled } from "./db";

export function adminToken(expires: string): string {
  return createHmac("sha256", getConfig("admin_pin_hash") || "").update(expires).digest("hex");
}

export function isAdmin(request: Request): boolean {
  if (!getPinEnabled()) return true;
  const token = request.headers.get("cookie")?.split("; ").find(c => c.startsWith("vidlock_admin="))?.split("=")[1];
  if (!token) return false;
  const [expires, signature] = token.split(".");
  if (!signature || Number(expires) <= Date.now()) return false;
  const expected = Buffer.from(adminToken(expires));
  const actual = Buffer.from(signature);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
