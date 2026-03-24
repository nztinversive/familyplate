"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { UtensilsCrossed, ArrowRight } from "lucide-react";
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

export default function WelcomePage() {
  const router = useRouter();
  const { signIn } = useAuthActions();
  const { isAuthenticated, isLoading } = useConvexAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState("");

  // If already authenticated or redirecting after sign-up, show spinner
  if ((isAuthenticated && !isLoading) || isRedirecting) {
    if (!isRedirecting && typeof window !== "undefined") {
      window.location.href = "/setup/household";
    }
    return (
      <div className="app-container min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsSubmitting(true);
    setError("");
    try {
      await signIn("password", {
        email,
        password,
        flow: isSignUp ? "signUp" : "signIn",
      });
      // Set redirecting state and do a full page nav to avoid SPA race conditions
      setIsRedirecting(true);
      window.location.href = "/setup/household";
      return; // Don't reset isSubmitting
    } catch (err) {
      console.error("Auth failed:", err);
      setError(
        isSignUp
          ? "Could not create account. Email may already be in use."
          : "Invalid email or password."
      );
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="app-container min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="app-container min-h-screen flex flex-col items-center justify-center px-6">
      {/* Hero */}
      <div className="flex flex-col items-center text-center mb-8">
        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
          <UtensilsCrossed className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">FamilyPlate</h1>
        <p className="text-muted-foreground text-base max-w-[280px]">
          Smart dinner planning for your whole family. Less waste, more flavor.
        </p>
      </div>

      {/* Features */}
      <div className="flex gap-3 mb-8">
        {["🍳 Plan", "🛒 Shop", "⭐ Rate"].map((feature) => (
          <div
            key={feature}
            className="bg-secondary rounded-full px-3 py-1.5 text-xs font-medium text-secondary-foreground"
          >
            {feature}
          </div>
        ))}
      </div>

      {/* Auth Card */}
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-lg">
            {isSignUp ? "Create Account" : "Welcome Back"}
          </CardTitle>
          <CardDescription>
            {isSignUp
              ? "Sign up to start planning meals"
              : "Sign in to your account"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="h-12"
              />
            </div>
            <Button
              type="submit"
              className="w-full h-12 text-base"
              size="lg"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  {isSignUp ? "Creating account..." : "Signing in..."}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  {isSignUp ? "Create Account" : "Sign In"}
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </form>
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError("");
            }}
            className="w-full text-center text-sm text-muted-foreground mt-4 hover:text-foreground transition-colors"
          >
            {isSignUp
              ? "Already have an account? Sign in"
              : "Don't have an account? Sign up"}
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
