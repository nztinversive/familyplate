"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useConvexAuth } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Home, Users, ArrowRight, Copy, Check } from "lucide-react";
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
  const [step, setStep] = useState<Step>("choice");
  const [householdName, setHouseholdName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const createHousehold = useMutation(
    api.mutations.households.createHousehold
  );
  const joinHousehold = useMutation(api.mutations.households.joinHousehold);

  // Redirect to login if not authenticated
  if (!authLoading && !isAuthenticated) {
    router.replace("/");
    return null;
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!householdName) return;
    setIsLoading(true);
    setError("");
    try {
      // Use a placeholder authId — the real identity comes from the server-side auth context
      // TODO: Update mutations to use ctx.auth.getUserIdentity() instead of client-passed authId
      const result = await createHousehold({
        name: householdName,
        authId: "authenticated-user",
        email: "",
        userName: "User",
      });
      localStorage.setItem("fp_householdId", result.householdId);
      setGeneratedCode(result.inviteCode);
      setStep("created");
    } catch (err) {
      console.error("Create household failed:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create household. Please try again."
      );
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
      const result = await joinHousehold({
        inviteCode,
        authId: "authenticated-user",
        email: "",
        userName: "User",
      });
      localStorage.setItem("fp_householdId", result.householdId);
      router.push("/setup/profile");
    } catch (err) {
      console.error("Join household failed:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Invalid invite code or failed to join."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const copyCode = async () => {
    await navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="app-container min-h-screen flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          <div className="h-1.5 rounded-full bg-primary flex-1" />
          <div className="h-1.5 rounded-full bg-muted flex-1" />
          <div className="h-1.5 rounded-full bg-muted flex-1" />
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}

        {step === "choice" && (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold mb-2">
                Set Up Your Household
              </h1>
              <p className="text-muted-foreground">
                Create a new household or join an existing one.
              </p>
            </div>

            <Card
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => setStep("create")}
            >
              <CardContent className="flex items-center gap-4 p-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Home className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Create Household</h3>
                  <p className="text-sm text-muted-foreground">
                    Start fresh and invite your family
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => setStep("join")}
            >
              <CardContent className="flex items-center gap-4 p-4">
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                  <Users className="h-6 w-6 text-accent" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Join Household</h3>
                  <p className="text-sm text-muted-foreground">
                    Got an invite code? Join your family
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          </div>
        )}

        {step === "create" && (
          <Card>
            <CardHeader>
              <CardTitle>Name Your Household</CardTitle>
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
                    className="h-12"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep("choice")}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={isLoading}
                  >
                    {isLoading ? "Creating..." : "Create"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {step === "created" && (
          <Card>
            <CardHeader className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                <Check className="h-8 w-8 text-primary" />
              </div>
              <CardTitle>Household Created!</CardTitle>
              <CardDescription>
                Share this code so your family can join
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <code className="flex-1 text-center text-2xl font-mono font-bold tracking-widest">
                  {generatedCode}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={copyCode}
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-primary" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <Button
                className="w-full"
                size="lg"
                onClick={() => router.push("/setup/profile")}
              >
                Continue to Profile
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}

        {step === "join" && (
          <Card>
            <CardHeader>
              <CardTitle>Join a Household</CardTitle>
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
                    onChange={(e) =>
                      setInviteCode(e.target.value.toUpperCase())
                    }
                    maxLength={6}
                    className="h-12 text-center text-xl font-mono tracking-widest"
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep("choice")}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={isLoading}
                  >
                    {isLoading ? "Joining..." : "Join"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
