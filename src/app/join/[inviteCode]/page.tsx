"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { UtensilsCrossed, Users, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function JoinHouseholdPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();

  const inviteCode = typeof params.inviteCode === "string" ? params.inviteCode : "";

  const household = useQuery(
    api.queries.households.getHouseholdByInviteCode,
    inviteCode ? { inviteCode } : "skip"
  );
  const joinHousehold = useMutation(api.mutations.households.joinHousehold);

  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);

  const handleJoin = async () => {
    setIsJoining(true);
    setError(null);
    try {
      await joinHousehold({ inviteCode });
      setJoined(true);
      setTimeout(() => router.push("/plan"), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to join household.");
    } finally {
      setIsJoining(false);
    }
  };

  if (authLoading || household === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-primary/5 to-background px-4">
      <div className="mb-8 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
          <UtensilsCrossed className="h-5 w-5 text-primary-foreground" />
        </div>
        <h1 className="text-xl font-bold tracking-tight">FamilyPlate</h1>
      </div>

      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-5 p-8 text-center">
          {household === null ? (
            <>
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
                <UtensilsCrossed className="h-8 w-8 text-destructive" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold">Invalid Invite</h2>
                <p className="text-sm text-muted-foreground">
                  This invite link is no longer valid or has expired.
                </p>
              </div>
              <Button variant="outline" onClick={() => router.push("/")} className="w-full">
                Go to Home
              </Button>
            </>
          ) : joined ? (
            <>
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold">Welcome!</h2>
                <p className="text-sm text-muted-foreground">
                  You&apos;ve joined <strong>{household.name}</strong>. Redirecting...
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold">
                  Join {household.name}
                </h2>
                <p className="text-sm text-muted-foreground">
                  You&apos;ve been invited to join this household on FamilyPlate.
                  Plan meals together, share a pantry, and build grocery lists as a family.
                </p>
                {household.memberCount > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {household.memberCount} member{household.memberCount !== 1 ? "s" : ""} already in this household
                  </p>
                )}
              </div>

              {error && (
                <div className="w-full rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              {!isAuthenticated ? (
                <div className="w-full space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Sign in or create an account to join this household.
                  </p>
                  <Button onClick={() => router.push("/")} className="w-full gap-2">
                    Sign In
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={() => void handleJoin()}
                  disabled={isJoining}
                  className="w-full gap-2"
                  size="lg"
                >
                  {isJoining ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRight className="h-4 w-4" />
                  )}
                  {isJoining ? "Joining..." : "Join Household"}
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
