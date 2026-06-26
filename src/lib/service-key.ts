import { randomBytes } from "crypto";

export function generateServiceKey(): string {
  return randomBytes(32).toString("hex");
}
