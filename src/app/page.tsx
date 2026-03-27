"use client";

import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import {
  UtensilsCrossed,
  ArrowRight,
  CalendarDays,
  ShoppingCart,
  Sparkles,
} from "lucide-react";
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

const FEATURES = [
  { icon: CalendarDays, label: "Plan", desc: "Weekly dinners" },
  { icon: ShoppingCart, label: "Shop", desc: "Smart lists" },
  { icon: Sparkles, label: "Discover", desc: "AI recipes" },
];

export default function WelcomePage() {
  const { signIn } = useAuthActions();
  const { isAuthenticated, isLoading } = useConvexAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState("");

  if ((isAuthenticated && !isLoading) || isRedirecting) {
    if (!isRedirecting && typeof window !== "undefined") {
      window.location.href = "/pantry";
    }
    return (
      <div className="app-container min-h-screen flex items-center justify-center welcome-gradient">
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
      setIsRedirecting(true);
      window.location.href = "/pantry";
      return;
    } catch (err) {
      console.error("Auth failed:", err);
      const message = err instanceof Error ? err.message : String(err);
      const lower = message.toLowerCase();
      if (isSignUp) {
        if (lower.includes("already") || lower.includes("server error")) {
          setError("An account with this email may already exist. Try signing in instead.");
        } else {
          setError(`Could not create account: ${message}`);
        }
      } else {
        if (
          lower.includes("invalid") ||
          lower.includes("credentials") ||
          lower.includes("server error")
        ) {
          setError("Invalid email or password.");
        } else {
          setError("Could not sign in. Please try again.");
        }
      }
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="app-container min-h-screen flex items-center justify-center welcome-gradient">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="app-container min-h-screen flex flex-col items-center justify-center px-6 welcome-gradient">
      {/* Logo & branding */}
      <div className="flex flex-col items-center text-center mb-8 animate-fade-in-up">
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20">
            <UtensilsCrossed className="h-10 w-10 text-white" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-accent flex items-center justify-center shadow-md">
            <Sparkles className="h-3 w-3 text-white" />
          </div>
        </div>
        <h1 className="text-4xl font-bold tracking-tight mb-2">FamilyPlate</h1>
        <p className="text-muted-foreground text-base max-w-[280px] leading-relaxed">
          Smart dinner planning for your whole family. Less waste, more flavor.
        </p>
      </div>

      {/* Feature pills */}
      <div className="flex gap-3 mb-8 opacity-0 animate-fade-in" style={{ animationDelay: "0.2s" }}>
        {FEATURES.map((feature) => {
          const Icon = feature.icon;
          return (
            <div
              key={feature.label}
              className="flex flex-col items-center gap-1.5 rounded-2xl bg-card border px-4 py-3 shadow-sm"
            >
              <div className="h-8 w-8 rounded-xl bg-primary/8 flex items-center justify-center">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <span className="text-xs font-semibold">{feature.label}</span>
              <span className="text-[10px] text-muted-foreground">{feature.desc}</span>
            </div>
          );
        })}
      </div>

      {/* Auth card */}
      <Card className="w-full max-w-sm border-0 shadow-xl shadow-foreground/5 opacity-0 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
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
              <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-sm animate-scale-in">
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
                className="h-12 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="h-12 rounded-xl"
              />
            </div>
            <Button
              type="submit"
              className="w-full h-12 text-base rounded-xl gap-2"
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

      <p className="text-[11px] text-muted-foreground/50 mt-8 opacity-0 animate-fade-in" style={{ animationDelay: "0.5s" }}>
        FamilyPlate v0.1.0
      </p>
    </div>
  );
}
