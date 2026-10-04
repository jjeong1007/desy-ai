import { createHash, randomBytes } from "node:crypto";

/** Personal access tokens for the MCP endpoint. Only the SHA-256 hash is stored. */

export const TOKEN_PREFIX = "desy_";

export function newToken(): string {
  return `${TOKEN_PREFIX}${randomBytes(32).toString("base64url")}`;
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Visible part shown in the token list, e.g. "desy_Ab3x…". */
export function tokenPrefix(token: string): string {
  return `${token.slice(0, TOKEN_PREFIX.length + 4)}…`;
}

export function looksLikeToken(value: string | undefined): value is string {
  return !!value && value.startsWith(TOKEN_PREFIX) && value.length > TOKEN_PREFIX.length + 20 && value.length < 200;
}
