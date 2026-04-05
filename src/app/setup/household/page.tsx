"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useConvexAuth, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Home, Users, ArrowRight, ArrowLeft, Copy, Check, UtensilsCrossed, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";

type Step = "choice" | "create" | "join" | "created";

export default function HouseholdSetupPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const currentUser = useQuery(
    api.queries.profiles.getCurrentUser,
    isAuthenticated ? {} : "skip"
  );
  const [step, setStep] = useState<Step>("choice");
  const [householdName, setHouseholdName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const createHousehold = useMutation(api.mutations.households.createHousehold);
  const joinHousehold = useMutation(api.mutations.households.joinHousehold);

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      window.location.replace("/");
      return;
    }

    if (currentUser === undefined) return;

    if (
      step === "choice" &&
      currentUser?.postAuthRedirectPath === "/plan"
    ) {
      window.location.replace("/plan");
    }
  }, [authLoading, currentUser, isAuthenticated, step]);

  if (authLoading || (isAuthenticated && currentUser === undefined)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!householdName) return;
    setIsLoading(true);
    setError("");
    try {
      const result = await createHousehold({ name: householdName });
      localStorage.setItem("fp_householdId", result.householdId);
      setGeneratedCode(result.inviteCode);
      setStep("created");
    } catch (err) {
      console.error("Create household failed:", err);
      setError(err instanceof Error ? err.message : "Failed to create household. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode) return;
    setIsLoading(true);
    setError("");
    try {
      const result = await joinHousehold({ inviteCode });
      localStorage.setItem("fp_householdId", result.householdId);
      router.push("/setup/profile");
    } catch (err) {
      console.error("Join household failed:", err);
      setError(err instanceof Error ? err.message : "Invalid invite code or failed to join.");
    } finally {
      setIsLoading(false);
    }
  };

  const copyCode = async () => {
    await navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (authLoading || (isAuthenticated && currentUser === undefined)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="app-container min-h-screen flex flex-col items-center px-6 py-8 bg-background">
      {/* Header */}
      <div className="flex items-center gap-2 mb-8 animate-fade-in">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-sm">
          <UtensilsCrossed className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="font-bold text-lg tracking-tight">FamilyPlate</span>
      </div>

      <div className="w-full max-w-sm flex-1 flex flex-col">
        {/* Progress stepper */}
        <div className="flex items-center gap-3 mb-8 animate-fade-in">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ${
                s === 1
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground"
              }`}>
                {s}
              </div>
              <span className={`text-xs font-medium hidden sm:inline ${s === 1 ? "text-foreground" : "text-muted-foreground"}`}>
                {s === 1 ? "Household" : s === 2 ? "Profile" : "Family"}
              </span>
              {s < 3 && <div className={`h-0.5 flex-1 rounded-full ${s === 1 && step !== "choice" ? "bg-primary/30" : "bg-muted"}`} />}
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm animate-scale-in">
            {error}
          </div>
        )}

        {step === "choice" && (
          <div className="space-y-4 animate-fade-in-up">
            <div className="text-center mb-6">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 mb-4">
                <Home className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight mb-2">Set Up Your Household</h1>
              <p className="text-sm text-muted-foreground">
                Create a new household or join an existing one.
              </p>
            </div>

            <Card
              className="cursor-pointer border-2 border-transparent hover:border-primary/30 transition-all duration-200 card-interactive"
              onClick={() => setStep("create")}
            >
              <CardContent className="flex items-center gap-4 p-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Home className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Create Household</h3>
                  <p className="text-sm text-muted-foreground">
                    Start fresh and invite your family
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground/40" />
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer border-2 border-transparent hover:border-accent/30 transition-all duration-200 card-interactive"
              onClick={() => setStep("join")}
            >
              <CardContent className="flex items-center gap-4 p-4">
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                  <Users className="h-5 w-5 text-accent" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Join Household</h3>
                  <p className="text-sm text-muted-foreground">
                    Got an invite code? Join your family
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground/40" />
              </CardContent>
            </Card>
          </div>
        )}

        {step === "create" && (
          <div className="animate-fade-in-up">
            <Card className="border-0 shadow-lg shadow-foreground/5">
              <CardHeader>
                <CardTitle className="text-lg">Name Your Household</CardTitle>
                <CardDescription>
                  Pick a name your family will recognize
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Household Name</Label>
                    <Input
                      id="name"
                      placeholder="The Thies Family"
                      value={householdName}
                      onChange={(e) => setHouseholdName(e.target.value)}
                      required
                      autoFocus
                      className="h-12 rounded-xl"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => { setStep("choice"); setError(""); }} className="flex-1 gap-2">
                      <ArrowLeft className="h-4 w-4" />
                      Back
                    </Button>
                    <Button type="submit" className="flex-1 gap-2" disabled={isLoading}>
                      {isLoading ? "Creating..." : "Create"}
                      {!isLoading && <ArrowRight className="h-4 w-4" />}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {step === "created" && (
          <div className="animate-fade-in-up">
            <Card className="border-0 shadow-lg shadow-foreground/5">
              <CardHeader className="text-center">
                <div className="relative inline-block mx-auto mb-3">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Check className="h-8 w-8 text-primary" />
                  </div>
                  <div className="absolute -top-1 -right-1 animate-check-bounce">
                    <Sparkles className="h-5 w-5 text-accent" />
                  </div>
                </div>
                <CardTitle className="text-lg">Household Created!</CardTitle>
                <CardDescription>
                  Share this code so your family can join
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <button
                  type="button"
                  onClick={copyCode}
                  className={`w-full flex items-center justify-center gap-3 p-4 rounded-xl border-2 border-dashed transition-all duration-200 ${
                    copied
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/30 hover:bg-muted/30"
                  }`}
                >
                  <code className="text-2xl font-mono font-bold tracking-[0.3em]">
                    {generatedCode}
                  </code>
                  {copied ? (
                    <Check className="h-5 w-5 text-primary shrink-0" />
                  ) : (
                    <Copy className="h-5 w-5 text-muted-foreground shrink-0" />
                  )}
                </button>
                <p className="text-xs text-muted-foreground text-center">
                  {copied ? "Copied to clipboard!" : "Tap to copy"}
                </p>
                <Button className="w-full gap-2 rounded-xl" size="lg" onClick={() => router.push("/setup/profile")}>
                  Continue to Profile
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {step === "join" && (
          <div className="animate-fade-in-up">
            <Card className="border-0 shadow-lg shadow-foreground/5">
              <CardHeader>
                <CardTitle className="text-lg">Join a Household</CardTitle>
                <CardDescription>
                  Enter the invite code from your family member
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleJoin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">Invite Code</Label>
                    <Input
                      id="code"
                      placeholder="ABC123"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                      maxLength={6}
                      autoFocus
                      className="h-14 text-center text-2xl font-mono tracking-[0.3em] rounded-xl"
                      required
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => { setStep("choice"); setError(""); }} className="flex-1 gap-2">
                      <ArrowLeft className="h-4 w-4" />
                      Back
                    </Button>
                    <Button type="submit" className="flex-1 gap-2" disabled={isLoading}>
                      {isLoading ? "Joining..." : "Join"}
                      {!isLoading && <ArrowRight className="h-4 w-4" />}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
