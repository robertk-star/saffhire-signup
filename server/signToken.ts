import { randomBytes, timingSafeEqual } from "crypto";

export function createSignToken() {
  return randomBytes(32).toString("hex");
}

export function tokensMatch(stored: string | null | undefined, provided: string | null | undefined) {
  if (!stored || !provided) return false;
  const left = Buffer.from(stored);
  const right = Buffer.from(provided);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
