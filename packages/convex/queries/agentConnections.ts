import { query } from "../_generated/server";
import {
  getViewerProfile,
  serializeAgentConnection,
} from "../lib/agentConnections";

export const listMyAgentConnections = query({
  args: {},
  handler: async (ctx) => {
    const profile = await getViewerProfile(ctx);
    if (!profile) return [];

    const connections = await ctx.db
      .query("agentConnections")
      .withIndex("by_householdId", (q) =>
        q.eq("householdId", profile.householdId)
      )
      .collect();

    return connections
      .filter((connection) => connection.profileId === profile._id)
      .sort((a, b) => b.createdAt - a.createdAt)
      .map(serializeAgentConnection);
  },
});
