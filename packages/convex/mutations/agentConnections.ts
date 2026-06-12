import {
  DEFAULT_AGENT_SCOPES,
  FAMILYPLATE_AGENT_SCOPES,
} from "@familyplate/agent-tools";
import { ConvexError, v } from "convex/values";
import { mutation } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import {
  getViewerProfile,
  serializeAgentConnection,
  sha256Hex,
} from "../lib/agentConnections";

function base64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function createToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `fp_agent_${base64Url(bytes)}`;
}

function normalizeScopes(scopes?: string[]) {
  const requestedScopes =
    scopes && scopes.length > 0 ? scopes : DEFAULT_AGENT_SCOPES;
  const allowedScopes = new Set(FAMILYPLATE_AGENT_SCOPES);
  const normalized = Array.from(
    new Set(requestedScopes.map((scope) => scope.trim()).filter(Boolean))
  );

  for (const scope of normalized) {
    if (!allowedScopes.has(scope as never)) {
      throw new ConvexError(`Unsupported agent scope: ${scope}`);
    }
  }

  return normalized;
}

const ALLOWED_EXPIRATION_MS = new Set([
  60 * 60 * 1000,
  24 * 60 * 60 * 1000,
  7 * 24 * 60 * 60 * 1000,
]);

function normalizeExpiresAt(expiresInMs: number | undefined, now: number) {
  if (expiresInMs === undefined) return undefined;
  if (!ALLOWED_EXPIRATION_MS.has(expiresInMs)) {
    throw new ConvexError("Unsupported agent token expiration.");
  }
  return now + expiresInMs;
}

export const createAgentConnection = mutation({
  args: {
    name: v.string(),
    scopes: v.optional(v.array(v.string())),
    expiresInMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const profile = await getViewerProfile(ctx);
    if (!profile) {
      throw new ConvexError("Must be signed in to create an agent connection.");
    }

    const name = args.name.trim() || "FamilyPlate agent";
    const scopes = normalizeScopes(args.scopes);
    const token = createToken();
    const tokenHash = await sha256Hex(token);
    const now = Date.now();
    const expiresAt = normalizeExpiresAt(args.expiresInMs, now);

    const connectionId = await ctx.db.insert("agentConnections", {
      householdId: profile.householdId,
      profileId: profile._id,
      name,
      tokenHash,
      scopes,
      createdAt: now,
      expiresAt,
    });

    const connection = await ctx.db.get(connectionId);
    if (!connection) {
      throw new ConvexError("Could not create agent connection.");
    }

    return {
      token,
      connection: serializeAgentConnection(connection),
    };
  },
});

export const revokeAgentConnection = mutation({
  args: {
    connectionId: v.id("agentConnections"),
  },
  handler: async (ctx, args) => {
    const profile = await getViewerProfile(ctx);
    if (!profile) {
      throw new ConvexError("Must be signed in to revoke an agent connection.");
    }

    const connection = await ctx.db.get(args.connectionId);
    if (!connection || connection.profileId !== profile._id) {
      throw new ConvexError("Agent connection not found.");
    }

    await ctx.db.patch(args.connectionId, { revokedAt: Date.now() });
    return args.connectionId;
  },
});
