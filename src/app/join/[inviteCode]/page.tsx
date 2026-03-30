"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { UtensilsCrossed, Users, ArrowRight, Loader2, CheckCircle2, XCircle } from "lucide-react";
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
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading invite...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 hero-bg">
      {/* Logo */}
      <div className="mb-8 flex items-center gap-2.5 animate-fade-in">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-sm">
          <UtensilsCrossed className="h-5 w-5 text-primary-foreground" />
        </div>
        <h1 className="text-xl font-bold tracking-tight">FamilyPlate</h1>
      </div>

      <Card className="w-full max-w-sm border-0 shadow-xl shadow-foreground/5 animate-fade-in-up">
        <CardContent className="flex flex-col items-center gap-5 p-8 text-center">
          {household === null ? (
            <>
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
                <XCircle className="h-8 w-8 text-destructive" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold tracking-tight">Invalid Invite</h2>
                <p className="text-sm text-muted-foreground">
                  This invite link is no longer valid or has expired.
                </p>
              </div>
              <Button variant="outline" onClick={() => router.push("/")} className="w-full rounded-xl gap-2">
                Go to Home
                <ArrowRight className="h-4 w-4" />
              </Button>
            </>
          ) : joined ? (
            <>
              <div className="relative">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                  <CheckCircle2 className="h-8 w-8 text-primary animate-check-bounce" />
                </div>
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold tracking-tight">Welcome!</h2>
                <p className="text-sm text-muted-foreground">
                  You&apos;ve joined <strong>{household.name}</strong>. Redirecting...
                </p>
              </div>
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-soft" style={{ animationDelay: `${i * 0.3}s` }} />
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold tracking-tight">
                  Join {household.name}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  You&apos;ve been invited to join this household on FamilyPlate.
                  Plan meals together, share a pantry, and build grocery lists as a family.
                </p>
                {household.memberCount > 0 && (
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />
                    {household.memberCount} member{household.memberCount !== 1 ? "s" : ""}
                  </div>
                )}
              </div>

              {error && (
                <div className="w-full rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive animate-scale-in">
                  {error}
                </div>
              )}

              {!isAuthenticated ? (
                <div className="w-full space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Sign in or create an account to join this household.
                  </p>
                  <Button onClick={() => router.push("/")} className="w-full gap-2 rounded-xl" size="lg">
                    Sign In
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={() => void handleJoin()}
                  disabled={isJoining}
                  className="w-full gap-2 rounded-xl"
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
