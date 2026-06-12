import { getAuthUserId } from "@convex-dev/auth/server";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";

export async function getViewerProfile(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) return null;

  return await ctx.db
    .query("userProfiles")
    .withIndex("by_authId", (q) => q.eq("authId", userId as string))
    .first();
}

export function serializeAgentConnection(connection: Doc<"agentConnections">) {
  return {
    _id: connection._id,
    name: connection.name,
    scopes: connection.scopes,
    createdAt: connection.createdAt,
    expiresAt: connection.expiresAt ?? null,
    lastUsedAt: connection.lastUsedAt ?? null,
    revokedAt: connection.revokedAt ?? null,
  };
}

export async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value)
  );

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
