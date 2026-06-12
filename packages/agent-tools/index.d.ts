export type FamilyPlateAgentScope =
  | "read:profile"
  | "read:pantry"
  | "read:grocery"
  | "read:plan"
  | "read:recipes"
  | "write:grocery"
  | "write:pantry"
  | "write:plan"
  | "write:recipes";

export type FamilyPlateAgentTool = {
  name: string;
  description: string;
  scope: FamilyPlateAgentScope;
  kind: "query" | "mutation" | "action";
  requiresConfirmation?: boolean;
  inputSchema: Record<string, unknown>;
};

export const FAMILYPLATE_AGENT_SCOPES: FamilyPlateAgentScope[];
export const DEFAULT_AGENT_SCOPES: FamilyPlateAgentScope[];
export const FAMILYPLATE_AGENT_TOOLS: FamilyPlateAgentTool[];
export function getAgentTool(name: string): FamilyPlateAgentTool | null;
